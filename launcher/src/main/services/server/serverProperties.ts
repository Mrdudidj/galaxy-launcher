import { readFile, writeFile } from "node:fs/promises";
import type { ServerProperties } from "../../../shared/server.js";
import { getServerPropertiesPath } from "./serverPaths.js";

// Only the keys this app's UI actually exposes — everything else a user (or
// a later vanilla server run) adds to the real file is preserved verbatim,
// since server.properties has dozens of settings this app doesn't need to
// know about.
const MANAGED_KEYS: Record<keyof ServerProperties, string> = {
  motd: "motd",
  difficulty: "difficulty",
  gamemode: "gamemode",
  maxPlayers: "max-players",
  pvp: "pvp",
  whitelist: "white-list",
  onlineMode: "online-mode",
  port: "server-port"
};

function toPropertyValue(value: string | number | boolean): string {
  return String(value);
}

// Writes/merges the managed keys into the real server.properties file,
// preserving every other line (comments, unmanaged settings) exactly as-is —
// a plain overwrite would silently discard anything the vanilla server
// itself adds on first run (level-seed, resource-pack, ...).
export async function writeServerProperties(properties: ServerProperties): Promise<void> {
  let existingLines: string[] = [];
  try {
    existingLines = (await readFile(getServerPropertiesPath(), "utf-8")).split("\n");
  } catch {
    existingLines = [];
  }

  const managedByPropertyKey = new Map<string, string>(
    (Object.keys(MANAGED_KEYS) as (keyof ServerProperties)[]).map((key) => [
      MANAGED_KEYS[key],
      toPropertyValue(properties[key])
    ])
  );

  const seen = new Set<string>();
  const mergedLines = existingLines.map((line) => {
    const eq = line.indexOf("=");
    if (eq === -1 || line.trimStart().startsWith("#")) return line;
    const key = line.slice(0, eq).trim();
    if (managedByPropertyKey.has(key)) {
      seen.add(key);
      return `${key}=${managedByPropertyKey.get(key)}`;
    }
    return line;
  });

  for (const [key, value] of managedByPropertyKey) {
    if (!seen.has(key)) mergedLines.push(`${key}=${value}`);
  }

  await writeFile(getServerPropertiesPath(), mergedLines.filter((l) => l.length > 0).join("\n") + "\n", "utf-8");
}
