import { cp, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getInstanceGameDir } from "./instancePaths.js";
import { readInstance, updateInstance } from "./instanceStore.js";

const COMPANION_MOD_VERSION = "1.7.0";
const COMPANION_MOD_FILENAME = "galaxy-cosmetics.jar";

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// Keeps the companion mod out of instance.mods[] on purpose — that array is
// user-facing and removable from the Mods tab, and a confused user removing
// this would silently lose cosmetics/fullbright/FPS-overlay with no obvious
// cause. Tracked instead via the instance's own companionModVersion field.
export async function ensureCompanionMod(instanceId: string): Promise<void> {
  const instance = await readInstance(instanceId);
  if (instance.modLoader.type !== "fabric") return;

  const destPath = join(getInstanceGameDir(instanceId), "mods", COMPANION_MOD_FILENAME);
  const isCurrent = instance.companionModVersion === COMPANION_MOD_VERSION && (await pathExists(destPath));
  if (isCurrent) return;

  const sourcePath = join(__dirname, "../../resources/mods", COMPANION_MOD_FILENAME);
  await mkdir(dirname(destPath), { recursive: true });
  await cp(sourcePath, destPath);
  await updateInstance(instanceId, (i) => ({ ...i, companionModVersion: COMPANION_MOD_VERSION }));
}
