import { app } from "electron";
import { join } from "node:path";

// A single, local, free-to-host server per install — same "no backend
// needed" philosophy as the rest of this app: this is your own machine
// acting as the server, not a paid cloud slot.
export function getServerRoot(): string {
  return join(app.getPath("userData"), "server");
}

export function getServerGameDir(): string {
  return join(getServerRoot(), "world-data");
}

export function getServerJarPath(): string {
  return join(getServerGameDir(), "server.jar");
}

export function getServerConfigPath(): string {
  return join(getServerRoot(), "server-config.json");
}

export function getServerPropertiesPath(): string {
  return join(getServerGameDir(), "server.properties");
}

export function getServerEulaPath(): string {
  return join(getServerGameDir(), "eula.txt");
}
