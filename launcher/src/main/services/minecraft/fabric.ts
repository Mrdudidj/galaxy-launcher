import { getLoaderArtifactListFor, installFabric, installLibraries } from "@xmcl/installer";
import { MinecraftFolder, Version } from "@xmcl/core";
import type { FabricLoaderSummary } from "../../../shared/minecraft.js";
import { getSharedDir } from "../instances/instancePaths.js";

export async function listFabricLoaders(minecraftVersion: string): Promise<FabricLoaderSummary[]> {
  const artifacts = await getLoaderArtifactListFor(minecraftVersion);
  return artifacts.map((a) => ({ version: a.loader.version, stable: a.loader.stable }));
}

export async function installFabricLoader(minecraftVersion: string, loaderVersion: string): Promise<string> {
  const minecraft = MinecraftFolder.from(getSharedDir());
  // installFabric() only writes the merged (vanilla + fabric) version JSON — it
  // doesn't fetch the libraries that JSON references (asm, sponge-mixin, the
  // fabric-loader jar itself). Resolve the written version (follows inheritsFrom
  // to merge in the already-installed vanilla libraries) and install its full
  // library set; already-present vanilla libraries are validated, not re-downloaded.
  const versionId = await installFabric({ minecraftVersion, version: loaderVersion, minecraft });
  const resolvedVersion = await Version.parse(minecraft, versionId);
  await installLibraries(resolvedVersion);
  return versionId;
}
