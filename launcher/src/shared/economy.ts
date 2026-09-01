export type ShopItemCategory = "emote" | "hat" | "outfit" | "glow";

export type Rank = "member" | "vip" | "owner";

export const VIP_DISCOUNT = 0.4;

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ShopItemCategory;
  price: number;
  icon: string;
  colorFrom: string;
  colorTo: string;
  vipOnly?: boolean;
  /** Only set for category "glow" — the exact hex colour this item unlocks for use as a
   *  skin/name glow, so the UI never has to hardcode a name-to-colour mapping. */
  glowColor?: string;
}

export interface InventoryEntry {
  itemId: string;
  equipped: boolean;
}

export interface EconomyState {
  coins: number;
  inventory: InventoryEntry[];
  nameGlowColor: string | null;
  rank: Rank;
}

export function effectivePrice(item: ShopItem, rank: Rank): number {
  if (rank === "owner") return 0;
  if (rank === "vip") return Math.round(item.price * (1 - VIP_DISCOUNT));
  return item.price;
}
