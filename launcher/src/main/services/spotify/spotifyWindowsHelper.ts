import { spawn } from "node:child_process";
import { app } from "electron";
import { join } from "node:path";
import type { SpotifyPlaybackState } from "../../../shared/spotify.js";

function helperPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "windows-helper", "GalaxyMediaHelper.exe");
  }
  // Best-effort only — dev-mode testing on Windows isn't possible from where
  // this was written, so this is an educated guess at dotnet publish's
  // default output location for the sibling windows-helper/ project, not a
  // verified path.
  return join(
    app.getAppPath(),
    "..",
    "windows-helper",
    "bin",
    "Release",
    "net8.0-windows10.0.19041.0",
    "win-x64",
    "publish",
    "GalaxyMediaHelper.exe"
  );
}

function runHelper(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(helperPath(), args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `GalaxyMediaHelper exited with code ${code}`));
    });
  });
}

export async function getPlaybackState(): Promise<SpotifyPlaybackState> {
  try {
    const output = await runHelper(["now-playing"]);
    return JSON.parse(output) as SpotifyPlaybackState;
  } catch {
    return { running: false };
  }
}

// Control commands mirror spotifyMpris.ts's treatment of "not running" — a
// normal no-op, not an error the caller needs to handle.
export async function playPause(): Promise<void> {
  await runHelper(["play-pause"]).catch(() => undefined);
}

export async function next(): Promise<void> {
  await runHelper(["next"]).catch(() => undefined);
}

export async function previous(): Promise<void> {
  await runHelper(["previous"]).catch(() => undefined);
}

export async function adjustVolume(delta: number): Promise<void> {
  await runHelper(["volume", delta >= 0 ? "up" : "down"]).catch(() => undefined);
}
