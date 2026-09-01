export interface MinecraftVersionSummary {
  id: string;
  type: "release" | "snapshot" | "old_beta" | "old_alpha";
  releaseTime: string;
}

export interface DownloadProgress {
  phase: "vanilla" | "fabric";
  bytesDownloaded: number;
  bytesTotal: number;
}

export interface FabricLoaderSummary {
  version: string;
  stable: boolean;
}
