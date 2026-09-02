import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getInstanceGameDir } from "../instances/instancePaths.js";
import { getSkinState } from "../skins/skinStore.js";
import { getEconomy } from "./economyStore.js";
import { SHOP_CATALOG } from "./shopCatalog.js";

function cosmeticsConfigPath(instanceId: string): string {
  return `${getInstanceGameDir(instanceId)}/config/galaxycosmetics.json`;
}

// Joins the launcher's own internal storage (economy.json's equipped-item flags,
// skin-meta.json's glow color) into one small, self-contained file for the
// companion mod to read — it never needs to know these internal files exist.
// Outfit items are intentionally omitted: they're just alternate skin textures,
// already rendered by vanilla via whatever skin is on the account.
export async function exportCosmeticsConfig(instanceId: string): Promise<void> {
  const [economy, skin] = await Promise.all([getEconomy(), getSkinState()]);
  const equippedIds = new Set(economy.inventory.filter((i) => i.equipped).map((i) => i.itemId));

  const hatId = SHOP_CATALOG.find((item) => item.category === "hat" && equippedIds.has(item.id))?.id ?? null;
  const equippedEmoteId =
    SHOP_CATALOG.find((item) => item.category === "emote" && equippedIds.has(item.id))?.id ?? null;

  const configPath = cosmeticsConfigPath(instanceId);
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(
    configPath,
    JSON.stringify({ glowColor: skin.glowColor, hatId, equippedEmoteId }, null, 2),
    "utf-8"
  );
}
