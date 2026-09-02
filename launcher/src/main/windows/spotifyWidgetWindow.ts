import { BrowserWindow, globalShortcut, screen } from "electron";
import { join } from "node:path";
import { getSettings, updateSpotifySettings } from "../services/settings/settingsStore.js";
import { adjustVolume, next, playPause, previous } from "../services/spotify/spotifyMpris.js";
import type { SpotifyControlAction } from "../../shared/spotify.js";

const NORMAL_SIZE = { width: 320, height: 260 };
const PINNED_SIZE = { width: 170, height: 64 };
// How long to wait after the first press for further presses before acting
// on the final count — matches the "2x B = stop, 1x/3x = something else"
// mechanic described: one physical key, press-count picks the action.
const PRESS_WINDOW_MS = 450;

let widgetWindow: BrowserWindow | null = null;
let registeredHotkey: string | null = null;
let registeredControlKey: string | null = null;
let pressCount = 0;
let pressTimer: NodeJS.Timeout | null = null;

function defaultBounds(): { x: number; y: number; width: number; height: number } {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  return { x: screenWidth - NORMAL_SIZE.width - 24, y: screenHeight - NORMAL_SIZE.height - 24, ...NORMAL_SIZE };
}

function createWidgetWindow(bounds: { x: number; y: number; width: number; height: number }): BrowserWindow {
  const win = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Same dev-server-vs-built-file split as the main window, just with a query
  // string so the renderer's root can tell "I'm the widget" apart from the
  // normal app shell without a second Vite entry point.
  if (process.env["ELECTRON_RENDERER_URL"]) {
    void win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}?widget=spotify`);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"), { search: "widget=spotify" });
  }

  win.on("moved", () => void persistBounds(win));
  win.on("resized", () => void persistBounds(win));

  return win;
}

async function persistBounds(win: BrowserWindow): Promise<void> {
  const settings = await getSettings();
  if (settings.spotify.pinned) return; // don't overwrite the "normal" bounds while shrunk
  await updateSpotifySettings({ widgetBounds: win.getBounds() });
}

export async function showSpotifyWidget(): Promise<void> {
  const settings = await getSettings();
  const bounds = settings.spotify.widgetBounds ?? defaultBounds();

  if (!widgetWindow || widgetWindow.isDestroyed()) {
    widgetWindow = createWidgetWindow(bounds);
  }
  if (settings.spotify.pinned) {
    widgetWindow.setBounds({ ...bounds, ...PINNED_SIZE });
    widgetWindow.setIgnoreMouseEvents(true, { forward: true });
  }
  widgetWindow.show();
  await updateSpotifySettings({ widgetVisible: true });
}

export async function hideSpotifyWidget(): Promise<void> {
  widgetWindow?.hide();
  await updateSpotifySettings({ widgetVisible: false });
}

// Click-through while pinned means the widget can't host its own unpin
// button — this is the only way back, alongside the same toggle exposed in
// Settings as a fallback if the hotkey is ever unavailable.
export async function toggleSpotifyWidgetPin(): Promise<void> {
  if (!widgetWindow || widgetWindow.isDestroyed()) return;
  const settings = await getSettings();
  const nowPinned = !settings.spotify.pinned;

  if (nowPinned) {
    const current = widgetWindow.getBounds();
    await updateSpotifySettings({ pinned: true, widgetBounds: { ...current, ...NORMAL_SIZE } });
    widgetWindow.setBounds({ x: current.x, y: current.y, ...PINNED_SIZE });
    widgetWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    const restored = settings.spotify.widgetBounds ?? defaultBounds();
    await updateSpotifySettings({ pinned: false });
    widgetWindow.setIgnoreMouseEvents(false);
    widgetWindow.setBounds({ x: restored.x, y: restored.y, ...NORMAL_SIZE });
  }
}

export function registerPinHotkey(accelerator: string): boolean {
  if (registeredHotkey) {
    globalShortcut.unregister(registeredHotkey);
    registeredHotkey = null;
  }
  const ok = globalShortcut.register(accelerator, () => void toggleSpotifyWidgetPin());
  if (ok) registeredHotkey = accelerator;
  return ok;
}

export function unregisterPinHotkey(): void {
  if (registeredHotkey) {
    globalShortcut.unregister(registeredHotkey);
    registeredHotkey = null;
  }
}

async function runControlAction(action: SpotifyControlAction): Promise<void> {
  switch (action) {
    case "playPause":
      return playPause();
    case "next":
      return next();
    case "previous":
      return previous();
    case "volumeUp":
      return adjustVolume(0.1);
    case "volumeDown":
      return adjustVolume(-0.1);
    case "none":
      return;
  }
}

function handleControlKeyPress(): void {
  pressCount += 1;
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    void (async () => {
      const finalCount = pressCount;
      pressCount = 0;
      pressTimer = null;
      const { pressActions } = (await getSettings()).spotify;
      if (finalCount === 1) await runControlAction(pressActions.single);
      else if (finalCount === 2) await runControlAction(pressActions.double);
      else if (finalCount >= 3) await runControlAction(pressActions.triple);
    })();
  }, PRESS_WINDOW_MS);
}

export function registerControlHotkey(accelerator: string): boolean {
  if (registeredControlKey) {
    globalShortcut.unregister(registeredControlKey);
    registeredControlKey = null;
  }
  const ok = globalShortcut.register(accelerator, handleControlKeyPress);
  if (ok) registeredControlKey = accelerator;
  return ok;
}

export function unregisterControlHotkey(): void {
  if (registeredControlKey) {
    globalShortcut.unregister(registeredControlKey);
    registeredControlKey = null;
  }
}

// Called once at app startup — restores the widget/hotkeys to whatever state
// Settings last had, rather than always starting hidden/unregistered.
export async function initSpotifyWidget(): Promise<void> {
  const settings = await getSettings();
  registerPinHotkey(settings.spotify.pinHotkey);
  registerControlHotkey(settings.spotify.controlKey);
  if (settings.spotify.widgetVisible) {
    await showSpotifyWidget();
  }
}
