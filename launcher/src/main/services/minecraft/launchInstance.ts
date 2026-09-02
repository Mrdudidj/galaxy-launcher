import { launch, Version } from "@xmcl/core";
import type { ChildProcess } from "node:child_process";
import { getCurrentSession } from "../auth/microsoftAuth.js";
import { exportCosmeticsConfig } from "../economy/cosmeticsExport.js";
import { ensureCompanionMod } from "../instances/companionMod.js";
import { getInstanceGameDir, getSharedDir } from "../instances/instancePaths.js";
import { readInstance, updateInstance } from "../instances/instanceStore.js";
import { ensureJava } from "./javaRuntime.js";

export interface LaunchHandlers {
  onLog: (line: string, stream: "stdout" | "stderr") => void;
  onJavaProgress: (downloaded: number, total: number) => void;
  onExit: (info: { code: number | null; crashed: boolean }) => void;
}

let activeProcess: ChildProcess | null = null;

export function isGameRunning(): boolean {
  return activeProcess !== null;
}

export function killActiveGame(): void {
  activeProcess?.kill();
}

export async function launchInstance(instanceId: string, handlers: LaunchHandlers): Promise<void> {
  if (activeProcess) {
    throw new Error("Es läuft bereits eine Instanz. Beende sie zuerst.");
  }

  const session = getCurrentSession();
  if (!session) {
    throw new Error("Keine aktive Minecraft-Anmeldung. Bitte melde dich mit deinem Microsoft-Konto an.");
  }

  const instance = await readInstance(instanceId);
  if (!instance.resolvedVersionId) {
    throw new Error("Diese Instanz wurde noch nicht heruntergeladen.");
  }

  if (instance.modLoader.type === "fabric") {
    await ensureCompanionMod(instanceId);
    await exportCosmeticsConfig(instanceId);
  }

  const resourcePath = getSharedDir();
  const resolvedVersion = await Version.parse(resourcePath, instance.resolvedVersionId);

  const javaPath =
    instance.javaRuntime.customPath ??
    (await ensureJava(
      resolvedVersion.javaVersion?.component ?? "jre-legacy",
      resolvedVersion.javaVersion?.majorVersion ?? 8,
      handlers.onJavaProgress
    ));

  const child = await launch({
    gamePath: getInstanceGameDir(instanceId),
    resourcePath,
    javaPath,
    version: resolvedVersion,
    gameProfile: { name: session.minecraftUsername, id: session.minecraftUuid },
    accessToken: session.minecraftAccessToken,
    userType: "mojang",
    minMemory: instance.memory.minMb,
    maxMemory: instance.memory.maxMb,
    resolution: instance.resolution,
    extraJVMArgs: instance.extraJvmArgs.length > 0 ? instance.extraJvmArgs : undefined,
    launcherName: "Galaxy Launcher",
    launcherBrand: "galaxy"
  });

  activeProcess = child;
  child.stdout?.on("data", (chunk: Buffer) => handlers.onLog(chunk.toString(), "stdout"));
  child.stderr?.on("data", (chunk: Buffer) => handlers.onLog(chunk.toString(), "stderr"));

  child.on("exit", (code) => {
    activeProcess = null;
    void updateInstance(instanceId, (i) => ({ ...i, lastPlayedAt: new Date().toISOString() }));
    handlers.onExit({ code, crashed: code !== null && code !== 0 });
  });

  child.on("error", (error) => {
    activeProcess = null;
    handlers.onLog(`Prozess konnte nicht gestartet werden: ${error.message}`, "stderr");
    handlers.onExit({ code: null, crashed: true });
  });
}
