import { app } from "electron";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { effectivePrice, type EconomyState, type Rank } from "../../../shared/economy.js";
import { clearActiveSkin, saveCustomSkin, setGlowColor } from "../skins/skinStore.js";
import { SHOP_CATALOG } from "./shopCatalog.js";

const STARTING_COINS = 500;

// Local-only for now: there's no account/backend to sync this to yet (needs the
// Microsoft/Minecraft login + the Postgres-backed server from a later phase).
// Starts every install with 500 coins per the original spec.
interface GeneratedCode {
  rank: Rank;
  /** null = doesn't expire once redeemed. */
  expiresInHours: number | null;
  createdAt: string;
}

interface StoredEconomy extends EconomyState {
  redeemedCodes: string[];
  /** Owner-generated codes (e.g. from the Admin-Konsole's "Admin-Code generieren"),
   * keyed by the code string itself — separate from the static REDEEM_CODES below. */
  generatedCodes: Record<string, GeneratedCode>;
}

const DEFAULT_STATE: StoredEconomy = {
  coins: STARTING_COINS,
  inventory: [],
  nameGlowColor: null,
  rank: "member",
  adminRankExpiresAt: null,
  redeemedCodes: [],
  generatedCodes: {}
};

// GALAXY-VIP is a demo/testing code, same spirit as LOL12345!!! — once a real
// backend exists, VIP should be granted through an actual purchase/subscription
// flow tied to the account, not a shareable string. GALAXY-FOUNDER is the same
// kind of stand-in for the Logo-Begleiter pet: with no backend yet, there's no
// way to actually track "the first 10 people, ever" — this grants the item
// directly so the pet itself is real and equippable now, and swapping this for
// real signup-order tracking later is a backend change, not a rework of the
// pet/rendering built around it.
// Admin access is deliberately NOT a static code (unlike VIP/Founder below) —
// the Admin-Konsole's "Admin-Code generieren" mints a random, one-time code
// with an owner-chosen expiry via generateAdminCode() and the generatedCodes
// map, so each grant is its own code and can be time-limited. Since there's
// no backend/account system yet (see the local-only comment above), admin
// rank granted this way can only ever apply to the install that redeems it —
// sharing the code with someone lets THEIR OWN copy of the launcher show them
// the Admin-Konsole for THEIR OWN local reports/economy, not yours. A real
// cross-install permission model needs the backend; this is the same honest
// stand-in every other rank/grant in this file already is.
const REDEEM_CODES: Record<string, { coins?: number; nameGlow?: string; rank?: Rank; grantItemId?: string }> = {
  "LOL12345!!!": { coins: 999_999 },
  STERNENSTAUB: { nameGlow: "#7c5cff" },
  "GALAXY-VIP": { rank: "vip" },
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
  return {
    coins: state.coins,
    inventory: state.inventory,
    nameGlowColor: state.nameGlowColor,
    rank: state.rank,
    adminRankExpiresAt: state.adminRankExpiresAt
  };
}

// A time-limited admin grant has no background timer — it's checked lazily
// here, on every read, same idea as chatBanUntil being compared against
// `new Date()` wherever it's consumed. Self-heals the persisted rank back to
// "member" the first time it's read after expiry, rather than drifting stale.
function applyAdminExpiry(state: StoredEconomy): boolean {
  if (state.rank !== "admin" || !state.adminRankExpiresAt) return false;
  if (new Date(state.adminRankExpiresAt) > new Date()) return false;
  state.rank = "member";
  state.adminRankExpiresAt = null;
  return true;
}

export async function getEconomy(): Promise<EconomyState> {
  const state = await readState();
  if (applyAdminExpiry(state)) await writeState(state);
  return toPublic(state);
}

export async function setRank(rank: Rank): Promise<EconomyState> {
  const state = await readState();
  state.rank = rank;
  // A direct rank set is always permanent — only a generated, timed admin
  // code (see generateAdminCode/redeemCode) attaches an expiry.
  state.adminRankExpiresAt = null;
  await writeState(state);
  return toPublic(state);
}

// Owner-only in the UI (AdminConsoleView gates the button), but not re-checked
// here — same trust model as every other admin primitive in this file, which
// assume the caller (moderationStore/IPC) already applied the real gate.
export async function generateAdminCode(durationDays: number | null): Promise<string> {
  const state = await readState();
  let code: string;
  do {
    code = `GALAXY-${randomBytes(4).toString("hex").toUpperCase()}`;
  } while (state.generatedCodes[code] || REDEEM_CODES[code]);

  state.generatedCodes[code] = {
    rank: "admin",
    expiresInHours: durationDays === null ? null : durationDays * 24,
    createdAt: new Date().toISOString()
  };
  await writeState(state);
  return code;
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

  const generated = state.generatedCodes[code];
  const reward: { coins?: number; nameGlow?: string; rank?: Rank; grantItemId?: string } | undefined =
    REDEEM_CODES[code] ?? (generated ? { rank: generated.rank } : undefined);
  if (!reward) {
    throw new Error("Ungültiger Code.");
  }

  state.coins += reward.coins ?? 0;
  if (reward.nameGlow) state.nameGlowColor = reward.nameGlow;
  if (reward.rank) {
    state.rank = reward.rank;
    state.adminRankExpiresAt =
      generated?.expiresInHours != null ? new Date(Date.now() + generated.expiresInHours * 60 * 60 * 1000).toISOString() : null;
  }
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
