import type { ICachePlugin } from "@azure/msal-node";
import { app, safeStorage } from "electron";
import { readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

function cachePath(): string {
  return join(app.getPath("userData"), "msal-cache.enc");
}

async function readCache(): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = await readFile(cachePath());
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

async function writeCache(data: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) return;
  await writeFile(cachePath(), safeStorage.encryptString(data));
}

export async function clearMsalCache(): Promise<void> {
  await rm(cachePath(), { force: true });
}

// The MSAL token cache holds the refresh token that enables silent re-login —
// exactly as sensitive as the AI API key, so it gets the same OS-keychain
// encryption rather than living in a plain JSON file.
export const msalCachePlugin: ICachePlugin = {
  beforeCacheAccess: async (context) => {
    const data = await readCache();
    if (data) context.tokenCache.deserialize(data);
  },
  afterCacheAccess: async (context) => {
    if (context.hasChanged) {
      await writeCache(context.tokenCache.serialize());
    }
  }
};
