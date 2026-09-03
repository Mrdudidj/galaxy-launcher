import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ServerConfig, ServerProperties } from "../../../shared/server.js";
import { getServerConfigPath, getServerRoot } from "./serverPaths.js";

const DEFAULT_PROPERTIES: ServerProperties = {
  motd: "Ein Galaxy-Launcher-Server",
  difficulty: "normal",
  gamemode: "survival",
  maxPlayers: 10,
  pvp: true,
  whitelist: false,
  onlineMode: true,
  port: 25565
};

export async function getServer(): Promise<ServerConfig | null> {
  try {
    const raw = await readFile(getServerConfigPath(), "utf-8");
    return JSON.parse(raw) as ServerConfig;
  } catch {
    return null;
  }
}

async function writeServer(config: ServerConfig): Promise<void> {
  await mkdir(dirname(getServerConfigPath()), { recursive: true });
  await writeFile(getServerConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}

// One server total, matching "jeder Spieler kann 1 Server gratis aufmachen" —
// not a multi-server manager. Creating again after deleting starts fresh.
export async function createServer(name: string, minecraftVersion: string): Promise<ServerConfig> {
  const existing = await getServer();
  if (existing) {
    throw new Error("Es existiert bereits ein Server. Lösche ihn zuerst, um einen neuen zu erstellen.");
  }
  const config: ServerConfig = {
    name,
    minecraftVersion,
    createdAt: new Date().toISOString(),
    eulaAccepted: false,
    jarReady: false,
    properties: DEFAULT_PROPERTIES
  };
  await writeServer(config);
  return config;
}

export async function acceptServerEula(): Promise<ServerConfig> {
  const config = await getServer();
  if (!config) throw new Error("Kein Server vorhanden.");
  config.eulaAccepted = true;
  await writeServer(config);
  return config;
}

export async function markServerJarReady(): Promise<ServerConfig> {
  const config = await getServer();
  if (!config) throw new Error("Kein Server vorhanden.");
  config.jarReady = true;
  await writeServer(config);
  return config;
}

// Called when a start attempt fails in a way that looks like a bad jar file
// (see serverProcess.ts) — some Minecraft versions are actively-updated
// pre-releases where the official download can change after it's already
// been fetched once, so a locally-cached jar can go stale. Resetting this
// routes the UI back to the download step instead of leaving the user stuck
// on a cryptic Java error with no obvious next step.
export async function markServerJarUnready(): Promise<ServerConfig> {
  const config = await getServer();
  if (!config) throw new Error("Kein Server vorhanden.");
  config.jarReady = false;
  await writeServer(config);
  return config;
}

export async function updateServerProperties(patch: Partial<ServerProperties>): Promise<ServerConfig> {
  const config = await getServer();
  if (!config) throw new Error("Kein Server vorhanden.");
  config.properties = { ...config.properties, ...patch };
  await writeServer(config);
  return config;
}

// Genuinely destructive — removes the world, the server jar, everything.
// The renderer confirms with the user before ever calling this (same
// "irreversible action needs confirmation" rule as everywhere else in the
// app), so this itself does not ask again.
export async function deleteServer(): Promise<void> {
  await rm(getServerRoot(), { recursive: true, force: true });
}
