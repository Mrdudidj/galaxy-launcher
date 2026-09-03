import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { findVersionEntry } from "../minecraft/versionManifest.js";
import { getServerJarPath } from "./serverPaths.js";

interface VersionDownloadsJson {
  downloads: {
    server?: { url: string; sha1: string; size: number };
  };
  javaVersion?: { component: string; majorVersion: number };
}

// Same public per-version JSON the client install path already relies on
// (via @xmcl/installer's version list) — this just reads the "server"
// download entry from it instead of the client one. Not every version has a
// server jar (very old ones don't), hence the explicit check.
async function fetchVersionDownloads(minecraftVersion: string): Promise<VersionDownloadsJson> {
  const entry = await findVersionEntry(minecraftVersion);
  const response = await fetch(entry.url);
  if (!response.ok) {
    throw new Error(`Versionsdaten konnten nicht geladen werden (${response.status}).`);
  }
  return (await response.json()) as VersionDownloadsJson;
}

export async function getServerJavaRequirement(
  minecraftVersion: string
): Promise<{ component: string; majorVersion: number }> {
  const data = await fetchVersionDownloads(minecraftVersion);
  return data.javaVersion ?? { component: "jre-legacy", majorVersion: 8 };
}

function sha1Hex(buffer: Buffer): string {
  return createHash("sha1").update(buffer).digest("hex");
}

async function existingJarMatches(sha1: string): Promise<boolean> {
  try {
    const existing = await readFile(getServerJarPath());
    return sha1Hex(existing) === sha1;
  } catch {
    return false;
  }
}

// Downloads the real, official Mojang server jar for the given version —
// the same free download anyone could get from minecraft.net themselves,
// just fetched and verified (sha1) automatically.
export async function ensureServerJar(
  minecraftVersion: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  const data = await fetchVersionDownloads(minecraftVersion);
  const server = data.downloads.server;
  if (!server) {
    throw new Error(`Für Version ${minecraftVersion} gibt es keinen offiziellen Server-Download.`);
  }

  if (await existingJarMatches(server.sha1)) return;

  const response = await fetch(server.url);
  if (!response.ok || !response.body) {
    throw new Error(`Server-Download fehlgeschlagen (${response.status}).`);
  }

  const total = server.size;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    downloaded += value.length;
    onProgress?.(downloaded, total);
  }

  const buffer = Buffer.concat(chunks);
  if (sha1Hex(buffer) !== server.sha1) {
    throw new Error("Server-Download beschädigt (Prüfsumme stimmt nicht) — bitte erneut versuchen.");
  }

  await mkdir(dirname(getServerJarPath()), { recursive: true });
  await writeFile(getServerJarPath(), buffer);
}
