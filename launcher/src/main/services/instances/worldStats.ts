import { readFile } from "node:fs/promises";
import type { WorldStats } from "../../../shared/instance.js";
import { getCurrentSession } from "../auth/microsoftAuth.js";
import { getInstanceGameDir } from "./instancePaths.js";

interface StatsFile {
  stats?: Record<string, Record<string, number>>;
}

async function readJsonSafe<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function sumValues(obj: Record<string, number> | undefined): number {
  if (!obj) return 0;
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

// Reads Minecraft's own per-world stats/advancements files directly — the
// same ones vanilla's in-game Statistics screen reads, just surfaced with a
// nicer dashboard than vanilla's own menu bothers with. No new file format,
// no tracking of our own: this is the player's real, already-existing data.
export async function getWorldStats(instanceId: string, worldName: string): Promise<WorldStats | null> {
  const session = getCurrentSession();
  if (!session) return null;

  const base = `${getInstanceGameDir(instanceId)}/saves/${worldName}`;
  const statsData = await readJsonSafe<StatsFile>(`${base}/stats/${session.minecraftUuid}.json`);
  if (!statsData) return null;

  const advancementsData = await readJsonSafe<Record<string, { done?: boolean }>>(
    `${base}/advancements/${session.minecraftUuid}.json`
  );
  const advancementsCompleted = advancementsData
    ? Object.entries(advancementsData).filter(([key, value]) => !key.startsWith("Data") && value?.done).length
    : 0;

  const custom = statsData.stats?.["minecraft:custom"];

  return {
    worldName,
    playTimeSeconds: Math.round((custom?.["minecraft:play_time"] ?? 0) / 20),
    blocksMined: sumValues(statsData.stats?.["minecraft:mined"]),
    mobsKilled: sumValues(statsData.stats?.["minecraft:killed"]),
    jumps: custom?.["minecraft:jump"] ?? 0,
    deaths: custom?.["minecraft:deaths"] ?? 0,
    advancementsCompleted
  };
}
