import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import type { ServerNetworkInfo } from "../../../shared/server.js";
import { ensureJava } from "../minecraft/javaRuntime.js";
import { getServer, markServerJarUnready } from "./serverStore.js";
import { getServerJavaRequirement } from "./serverJar.js";
import { getServerEulaPath, getServerGameDir, getServerJarPath } from "./serverPaths.js";
import { writeServerProperties } from "./serverProperties.js";

export interface ServerHandlers {
  onLog: (line: string, stream: "stdout" | "stderr") => void;
  onExit: (info: { code: number | null; crashed: boolean }) => void;
}

let activeServerProcess: ChildProcess | null = null;

export function isServerRunning(): boolean {
  return activeServerProcess !== null;
}

// A real Minecraft server saves the world and shuts down cleanly on the
// "stop" console command — killing the process outright (like the client's
// killActiveGame does) risks world corruption, so this is deliberately a
// different, gentler path.
export function stopServer(): void {
  if (activeServerProcess?.stdin?.writable) {
    activeServerProcess.stdin.write("stop\n");
  }
}

export function killServer(): void {
  activeServerProcess?.kill();
}

export async function startServer(handlers: ServerHandlers, onJavaProgress?: (downloaded: number, total: number) => void): Promise<void> {
  if (activeServerProcess) {
    throw new Error("Der Server läuft bereits.");
  }

  const config = await getServer();
  if (!config) throw new Error("Kein Server vorhanden.");
  if (!config.eulaAccepted) throw new Error("Die Minecraft-EULA wurde noch nicht akzeptiert.");
  if (!config.jarReady) throw new Error("Der Server wurde noch nicht heruntergeladen.");

  await mkdir(getServerGameDir(), { recursive: true });
  await writeFile(getServerEulaPath(), "eula=true\n", "utf-8");
  await writeServerProperties(config.properties);

  const { component, majorVersion } = await getServerJavaRequirement(config.minecraftVersion);
  const javaPath = await ensureJava(component, majorVersion, onJavaProgress);

  const child = spawn(javaPath, ["-Xmx2G", "-jar", getServerJarPath(), "--nogui"], {
    cwd: getServerGameDir(),
    stdio: ["pipe", "pipe", "pipe"]
  });

  activeServerProcess = child;
  let sawBadJarError = false;
  function checkForBadJar(text: string): void {
    if (/Invalid or corrupt jarfile|Error: Unable to access jarfile/i.test(text)) sawBadJarError = true;
  }
  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    checkForBadJar(text);
    handlers.onLog(text, "stdout");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    checkForBadJar(text);
    handlers.onLog(text, "stderr");
  });

  child.on("exit", (code) => {
    activeServerProcess = null;
    if (sawBadJarError) {
      // Self-heal: a stale/invalid jar shouldn't leave the user stuck on a
      // cryptic Java error forever — delete it and route back to the
      // download step next time they open the Server screen.
      void rm(getServerJarPath(), { force: true });
      void markServerJarUnready();
      handlers.onLog("Die Server-Datei war beschädigt oder veraltet — bitte lade sie erneut herunter.", "stderr");
    }
    handlers.onExit({ code, crashed: code !== null && code !== 0 });
  });

  child.on("error", (error) => {
    activeServerProcess = null;
    handlers.onLog(`Server konnte nicht gestartet werden: ${error.message}`, "stderr");
    handlers.onExit({ code: null, crashed: true });
  });
}

// Purely informational, for the "wie treten Freunde bei?" panel — this app
// has no way to configure port-forwarding on the user's router itself, so
// it only ever shows the local address and explains what's needed for
// anyone outside the same network.
export function getServerNetworkInfo(port: number): ServerNetworkInfo {
  const addresses: string[] = [];
  for (const iface of Object.values(networkInterfaces())) {
    for (const info of iface ?? []) {
      if (info.family === "IPv4" && !info.internal) addresses.push(info.address);
    }
  }
  return { localAddresses: addresses, port };
}
