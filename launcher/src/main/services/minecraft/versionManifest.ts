import { getVersionList, type MinecraftVersion } from "@xmcl/installer";

let cachedVersionList: { latest: { release: string; snapshot: string }; versions: MinecraftVersion[] } | null = null;

async function loadVersionList(): Promise<NonNullable<typeof cachedVersionList>> {
  if (!cachedVersionList) {
    cachedVersionList = await getVersionList();
  }
  return cachedVersionList;
}

export async function listReleaseVersions(): Promise<MinecraftVersion[]> {
  const manifest = await loadVersionList();
  return manifest.versions.filter((v) => v.type === "release");
}

export async function findVersionEntry(versionId: string): Promise<MinecraftVersion> {
  const manifest = await loadVersionList();
  const entry = manifest.versions.find((v) => v.id === versionId);
  if (!entry) {
    throw new Error(`Unbekannte Minecraft-Version: ${versionId}`);
  }
  return entry;
}
