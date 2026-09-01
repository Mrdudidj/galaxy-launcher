import { app } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { effectivePrice, type EconomyState, type Rank } from "../../../shared/economy.js";
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
// flow tied to the account, not a shareable string.
const REDEEM_CODES: Record<string, { coins?: number; nameGlow?: string; rank?: Rank }> = {
  "LOL12345!!!": { coins: 999_999 },
  STERNENSTAUB: { nameGlow: "#7c5cff" },
  "GALAXY-VIP": { rank: "vip" }
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
  return toPublic(state);
}

export async function redeemCode(
  code: string
): Promise<{ economy: EconomyState; grantedCoins: number; grantedGlow: string | null; grantedRank: Rank | null }> {
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
  state.redeemedCodes.push(code);
  await writeState(state);
  return {
    economy: toPublic(state),
    grantedCoins: reward.coins ?? 0,
    grantedGlow: reward.nameGlow ?? null,
    grantedRank: reward.rank ?? null
  };
}
