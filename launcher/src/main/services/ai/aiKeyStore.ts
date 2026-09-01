import { app, safeStorage } from "electron";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

// The user's own AI API key is a real secret (same category as the MSA refresh
// token), so it's OS-keychain-encrypted via safeStorage rather than sitting in
// plaintext settings.json.
function keyPath(): string {
  return join(app.getPath("userData"), "ai-key.enc");
}

export async function getAiKey(): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = await readFile(keyPath());
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

export async function hasAiKey(): Promise<boolean> {
  return (await getAiKey()) !== null;
}

export async function setAiKey(key: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Sichere Speicherung ist auf diesem System nicht verfügbar.");
  }
  await writeFile(keyPath(), safeStorage.encryptString(key));
}

export async function clearAiKey(): Promise<void> {
  await rm(keyPath(), { force: true });
}
