import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Version } from "@xmcl/core";
import { filterEntries, open, readAllEntries, readEntryBuffered } from "@xmcl/unzip";
import type { TextureEntry } from "../../../shared/instance.js";
import { getInstanceGameDir, getSharedDir, getSharedVersionsDir } from "../instances/instancePaths.js";
import { readInstance } from "../instances/instanceStore.js";

const TEXTURES_PREFIX = "assets/minecraft/textures/";

// A modloader version (e.g. "26.2-fabric0.19.3") inherits from its base
// vanilla version and has no jar of its own — Version.parse follows that
// inheritsFrom chain (the same helper launchInstance.ts already uses to
// launch the game) and its minecraftVersion field is the real vanilla
// version id whose jar actually holds the textures, regardless of loader.
async function openClientJar(instanceId: string) {
  const instance = await readInstance(instanceId);
  if (!instance.resolvedVersionId) {
    throw new Error("Diese Instanz wurde noch nicht heruntergeladen.");
  }
  const resolvedVersion = await Version.parse(getSharedDir(), instance.resolvedVersionId);
  const jarPath = `${getSharedVersionsDir()}/${resolvedVersion.minecraftVersion}/${resolvedVersion.minecraftVersion}.jar`;
  return open(jarPath);
}

export async function listTextures(instanceId: string): Promise<TextureEntry[]> {
  const zip = await openClientJar(instanceId);
  const entries = await readAllEntries(zip);
  const textures: TextureEntry[] = [];
  for (const entry of entries) {
    if (!entry.fileName.startsWith(TEXTURES_PREFIX) || !entry.fileName.endsWith(".png")) continue;
    const path = entry.fileName.slice(TEXTURES_PREFIX.length, -".png".length);
    const category = path.split("/")[0] ?? path;
    const fileName = path.split("/").pop() ?? path;
    textures.push({ path, category, fileName });
  }
  return textures;
}

export async function readTexturePng(instanceId: string, texturePath: string): Promise<string> {
  const zip = await openClientJar(instanceId);
  const [entry] = await filterEntries(zip, [`${TEXTURES_PREFIX}${texturePath}.png`]);
  if (!entry) throw new Error(`Textur nicht gefunden: ${texturePath}`);
  const buffer = await readEntryBuffered(zip, entry);
  return buffer.toString("base64");
}

// One shared resource pack accumulates every texture a player has ever edited,
// rather than a separate pack per edit — same pack_format the real client jar
// itself reports for this Minecraft version (its own version.json), not guessed.
async function ensurePackMeta(packDir: string): Promise<void> {
  const metaPath = `${packDir}/pack.mcmeta`;
  try {
    await readFile(metaPath, "utf-8");
  } catch {
    await mkdir(packDir, { recursive: true });
    await writeFile(
      metaPath,
      JSON.stringify({ pack: { pack_format: 88, description: "Galaxy Launcher custom textures" } }, null, 2),
      "utf-8"
    );
  }
}

export async function applyCustomTexture(instanceId: string, texturePath: string, base64Png: string): Promise<void> {
  const packDir = `${getInstanceGameDir(instanceId)}/resourcepacks/galaxy-custom`;
  await ensurePackMeta(packDir);
  const destPath = `${packDir}/assets/minecraft/textures/${texturePath}.png`;
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, Buffer.from(base64Png, "base64"));
}
