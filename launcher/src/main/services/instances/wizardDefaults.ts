import { app } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { WizardDefaults } from "../../../shared/instance.js";

const EMPTY_DEFAULTS: WizardDefaults = { keybindsSourceInstanceId: null, worldSourceInstanceId: null, servers: [] };

function wizardDefaultsPath(): string {
  return join(app.getPath("userData"), "wizardDefaults.json");
}

export async function getWizardDefaults(): Promise<WizardDefaults> {
  try {
    const raw = await readFile(wizardDefaultsPath(), "utf-8");
    return { ...EMPTY_DEFAULTS, ...(JSON.parse(raw) as Partial<WizardDefaults>) };
  } catch {
    return EMPTY_DEFAULTS;
  }
}

export async function updateWizardDefaults(patch: Partial<WizardDefaults>): Promise<void> {
  const current = await getWizardDefaults();
  await writeFile(wizardDefaultsPath(), JSON.stringify({ ...current, ...patch }, null, 2), "utf-8");
}
