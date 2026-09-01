import { readdir, readFile, writeFile, mkdir, cp, stat, rm } from "node:fs/promises";
import { basename } from "node:path";
import * as nbt from "prismarine-nbt";
import type { ServerEntry } from "../../../shared/instance.js";
import { getInstanceGameDir } from "./instancePaths.js";
import { updateInstance } from "./instanceStore.js";

async function readOptionsLines(instanceId: string): Promise<string[]> {
  try {
    const raw = await readFile(`${getInstanceGameDir(instanceId)}/options.txt`, "utf-8");
    return raw.split("\n").filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

// Minecraft's own options.txt is the source of truth for keybinds once an
// instance has launched at least once — this only ever *seeds* the file so a
// brand-new instance doesn't start with every key back at its vanilla default.
export async function copyKeybinds(fromInstanceId: string, toInstanceId: string): Promise<void> {
  const sourceLines = await readOptionsLines(fromInstanceId);
  const sourceKeybinds = new Map<string, string>();
  for (const line of sourceLines) {
    const [key, ...rest] = line.split(":");
    if (key?.startsWith("key_")) {
      sourceKeybinds.set(key, rest.join(":"));
    }
  }

  const targetLines = await readOptionsLines(toInstanceId);
  const seenKeys = new Set<string>();
  const mergedLines = targetLines.map((line) => {
    const key = line.split(":")[0];
    if (key && sourceKeybinds.has(key)) {
      seenKeys.add(key);
      return `${key}:${sourceKeybinds.get(key)}`;
    }
    return line;
  });

  for (const [key, value] of sourceKeybinds) {
    if (!seenKeys.has(key)) {
      mergedLines.push(`${key}:${value}`);
    }
  }

  await writeFile(`${getInstanceGameDir(toInstanceId)}/options.txt`, mergedLines.join("\n") + "\n", "utf-8");
}

export async function listWorlds(instanceId: string): Promise<string[]> {
  try {
    const entries = await readdir(`${getInstanceGameDir(instanceId)}/saves`, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function copyWorld(fromInstanceId: string, toInstanceId: string, worldName: string): Promise<void> {
  const source = `${getInstanceGameDir(fromInstanceId)}/saves/${worldName}`;
  const destination = `${getInstanceGameDir(toInstanceId)}/saves/${worldName}`;
  await mkdir(`${getInstanceGameDir(toInstanceId)}/saves`, { recursive: true });
  await cp(source, destination, { recursive: true });
}

async function copyFilesInto(filePaths: string[], destinationDir: string): Promise<string[]> {
  await mkdir(destinationDir, { recursive: true });
  const fileNames: string[] = [];
  for (const filePath of filePaths) {
    const fileName = basename(filePath);
    await cp(filePath, `${destinationDir}/${fileName}`);
    fileNames.push(fileName);
  }
  return fileNames;
}

export async function addLocalMods(instanceId: string, filePaths: string[]): Promise<void> {
  const fileNames = await copyFilesInto(filePaths, `${getInstanceGameDir(instanceId)}/mods`);
  await updateInstance(instanceId, (instance) => ({
    ...instance,
    mods: [...instance.mods, ...fileNames.map((fileName) => ({ source: "local" as const, fileName, enabled: true }))]
  }));
}

export async function removeMod(instanceId: string, fileName: string): Promise<void> {
  await rm(`${getInstanceGameDir(instanceId)}/mods/${fileName}`, { force: true });
  await updateInstance(instanceId, (instance) => ({
    ...instance,
    mods: instance.mods.filter((m) => m.fileName !== fileName)
  }));
}

export async function addLocalResourcePacks(instanceId: string, filePaths: string[]): Promise<void> {
  const fileNames = await copyFilesInto(filePaths, `${getInstanceGameDir(instanceId)}/resourcepacks`);
  await updateInstance(instanceId, (instance) => ({
    ...instance,
    resourcePacks: [...instance.resourcePacks, ...fileNames.map((fileName) => ({ fileName, enabled: true }))]
  }));
}

export async function removeResourcePack(instanceId: string, fileName: string): Promise<void> {
  await rm(`${getInstanceGameDir(instanceId)}/resourcepacks/${fileName}`, { force: true });
  await updateInstance(instanceId, (instance) => ({
    ...instance,
    resourcePacks: instance.resourcePacks.filter((p) => p.fileName !== fileName)
  }));
}

// Settings-configured mods that should land in every newly created instance —
// copies straight from wherever the user originally picked each file from.
export async function applyDefaultMods(instanceId: string, defaultModPaths: string[]): Promise<void> {
  const existing: string[] = [];
  for (const path of defaultModPaths) {
    try {
      await stat(path);
      existing.push(path);
    } catch {
      console.warn(`[instances] default mod no longer exists on disk, skipping: ${path}`);
    }
  }
  if (existing.length > 0) {
    await addLocalMods(instanceId, existing);
  }
}

export async function readServers(instanceId: string): Promise<ServerEntry[]> {
  try {
    const buffer = await readFile(`${getInstanceGameDir(instanceId)}/servers.dat`);
    const parsed = nbt.parseUncompressed(buffer, "big");
    const simplified = nbt.simplify(parsed) as { servers?: { name: string; ip: string }[] };
    return (simplified.servers ?? []).map((s) => ({ name: s.name, address: s.ip }));
  } catch {
    return [];
  }
}

export async function writeServers(instanceId: string, servers: ServerEntry[]): Promise<void> {
  // prismarine-nbt's builder supports `list(comp(array))` as its documented way to
  // build a list-of-compounds (see its README's Armor example), but `list`'s actual
  // return type and the `Compound`/`List<T>` type aliases it's assigned into aren't
  // mutually consistent in the package's own .d.ts — no arrangement of these calls
  // satisfies the checker. Build the (runtime-correct, README-matching) structure
  // untyped and assert it as NBT at the one point that matters: what gets written.
  const tag = {
    type: "compound",
    name: "",
    value: {
      servers: {
        type: "list",
        value: {
          type: "compound",
          value: servers.map((s) => ({
            name: nbt.string(s.name),
            ip: nbt.string(s.address)
          }))
        }
      }
    }
  } as unknown as nbt.NBT;
  const buffer = nbt.writeUncompressed(tag, "big");
  await writeFile(`${getInstanceGameDir(instanceId)}/servers.dat`, buffer);
}
