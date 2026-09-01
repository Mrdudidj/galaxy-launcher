import { app } from "electron";
import { config } from "dotenv";
import { join } from "node:path";

// Loaded lazily (not at module-import time) so it never depends on import
// order relative to other main-process modules — app.getAppPath() is only
// reliably meaningful once called, not necessarily at module-evaluation time.
let loaded = false;

function ensureEnvLoaded(): void {
  if (loaded) return;
  config({ path: join(app.getAppPath(), ".env") });
  loaded = true;
}

export function getMsaClientId(): string | null {
  ensureEnvLoaded();
  return process.env["MSA_CLIENT_ID"] || null;
}

export function getDiscordClientId(): string | null {
  ensureEnvLoaded();
  return process.env["DISCORD_CLIENT_ID"] || null;
}
