import { app } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { effectivePrice, type EconomyState, type Rank } from "../../../shared/economy.js";
import { clearActiveSkin, saveCustomSkin, setGlowColor } from "../skins/skinStore.js";
import { SHOP_CATALOG } from "./shopCatalog.js";

const STARTING_COINS = 500;

// Local-only for now: there's no account/backend to sync this to yet (needs the
// Microsoft/Minecraft login + the Postgres-backed server from a later phase).
// Starts every install with 500 coins per the original spec.
interface StoredEconomy extends EconomyState {
  redeemedCodes: string[];
}

const DEFAULT_STATE: StoredEconomy = {
  coins: STARTING_COINS,
  inventory: [],
  nameGlowColor: null,
  rank: "member",
  redeemedCodes: []
};

// GALAXY-VIP is a demo/testing code, same spirit as LOL12345!!! — once a real
// backend exists, VIP should be granted through an actual purchase/subscription
// flow tied to the account, not a shareable string. GALAXY-FOUNDER is the same
// kind of stand-in for the Logo-Begleiter pet: with no backend yet, there's no
// way to actually track "the first 10 people, ever" — this grants the item
// directly so the pet itself is real and equippable now, and swapping this for
// real signup-order tracking later is a backend change, not a rework of the
// pet/rendering built around it.
// GALAXY-ADMIN is the "give someone admin access" mechanism: since there's no
// backend/account system yet (see the local-only comment above), admin rank
// can only ever apply to the install that redeems it — sharing this code with
// someone lets THEIR OWN copy of the launcher show them the Admin-Konsole for
// THEIR OWN local reports/economy, not yours. A real cross-install permission
// model needs the backend; this is the same honest stand-in every other
// rank/grant in this file already is.
const REDEEM_CODES: Record<string, { coins?: number; nameGlow?: string; rank?: Rank; grantItemId?: string }> = {
  "LOL12345!!!": { coins: 999_999 },
  STERNENSTAUB: { nameGlow: "#7c5cff" },
  "GALAXY-VIP": { rank: "vip" },
  "GALAXY-ADMIN": { rank: "admin" },
  "GALAXY-FOUNDER": { grantItemId: "pet-galaxy-companion" }
};

function economyPath(): string {
  return join(app.getPath("userData"), "economy.json");
}

async function readState(): Promise<StoredEconomy> {
  try {
    const raw = await readFile(economyPath(), "utf-8");
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<StoredEconomy>) };
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeState(state: StoredEconomy): Promise<void> {
  await writeFile(economyPath(), JSON.stringify(state, null, 2), "utf-8");
}

function toPublic(state: StoredEconomy): EconomyState {
  return { coins: state.coins, inventory: state.inventory, nameGlowColor: state.nameGlowColor, rank: state.rank };
}

export async function getEconomy(): Promise<EconomyState> {
  return toPublic(await readState());
}

export async function setRank(rank: Rank): Promise<EconomyState> {
  const state = await readState();
  state.rank = rank;
  await writeState(state);
  return toPublic(state);
}

export async function purchaseItem(itemId: string): Promise<EconomyState> {
  const item = SHOP_CATALOG.find((i) => i.id === itemId);
  if (!item) throw new Error(`Unbekannter Artikel: ${itemId}`);

  const state = await readState();
  if (state.inventory.some((i) => i.itemId === itemId)) {
    return toPublic(state);
  }
  if (item.vipOnly && state.rank === "member") {
    throw new Error("Dieser Artikel ist nur für VIP und Owner.");
  }

  const price = effectivePrice(item, state.rank);
  if (state.coins < price) {
    throw new Error("Nicht genug Münzen.");
  }

  state.coins -= price;
  state.inventory.push({ itemId, equipped: false });
  await writeState(state);
  return toPublic(state);
}

// Galaxy-managed outfit textures live under the app's own resources dir (same
// pattern companionMod.ts uses for the cosmetics jar) rather than the
// renderer's bundled assets — the renderer never needs the raw file, only the
// main process does, to fold it into skinStore's activeSkinBase64.
function outfitAssetPath(fileName: string): string {
  return join(__dirname, "../../resources/outfits", fileName);
}

// Equipping a hat needs no store-side effect — the renderer already derives
// the equipped hat id from inventory, same as it already does for emotes.
// Glow and outfits need one, since nothing else currently applies them: glow
// via the existing skin:setGlow mechanism, outfits by reusing the exact same
// activeSkinBase64 slot a hand-painted Skin-Editor skin uses (there's only one
// slot; equipping an outfit overwrites a hand-painted skin the same way
// painting a new one over an equipped outfit would — no separate history is
// kept for either today).
async function applyEquipEffect(item: (typeof SHOP_CATALOG)[number]): Promise<void> {
  if (item.category === "glow" && item.glowColor) {
    await setGlowColor(item.glowColor);
  } else if (item.category === "outfit" && item.outfitSkinAsset) {
    const buffer = await readFile(outfitAssetPath(item.outfitSkinAsset));
    await saveCustomSkin(buffer.toString("base64"));
  }
}

async function applyUnequipEffect(item: (typeof SHOP_CATALOG)[number]): Promise<void> {
  if (item.category === "glow") {
    await setGlowColor(null);
  } else if (item.category === "outfit") {
    await clearActiveSkin();
  }
}

export async function setEquipped(itemId: string, equipped: boolean): Promise<EconomyState> {
  const item = SHOP_CATALOG.find((i) => i.id === itemId);
  if (!item) throw new Error(`Unbekannter Artikel: ${itemId}`);

  const state = await readState();
  const owned = state.inventory.find((i) => i.itemId === itemId);
  if (!owned) throw new Error("Artikel nicht im Besitz.");

  if (equipped) {
    // One equipped item per category at a time (it's a locker slot, not a pile).
    for (const entry of state.inventory) {
      const entryItem = SHOP_CATALOG.find((i) => i.id === entry.itemId);
      if (entryItem?.category === item.category) entry.equipped = false;
    }
  }
  owned.equipped = equipped;
  await writeState(state);

  if (equipped) {
    await applyEquipEffect(item);
  } else {
    await applyUnequipEffect(item);
  }

  return toPublic(state);
}

// Admin-console primitives — unlike purchaseItem, these never charge coins or
// check vipOnly/ownership; they exist so moderationStore.ts can apply an
// admin's decision directly. Each mutation is intentionally as small and
// single-purpose as the rest of this file's exports, so moderationStore can
// snapshot "before" state itself (via getEconomy()) and build a real,
// reversible audit entry around the call — this file doesn't need to know
// anything about moderation/audit concerns.
export async function adminGrantItem(itemId: string): Promise<EconomyState> {
  const item = SHOP_CATALOG.find((i) => i.id === itemId);
  if (!item) throw new Error(`Unbekannter Artikel: ${itemId}`);
  const state = await readState();
  if (!state.inventory.some((i) => i.itemId === itemId)) {
    state.inventory.push({ itemId, equipped: false });
    await writeState(state);
  }
  return toPublic(state);
}

export async function adminRevokeItem(itemId: string): Promise<EconomyState> {
  const state = await readState();
  state.inventory = state.inventory.filter((i) => i.itemId !== itemId);
  await writeState(state);
  return toPublic(state);
}

export async function adminAdjustCoins(delta: number): Promise<EconomyState> {
  const state = await readState();
  state.coins = Math.max(0, state.coins + delta);
  await writeState(state);
  return toPublic(state);
}

export async function redeemCode(code: string): Promise<{
  economy: EconomyState;
  grantedCoins: number;
  grantedGlow: string | null;
  grantedRank: Rank | null;
  grantedItemName: string | null;
}> {
  const state = await readState();
  if (state.redeemedCodes.includes(code)) {
    throw new Error("Dieser Code wurde bereits eingelöst.");
  }
  const reward = REDEEM_CODES[code];
  if (!reward) {
    throw new Error("Ungültiger Code.");
  }

  state.coins += reward.coins ?? 0;
  if (reward.nameGlow) state.nameGlowColor = reward.nameGlow;
  if (reward.rank) state.rank = reward.rank;
  let grantedItem = null;
  if (reward.grantItemId && !state.inventory.some((i) => i.itemId === reward.grantItemId)) {
    grantedItem = SHOP_CATALOG.find((i) => i.id === reward.grantItemId) ?? null;
    state.inventory.push({ itemId: reward.grantItemId, equipped: false });
  }
  state.redeemedCodes.push(code);
  await writeState(state);
  return {
    economy: toPublic(state),
    grantedCoins: reward.coins ?? 0,
    grantedGlow: reward.nameGlow ?? null,
    grantedRank: reward.rank ?? null,
    grantedItemName: grantedItem?.name ?? null
  };
}
