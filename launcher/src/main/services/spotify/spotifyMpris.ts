import { sessionBus, Variant } from "dbus-next";
import type { MessageBus, ClientInterface } from "dbus-next";
import { spawn } from "node:child_process";
import type { SpotifyPlaybackState } from "../../../shared/spotify.js";

// MPRIS (https://specifications.freedesktop.org/mpris-spec/latest/) — the
// same D-Bus mechanism hardware/OS media keys use, exposed by Spotify's own
// Linux desktop client regardless of subscription tier. This is local IPC to
// an already-running app, not a request to Spotify's servers, so none of the
// Web API's Premium-only restrictions apply here.
const SERVICE_NAME = "org.mpris.MediaPlayer2.spotify";
const OBJECT_PATH = "/org/mpris/MediaPlayer2";
const PLAYER_IFACE = "org.mpris.MediaPlayer2.Player";
const PROPERTIES_IFACE = "org.freedesktop.DBus.Properties";
const LAUNCH_POLL_MS = 500;
const LAUNCH_TIMEOUT_MS = 10_000;

// The bus connection itself is cheap to keep open and reused; the per-call
// proxy/interface below is re-fetched every time instead of cached, since a
// cached reference could go stale across a Spotify restart and a fresh
// getProxyObject() call is negligible next to this widget's own poll cadence.
let bus: MessageBus | null = null;

function getBus(): MessageBus {
  if (!bus) bus = sessionBus();
  return bus;
}

interface PlayerInterfaces {
  player: ClientInterface;
  properties: ClientInterface;
}

async function getPlayerInterfaces(): Promise<PlayerInterfaces | null> {
  try {
    const obj = await getBus().getProxyObject(SERVICE_NAME, OBJECT_PATH);
    return {
      player: obj.getInterface(PLAYER_IFACE),
      properties: obj.getInterface(PROPERTIES_IFACE)
    };
  } catch {
    // Not an error — this is the normal "Spotify isn't running" state.
    return null;
  }
}

function unwrap<T>(variant: Variant<T> | undefined): T | undefined {
  return variant?.value;
}

export async function getPlaybackState(): Promise<SpotifyPlaybackState> {
  const ifaces = await getPlayerInterfaces();
  if (!ifaces) return { running: false };

  const all = (await ifaces.properties.GetAll(PLAYER_IFACE)) as Record<string, Variant>;
  const status = unwrap<string>(all["PlaybackStatus"]);
  const metadata = unwrap<Record<string, Variant>>(all["Metadata"]);
  const volume = unwrap<number>(all["Volume"]);
  const artists = metadata ? unwrap<string[]>(metadata["xesam:artist"]) : undefined;

  return {
    running: true,
    isPlaying: status === "Playing",
    trackName: (metadata && unwrap<string>(metadata["xesam:title"])) || "",
    artistNames: artists?.join(", ") ?? "",
    albumArtUrl: (metadata && unwrap<string>(metadata["mpris:artUrl"])) || null,
    volume: volume ?? null
  };
}

export async function playPause(): Promise<void> {
  const ifaces = await getPlayerInterfaces();
  await ifaces?.player.PlayPause();
}

export async function next(): Promise<void> {
  const ifaces = await getPlayerInterfaces();
  await ifaces?.player.Next();
}

export async function previous(): Promise<void> {
  const ifaces = await getPlayerInterfaces();
  await ifaces?.player.Previous();
}

export async function adjustVolume(delta: number): Promise<void> {
  const ifaces = await getPlayerInterfaces();
  if (!ifaces) return;
  const current = unwrap<number>(await ifaces.properties.Get(PLAYER_IFACE, "Volume"));
  const next = Math.min(1, Math.max(0, (current ?? 1) + delta));
  await ifaces.properties.Set(PLAYER_IFACE, "Volume", new Variant("d", next));
}

async function waitForSpotifyOnBus(timeoutMs: number): Promise<PlayerInterfaces | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ifaces = await getPlayerInterfaces();
    if (ifaces) return ifaces;
    await new Promise((resolve) => setTimeout(resolve, LAUNCH_POLL_MS));
  }
  return null;
}

// "Press play -> Spotify opens and lands on the right song." launchCommand is
// Settings-configurable (default "spotify") since the exact binary/launcher
// name varies by install method (native package, Flatpak, Snap) and this
// couldn't be verified against a real local Spotify install from here.
export async function playUri(uri: string, launchCommand: string): Promise<void> {
  let ifaces = await getPlayerInterfaces();
  if (!ifaces) {
    spawn(launchCommand, [], { detached: true, stdio: "ignore" }).unref();
    ifaces = await waitForSpotifyOnBus(LAUNCH_TIMEOUT_MS);
    if (!ifaces) {
      throw new Error("Spotify wurde gestartet, hat sich aber nicht rechtzeitig gemeldet.");
    }
  }
  await ifaces.player.OpenUri(uri);
}
