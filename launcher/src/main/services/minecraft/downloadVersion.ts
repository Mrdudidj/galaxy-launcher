import { access, writeFile } from "node:fs/promises";
import { MinecraftFolder } from "@xmcl/core";
import { installTask } from "@xmcl/installer";
import type { TaskContext } from "@xmcl/task";
import type { DownloadProgress } from "../../../shared/minecraft.js";
import { getSharedVersionsDir, getSharedDir } from "../instances/instancePaths.js";
import { findVersionEntry } from "./versionManifest.js";

const PROGRESS_THROTTLE_MS = 200;
const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 2000;

// Keep concurrent connections modest — a vanilla install fans out into 5000+
// individual asset requests, and high concurrency measurably increases connection
// timeouts/failures on constrained or virtualized network stacks (observed in dev
// sandboxes; a real desktop network typically has more headroom, but there's no
// real download-speed cost to staying conservative here).
const DOWNLOAD_CONCURRENCY = 12;

async function runInstall(
  versionId: string,
  minecraft: ReturnType<typeof MinecraftFolder.from>,
  onProgress: (progress: DownloadProgress) => void
): Promise<void> {
  const versionEntry = await findVersionEntry(versionId);
  const rootTask = installTask(versionEntry, minecraft, {
    assetsDownloadConcurrency: DOWNLOAD_CONCURRENCY,
    librariesDownloadConcurrency: DOWNLOAD_CONCURRENCY
  });

  let lastEmit = 0;
  const context: TaskContext = {
    // `task` here may be any node in the task tree (installTask fans out into
    // per-file download tasks) — always read the root's aggregate progress/total,
    // which children propagate into via onChildUpdate, rather than the node's own.
    onUpdate: () => {
      const now = Date.now();
      if (now - lastEmit < PROGRESS_THROTTLE_MS) return;
      lastEmit = now;
      onProgress({ phase: "vanilla", bytesDownloaded: rootTask.progress, bytesTotal: rootTask.total });
    }
  };

  await rootTask.startAndWait(context);
  onProgress({ phase: "vanilla", bytesDownloaded: rootTask.total, bytesTotal: rootTask.total });
}

function installedMarkerPath(versionId: string): string {
  return `${getSharedVersionsDir()}/${versionId}/.galaxy-installed`;
}

async function isAlreadyInstalled(versionId: string): Promise<boolean> {
  try {
    await access(installedMarkerPath(versionId));
    return true;
  } catch {
    return false;
  }
}

// A handful of the 5000+ file requests in a cold-cache install can still fail
// (connection timeouts, transient network blips) even with concurrency capped
// above. A plain re-run skips files already downloaded and validated, so it's
// cheap and reliably finishes in one or two more tries — retry the whole task
// rather than surfacing single-file network failures to the user.
export async function downloadVanillaVersion(
  versionId: string,
  onProgress: (progress: DownloadProgress) => void
): Promise<void> {
  // installTask() re-verifies every asset/library file's checksum even when
  // nothing needs downloading, which for 5000+ files is real time (and, if the
  // verification pass itself touches the network — e.g. to refresh a manifest —
  // real opportunity for transient failures). Once we've completed a full
  // install successfully, trust that instead of re-verifying on every launch.
  if (await isAlreadyInstalled(versionId)) {
    onProgress({ phase: "vanilla", bytesDownloaded: 1, bytesTotal: 1 });
    return;
  }

  const minecraft = MinecraftFolder.from(getSharedDir());

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await runInstall(versionId, minecraft, onProgress);
      await writeFile(installedMarkerPath(versionId), new Date().toISOString(), "utf-8");
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
      console.warn(`[downloads] vanilla install attempt ${attempt} failed, retrying:`, error);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}
