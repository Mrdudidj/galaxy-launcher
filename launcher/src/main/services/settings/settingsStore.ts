import { app } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppSettings } from "../../../shared/instance.js";

const DEFAULT_SETTINGS: AppSettings = {
  defaultMods: [],
  discordRpc: { enabled: false },
  spotify: {
    widgetVisible: false,
    pinHotkey: "Control+Shift+M",
    widgetBounds: null,
    pinned: false,
    controlKey: "B",
    pressActions: { single: "playPause", double: "next", triple: "previous" },
    launchCommand: "spotify"
  }
};

function settingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // Merged one level deep (not a plain spread) so a settings.json saved
    // before a nested field was added — e.g. Spotify's controlKey/pressActions
    // — still picks up the new default instead of losing it to `undefined`.
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      discordRpc: { ...DEFAULT_SETTINGS.discordRpc, ...parsed.discordRpc },
      spotify: { ...DEFAULT_SETTINGS.spotify, ...parsed.spotify }
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(settings: AppSettings): Promise<void> {
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), "utf-8");
}

export async function addDefaultMod(filePath: string): Promise<AppSettings> {
  const settings = await getSettings();
  if (!settings.defaultMods.includes(filePath)) {
    settings.defaultMods.push(filePath);
    await writeSettings(settings);
  }
  return settings;
}

export async function removeDefaultMod(filePath: string): Promise<AppSettings> {
  const settings = await getSettings();
  settings.defaultMods = settings.defaultMods.filter((p) => p !== filePath);
  await writeSettings(settings);
  return settings;
}

export async function updateDiscordRpcSettings(patch: Partial<AppSettings["discordRpc"]>): Promise<AppSettings> {
  const settings = await getSettings();
  settings.discordRpc = { ...settings.discordRpc, ...patch };
  await writeSettings(settings);
  return settings;
}

export async function updateSpotifySettings(patch: Partial<AppSettings["spotify"]>): Promise<AppSettings> {
  const settings = await getSettings();
  settings.spotify = { ...settings.spotify, ...patch };
  await writeSettings(settings);
  return settings;
}
