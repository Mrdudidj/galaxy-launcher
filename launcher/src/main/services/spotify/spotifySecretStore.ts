import { app, safeStorage } from "electron";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

// A Client Secret is a real credential even in this app's "bring your own
// Spotify Developer app" model (same category as the AI key), unlike the
// Client ID which stays in plain .env alongside MSA/Discord's — so it's
// OS-keychain-encrypted via safeStorage instead of sitting in settings.json.
function secretPath(): string {
  return join(app.getPath("userData"), "spotify-secret.enc");
}

export async function getSpotifyClientSecret(): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = await readFile(secretPath());
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

export async function hasSpotifyClientSecret(): Promise<boolean> {
  return (await getSpotifyClientSecret()) !== null;
}

export async function setSpotifyClientSecret(secret: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Sichere Speicherung ist auf diesem System nicht verfügbar.");
  }
  await writeFile(secretPath(), safeStorage.encryptString(secret));
}

export async function clearSpotifyClientSecret(): Promise<void> {
  await rm(secretPath(), { force: true });
}
