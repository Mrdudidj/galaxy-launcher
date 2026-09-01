import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, cp, writeFile } from "node:fs/promises";
import { Instance, type ModLoaderType } from "@galaxy-launcher/shared-types";
import { getInstanceDir, getInstanceGameDir, getInstanceMetadataPath, getInstancesRoot } from "./instancePaths.js";

export interface CreateInstanceInput {
  name: string;
  minecraftVersion: string;
  modLoaderType?: ModLoaderType;
  modLoaderVersion?: string;
}

export async function readInstance(id: string): Promise<Instance> {
  return Instance.parse(JSON.parse(await readFile(getInstanceMetadataPath(id), "utf-8")));
}

async function writeInstance(instance: Instance): Promise<void> {
  await writeFile(getInstanceMetadataPath(instance.id), JSON.stringify(instance, null, 2), "utf-8");
}

export async function updateInstance(id: string, updater: (instance: Instance) => Instance): Promise<Instance> {
  const updated = Instance.parse(updater(await readInstance(id)));
  await writeInstance(updated);
  return updated;
}

export async function listInstances(): Promise<Instance[]> {
  const instancesDir = `${getInstancesRoot()}/instances`;
  let entries: string[];
  try {
    entries = await readdir(instancesDir);
  } catch {
    return [];
  }

  const instances: Instance[] = [];
  for (const entryId of entries) {
    try {
      const raw = await readFile(getInstanceMetadataPath(entryId), "utf-8");
      instances.push(Instance.parse(JSON.parse(raw)));
    } catch (error) {
      console.warn(`[instances] skipping unreadable instance "${entryId}":`, error);
    }
  }

  instances.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return instances;
}

export async function createInstance(input: CreateInstanceInput): Promise<Instance> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const instance = Instance.parse({
    id,
    name: input.name,
    icon: "default",
    createdAt: now,
    lastPlayedAt: null,
    totalPlayTimeSeconds: 0,
    minecraftVersion: input.minecraftVersion,
    resolvedVersionId: null,
    modLoader: { type: input.modLoaderType ?? "vanilla", version: input.modLoaderVersion ?? null },
    javaRuntime: { majorVersion: 21, customPath: null },
    memory: { minMb: 1024, maxMb: 4096 },
    resolution: { width: 1280, height: 720, fullscreen: false },
    extraJvmArgs: [],
    group: null,
    mods: [],
    resourcePacks: []
  });

  const gameDir = getInstanceGameDir(id);
  await mkdir(gameDir, { recursive: true });
  await Promise.all(
    ["mods", "resourcepacks", "saves", "config"].map((sub) => mkdir(`${gameDir}/${sub}`, { recursive: true }))
  );
  await writeInstance(instance);

  return instance;
}

export async function deleteInstance(id: string): Promise<void> {
  await rm(getInstanceDir(id), { recursive: true, force: true });
}

export async function duplicateInstance(id: string, newName: string): Promise<Instance> {
  const source = await readInstance(id);

  const newId = randomUUID();
  const now = new Date().toISOString();
  const duplicate = Instance.parse({
    ...source,
    id: newId,
    name: newName,
    createdAt: now,
    lastPlayedAt: null,
    totalPlayTimeSeconds: 0
  });

  await mkdir(getInstanceDir(newId), { recursive: true });
  await cp(getInstanceGameDir(id), getInstanceGameDir(newId), { recursive: true });
  await writeInstance(duplicate);

  return duplicate;
}
