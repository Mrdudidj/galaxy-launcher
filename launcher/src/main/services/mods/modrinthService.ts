import { mkdir, writeFile } from "node:fs/promises";
import type { ModInstallResult, ModrinthSearchHit } from "../../../shared/instance.js";
import { getInstanceGameDir } from "../instances/instancePaths.js";
import { readInstance, updateInstance } from "../instances/instanceStore.js";

const API_BASE = "https://api.modrinth.com/v2";
const USER_AGENT = "GalaxyLauncher/dev";

type ModLoader = "vanilla" | "fabric" | "forge" | "quilt";
type ModRef = Awaited<ReturnType<typeof readInstance>>["mods"][number];

interface ModrinthSearchResponse {
  hits: ModrinthRawHit[];
}

interface ModrinthRawHit {
  project_id: string;
  title: string;
  description: string;
  author: string;
  downloads: number;
  icon_url: string | null;
}

interface ModrinthFile {
  url: string;
  filename: string;
  primary: boolean;
}

interface ModrinthDependency {
  version_id: string | null;
  project_id: string;
  dependency_type: "required" | "optional" | "incompatible" | "embedded";
}

interface ModrinthVersion {
  id: string;
  files: ModrinthFile[];
  dependencies: ModrinthDependency[];
}

// Modrinth's loader/category slugs match our own ModLoaderType values one-to-one —
// "vanilla" is the one value that isn't a real Modrinth loader, since vanilla has no mods.
function loaderFacet(type: ModLoader): string {
  if (type === "vanilla") {
    throw new Error("Mod-Suche benötigt einen Modloader (Fabric, Forge oder Quilt).");
  }
  return type;
}

async function modrinthFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Modrinth-Anfrage fehlgeschlagen (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function searchMods(instanceId: string, query: string): Promise<ModrinthSearchHit[]> {
  const instance = await readInstance(instanceId);
  const loader = loaderFacet(instance.modLoader.type);
  const facets = JSON.stringify([["project_type:mod"], [`categories:${loader}`], [`versions:${instance.minecraftVersion}`]]);
  const params = new URLSearchParams({ query, facets, limit: "20" });
  const data = await modrinthFetch<ModrinthSearchResponse>(`/search?${params.toString()}`);
  return data.hits.map((hit) => ({
    projectId: hit.project_id,
    title: hit.title,
    description: hit.description,
    author: hit.author,
    downloads: hit.downloads,
    iconUrl: hit.icon_url
  }));
}

async function fetchVersionsForProject(
  projectId: string,
  minecraftVersion: string,
  loader: string
): Promise<ModrinthVersion[]> {
  const params = new URLSearchParams({
    game_versions: JSON.stringify([minecraftVersion]),
    loaders: JSON.stringify([loader])
  });
  return modrinthFetch<ModrinthVersion[]>(`/project/${projectId}/version?${params.toString()}`);
}

async function fetchVersionById(versionId: string): Promise<ModrinthVersion> {
  return modrinthFetch<ModrinthVersion>(`/version/${versionId}`);
}

// A dependency entry sometimes pins an exact version_id and sometimes only names the
// project — when it's unpinned, the newest build matching this instance's own game
// version/loader is the right choice (mirrors how the primary mod's version is picked).
async function resolveDependencyVersion(
  dep: ModrinthDependency,
  minecraftVersion: string,
  loader: string
): Promise<ModrinthVersion | null> {
  if (dep.version_id) {
    return fetchVersionById(dep.version_id);
  }
  const versions = await fetchVersionsForProject(dep.project_id, minecraftVersion, loader);
  return versions[0] ?? null;
}

async function downloadModFile(instanceId: string, file: ModrinthFile): Promise<void> {
  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Download fehlgeschlagen (${response.status}): ${file.filename}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const destDir = `${getInstanceGameDir(instanceId)}/mods`;
  await mkdir(destDir, { recursive: true });
  await writeFile(`${destDir}/${file.filename}`, buffer);
}

export async function installMod(instanceId: string, projectId: string): Promise<ModInstallResult> {
  const instance = await readInstance(instanceId);
  const loader = loaderFacet(instance.modLoader.type);
  const seenProjectIds = new Set(instance.mods.map((m) => m.projectId).filter((id): id is string => Boolean(id)));

  const versions = await fetchVersionsForProject(projectId, instance.minecraftVersion, loader);
  const primary = versions[0];
  if (!primary) {
    throw new Error(`Diese Mod unterstützt Minecraft ${instance.minecraftVersion} mit ${loader} nicht.`);
  }

  const installed: ModRef[] = [];

  async function installOne(version: ModrinthVersion, pid: string): Promise<void> {
    const file = version.files.find((f) => f.primary) ?? version.files[0];
    if (!file) return;
    await downloadModFile(instanceId, file);
    installed.push({ source: "modrinth", projectId: pid, versionId: version.id, fileName: file.filename, enabled: true });
    seenProjectIds.add(pid);
  }

  await installOne(primary, projectId);

  // Only "required" dependencies auto-install — "optional"/"incompatible" need a player's
  // own choice, and "embedded" means the primary jar already bundles it.
  for (const dep of primary.dependencies) {
    if (dep.dependency_type !== "required" || seenProjectIds.has(dep.project_id)) continue;
    const depVersion = await resolveDependencyVersion(dep, instance.minecraftVersion, loader);
    if (depVersion) {
      await installOne(depVersion, dep.project_id);
    }
  }

  await updateInstance(instanceId, (i) => ({ ...i, mods: [...i.mods, ...installed] }));

  return { installedFileNames: installed.map((m) => m.fileName) };
}
