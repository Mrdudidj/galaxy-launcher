import { useEffect, useRef, useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import "./DownloadButton.css";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

export function DownloadButton({
  instanceId,
  minecraftVersion,
  modLoader,
  isDownloaded,
  onDownloaded
}: {
  instanceId: string;
  minecraftVersion: string;
  modLoader: Instance["modLoader"];
  isDownloaded: boolean;
  onDownloaded: () => void;
}): React.JSX.Element {
  const [state, setState] = useState<"idle" | "downloading" | "done" | "error">(isDownloaded ? "done" : "idle");
  const [progress, setProgress] = useState<{ phase: "vanilla" | "fabric"; bytesDownloaded: number; bytesTotal: number }>(
    { phase: "vanilla", bytesDownloaded: 0, bytesTotal: 0 }
  );
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => unsubscribeRef.current?.(), []);

  async function handleClick(event: React.MouseEvent): Promise<void> {
    event.stopPropagation();
    if (state === "downloading") return;

    setState("downloading");
    setProgress({ phase: "vanilla", bytesDownloaded: 0, bytesTotal: 0 });
    unsubscribeRef.current = window.galaxy.downloads.onProgress(setProgress);

    try {
      await window.galaxy.downloads.startInstance({ instanceId, minecraftVersion, modLoader });
      setState("done");
      onDownloaded();
    } catch (error) {
      console.error("Download failed", error);
      setState("error");
    } finally {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    }
  }

  if (state === "downloading") {
    const pct = progress.bytesTotal > 0 ? Math.min(100, (progress.bytesDownloaded / progress.bytesTotal) * 100) : 0;
    const label = progress.phase === "fabric" ? "Fabric…" : `${pct.toFixed(0)}%`;
    return (
      <div className="download-button download-button--progress" title={formatBytes(progress.bytesDownloaded)}>
        <div className="download-button__bar" style={{ width: `${pct}%` }} />
        <span className="download-button__label">{label}</span>
      </div>
    );
  }

  return (
    <button
      className={`download-button download-button--${state}`}
      onClick={(e) => void handleClick(e)}
      title={state === "done" ? "Erneut herunterladen" : "Minecraft-Dateien herunterladen"}
    >
      {state === "done" ? "✓ Bereit" : state === "error" ? "Fehler — erneut versuchen" : "Herunterladen"}
    </button>
  );
}
