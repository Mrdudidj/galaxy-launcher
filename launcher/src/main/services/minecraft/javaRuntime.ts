import { fetchJavaRuntimeManifest, getPotentialJavaLocations, installJavaRuntimeTask, resolveJava } from "@xmcl/installer";
import type { TaskContext } from "@xmcl/task";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { getSharedJavaDir } from "../instances/instancePaths.js";

async function findSystemJava(minMajorVersion: number): Promise<string | null> {
  const locations = await getPotentialJavaLocations();
  for (const location of locations) {
    const info = await resolveJava(location).catch(() => undefined);
    if (info && info.majorVersion >= minMajorVersion) return info.path;
  }
  return null;
}

function managedJavaExecutable(component: string): string {
  return process.platform === "win32"
    ? join(getSharedJavaDir(), component, "bin", "javaw.exe")
    : join(getSharedJavaDir(), component, "bin", "java");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a usable java executable for the given version's required runtime
 * component (from the version json's `javaVersion.component`, e.g.
 * "java-runtime-gamma"). Prefers an already-installed system Java that meets
 * the minimum major version; downloads Mojang's managed runtime as a fallback
 * so the user never needs to install Java themselves.
 */
export async function ensureJava(
  component: string,
  minMajorVersion: number,
  onProgress?: (downloaded: number, total: number) => void
): Promise<string> {
  const systemJava = await findSystemJava(minMajorVersion);
  if (systemJava) return systemJava;

  const managedPath = managedJavaExecutable(component);
  if (await fileExists(managedPath)) return managedPath;

  const manifest = await fetchJavaRuntimeManifest({ target: component });
  const task = installJavaRuntimeTask({ destination: join(getSharedJavaDir(), component), manifest });
  const context: TaskContext = { onUpdate: () => onProgress?.(task.progress, task.total) };
  await task.startAndWait(context);

  return managedPath;
}
