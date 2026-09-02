import { shell } from "electron";
import type { SpotifyPlaybackState } from "../../../shared/spotify.js";
import * as linux from "./spotifyMpris.js";
import * as windows from "./spotifyWindowsHelper.js";

// One seam so main/ipc/index.ts and everything downstream never needs to
// know which OS-native mechanism is behind a given call — MPRIS/D-Bus on
// Linux, GalaxyMediaHelper.exe (SMTC + Core Audio) on Windows. Any other
// platform (macOS — not asked for) degrades to a quiet no-op instead of
// crashing.
const platform = process.platform;

export async function getPlaybackState(): Promise<SpotifyPlaybackState> {
  if (platform === "linux") return linux.getPlaybackState();
  if (platform === "win32") return windows.getPlaybackState();
  return { running: false };
}

export async function playPause(): Promise<void> {
  if (platform === "linux") return linux.playPause();
  if (platform === "win32") return windows.playPause();
}

export async function next(): Promise<void> {
  if (platform === "linux") return linux.next();
  if (platform === "win32") return windows.next();
}

export async function previous(): Promise<void> {
  if (platform === "linux") return linux.previous();
  if (platform === "win32") return windows.previous();
}

export async function adjustVolume(delta: number): Promise<void> {
  if (platform === "linux") return linux.adjustVolume(delta);
  if (platform === "win32") return windows.adjustVolume(delta);
}

// Windows' Spotify client, like Linux's, is registered as the spotify: URI
// handler — shell.openExternal both launches it (if needed) and hands it the
// URI to play, no polling required. Linux keeps its own already-working
// spawn+poll+MPRIS.OpenUri path (spotifyMpris.ts) rather than switching to
// the same idea unverified.
export async function playUri(uri: string, launchCommand: string): Promise<void> {
  if (platform === "linux") return linux.playUri(uri, launchCommand);
  if (platform === "win32") {
    await shell.openExternal(uri);
    return;
  }
}
