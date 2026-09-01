import { app } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SkinState } from "../../../shared/skin.js";

const DEFAULT_STATE: SkinState = { activeSkinBase64: null, glowColor: null };

function skinMetaPath(): string {
  return join(app.getPath("userData"), "skin-meta.json");
}

async function readState(): Promise<SkinState> {
  try {
    const raw = await readFile(skinMetaPath(), "utf-8");
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<SkinState>) };
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeState(state: SkinState): Promise<void> {
  await writeFile(skinMetaPath(), JSON.stringify(state, null, 2), "utf-8");
}

export async function getSkinState(): Promise<SkinState> {
  return readState();
}

export async function saveCustomSkin(base64Png: string): Promise<SkinState> {
  const state = await readState();
  state.activeSkinBase64 = base64Png;
  await writeState(state);
  return state;
}

export async function setGlowColor(color: string | null): Promise<SkinState> {
  const state = await readState();
  state.glowColor = color;
  await writeState(state);
  return state;
}
