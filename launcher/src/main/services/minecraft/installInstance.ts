import type { DownloadProgress } from "../../../shared/minecraft.js";
import { downloadVanillaVersion } from "./downloadVersion.js";
import { installFabricLoader } from "./fabric.js";

export interface InstallInstanceInput {
  minecraftVersion: string;
  modLoader: { type: "vanilla" | "fabric" | "forge" | "quilt"; version: string | null };
}

// Returns the version id to launch: the plain Minecraft version for vanilla, or the
// fabric-merged version id (fabric's installer writes a separate inheriting version
// json rather than mutating the vanilla one) for a Fabric instance.
export async function installInstanceFiles(
  input: InstallInstanceInput,
  onProgress: (progress: DownloadProgress) => void
): Promise<string> {
  await downloadVanillaVersion(input.minecraftVersion, onProgress);

  if (input.modLoader.type === "fabric" && input.modLoader.version) {
    onProgress({ phase: "fabric", bytesDownloaded: 0, bytesTotal: 0 });
    const versionId = await installFabricLoader(input.minecraftVersion, input.modLoader.version);
    onProgress({ phase: "fabric", bytesDownloaded: 1, bytesTotal: 1 });
    return versionId;
  }

  if (input.modLoader.type === "forge" || input.modLoader.type === "quilt") {
    throw new Error(`Mod-Loader "${input.modLoader.type}" wird noch nicht unterstützt.`);
  }

  return input.minecraftVersion;
}
