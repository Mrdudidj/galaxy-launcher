import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Version } from "@xmcl/core";
import { open, readAllEntries, readEntryBuffered } from "@xmcl/unzip";
import type { TextureEntry } from "../../../shared/instance.js";
import { getInstanceGameDir, getSharedDir, getSharedVersionsDir } from "../instances/instancePaths.js";
import { readInstance } from "../instances/instanceStore.js";

const TEXTURES_PREFIX = "assets/minecraft/textures/";

type ZipFile = Awaited<ReturnType<typeof open>>;
type Entry = Awaited<ReturnType<typeof readAllEntries>>[number];

interface OpenJar {
  zip: ZipFile;
  // Keyed by the full in-jar path (e.g. "assets/minecraft/textures/block/stone.png").
  entriesByPath: Map<string, Entry>;
  textures: TextureEntry[];
}

// A client jar's contents never change once downloaded, and re-walking its
// full entry list (thousands of files, not just textures) was the slow part
// of every texture-browser open — cache it per Minecraft version for the
// life of the app instead of re-scanning on every visit.
const jarCache = new Map<string, Promise<OpenJar>>();

async function resolveJarPath(instanceId: string): Promise<string> {
  const instance = await readInstance(instanceId);
  if (!instance.resolvedVersionId) {
    throw new Error("Diese Instanz wurde noch nicht heruntergeladen.");
  }
  // A modloader version (e.g. "26.2-fabric0.19.3") inherits from its base
  // vanilla version and has no jar of its own — Version.parse follows that
  // inheritsFrom chain (the same helper launchInstance.ts already uses to
  // launch the game) and its minecraftVersion field is the real vanilla
  // version id whose jar actually holds the textures, regardless of loader.
  const resolvedVersion = await Version.parse(getSharedDir(), instance.resolvedVersionId);
  return `${getSharedVersionsDir()}/${resolvedVersion.minecraftVersion}/${resolvedVersion.minecraftVersion}.jar`;
}

async function loadJar(jarPath: string): Promise<OpenJar> {
  const zip = await open(jarPath);
  const entries = await readAllEntries(zip);
  const entriesByPath = new Map<string, Entry>();
  const textures: TextureEntry[] = [];
  for (const entry of entries) {
    entriesByPath.set(entry.fileName, entry);
    if (!entry.fileName.startsWith(TEXTURES_PREFIX) || !entry.fileName.endsWith(".png")) continue;
    const path = entry.fileName.slice(TEXTURES_PREFIX.length, -".png".length);
    const category = path.split("/")[0] ?? path;
    const fileName = path.split("/").pop() ?? path;
    textures.push({ path, category, fileName });
  }
  return { zip, entriesByPath, textures };
}

async function getOpenJar(instanceId: string): Promise<OpenJar> {
  const jarPath = await resolveJarPath(instanceId);
  let pending = jarCache.get(jarPath);
  if (!pending) {
    pending = loadJar(jarPath);
    jarCache.set(jarPath, pending);
    // Don't leave a failed open cached — the next attempt should retry from scratch.
    pending.catch(() => jarCache.delete(jarPath));
  }
  return pending;
}

export async function listTextures(instanceId: string): Promise<TextureEntry[]> {
  const jar = await getOpenJar(instanceId);
  return jar.textures;
}

async function readOne(jar: OpenJar, texturePath: string): Promise<string | null> {
  const entry = jar.entriesByPath.get(`${TEXTURES_PREFIX}${texturePath}.png`);
  if (!entry) return null;
  const buffer = await readEntryBuffered(jar.zip, entry);
  return buffer.toString("base64");
}

export async function readTexturePng(instanceId: string, texturePath: string): Promise<string> {
  const jar = await getOpenJar(instanceId);
  const result = await readOne(jar, texturePath);
  if (result === null) throw new Error(`Textur nicht gefunden: ${texturePath}`);
  return result;
}

// Used for the browser's thumbnail previews — one jar-open serving many
// reads is the whole point, so this exists alongside readTexturePng rather
// than making callers loop it one at a time.
export async function readTexturePngBatch(instanceId: string, texturePaths: string[]): Promise<Record<string, string>> {
  const jar = await getOpenJar(instanceId);
  const result: Record<string, string> = {};
  await Promise.all(
    texturePaths.map(async (path) => {
      const base64 = await readOne(jar, path);
      if (base64 !== null) result[path] = base64;
    })
  );
  return result;
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
