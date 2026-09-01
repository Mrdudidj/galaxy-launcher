import { useMemo, useState } from "react";
import { effectivePrice, type ShopItemCategory } from "../../../shared/economy";
import { CoinBalance } from "../components/economy/CoinBalance";
import { RankBadge } from "../components/economy/RankBadge";
import { SkinViewer3D } from "../components/skin/SkinViewer3D";
import { getEmoteAnimation, hasEmoteAnimation } from "../data/emoteAnimations";
import { useEconomy, useInvalidateEconomy, useShopCatalog } from "../api/useEconomy";
import { useAuthStore } from "../state/authStore";
import "./ShopView.css";

const CATEGORY_LABELS: Record<"all" | ShopItemCategory, string> = {
  all: "Alle",
  emote: "Emotes",
  hat: "Hüte",
  outfit: "Outfits",
  glow: "Leuchtfarben"
};

export function ShopView(): React.JSX.Element {
  const [category, setCategory] = useState<"all" | ShopItemCategory>("all");
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [previewEmoteId, setPreviewEmoteId] = useState<string | null>(null);

  const { data: catalog } = useShopCatalog();
  const { data: economy } = useEconomy();
  const invalidateEconomy = useInvalidateEconomy();
  const skinUrl = useAuthStore((s) => s.skinUrl);

  // Re-created only when the hovered item actually changes — animations carry
  // playback state, so reusing the same instance across renders would be wrong.
  const previewAnimation = useMemo(
    () => (previewEmoteId ? getEmoteAnimation(previewEmoteId) : null),
    [previewEmoteId]
  );

  const owned = new Set(economy?.inventory.map((i) => i.itemId) ?? []);
  const visibleItems = catalog?.filter((item) => category === "all" || item.category === category) ?? [];

  async function handleBuy(itemId: string): Promise<void> {
    setPurchasingId(itemId);
    try {
      await window.galaxy.economy.purchase(itemId);
      invalidateEconomy();
    } catch (error) {
      console.error("Kauf fehlgeschlagen", error);
    } finally {
      setPurchasingId(null);
    }
  }

  async function handleRedeem(): Promise<void> {
    if (!redeemInput.trim()) return;
    try {
      const result = await window.galaxy.economy.redeemCode(redeemInput.trim());
      const parts: string[] = [];
      if (result.grantedCoins > 0) parts.push(`+${result.grantedCoins.toLocaleString("de-DE")} Münzen`);
      if (result.grantedGlow) parts.push("Leuchtender Name freigeschaltet");
      if (result.grantedRank) parts.push(`Rang ${result.grantedRank === "vip" ? "VIP" : "Owner"} freigeschaltet`);
      setRedeemMessage(`${parts.join(" · ")}!`);
      setRedeemInput("");
      invalidateEconomy();
    } catch (error) {
      setRedeemMessage(error instanceof Error ? error.message : "Code ungültig.");
    }
  }

  return (
    <div className="shop-view">
      <div className="shop-view__header">
        <h2>Shop</h2>
        <div className="shop-view__header-right">
          <RankBadge rank={economy?.rank} />
          <CoinBalance />
        </div>
      </div>

      <div className="shop-view__top">
        <div className="shop-view__preview">
          <SkinViewer3D skinUrl={skinUrl} width={160} height={340} animation={previewAnimation} />
          {previewEmoteId && <span className="shop-view__preview-label">Vorschau läuft…</span>}
        </div>

        <div className="shop-view__redeem">
          <span className="shop-view__redeem-label">Code einlösen</span>
          <div className="shop-view__redeem-row">
            <input
              value={redeemInput}
              onChange={(e) => setRedeemInput(e.target.value)}
              placeholder="z. B. LOL12345!!!"
              onKeyDown={(e) => e.key === "Enter" && void handleRedeem()}
            />
            <button onClick={() => void handleRedeem()}>Einlösen</button>
          </div>
          {redeemMessage && <span className="shop-view__redeem-message">{redeemMessage}</span>}
        </div>
      </div>

      <div className="shop-view__tabs">
        {(Object.keys(CATEGORY_LABELS) as (typeof category)[]).map((key) => (
          <button
            key={key}
            className={category === key ? "active" : ""}
            onClick={() => setCategory(key)}
          >
            {CATEGORY_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="shop-view__grid">
        {visibleItems.map((item) => {
          const isOwned = owned.has(item.id);
          const rank = economy?.rank ?? "member";
          const isLocked = item.vipOnly && rank === "member";
          const price = effectivePrice(item, rank);
          const isDiscounted = price !== item.price;

          const canPreview = hasEmoteAnimation(item.id);

          return (
            <div
              className={`shop-item ${item.vipOnly ? "shop-item--vip" : ""}`}
              key={item.id}
              onMouseEnter={() => canPreview && setPreviewEmoteId(item.id)}
              onMouseLeave={() => canPreview && setPreviewEmoteId(null)}
            >
              <div
                className="shop-item__icon"
                style={{ background: `linear-gradient(135deg, ${item.colorFrom}, ${item.colorTo})` }}
              >
                <span>{item.icon}</span>
                {canPreview && <span className="shop-item__preview-hint">▶ Vorschau bei Hover</span>}
              </div>
              <div className="shop-item__name">{item.name}</div>
              <div className="shop-item__description">{item.description}</div>
              <button
                className={`shop-item__buy ${isOwned ? "shop-item__buy--owned" : ""} ${isLocked ? "shop-item__buy--locked" : ""}`}
                disabled={isOwned || isLocked || purchasingId === item.id}
                onClick={() => void handleBuy(item.id)}
              >
                {isOwned
                  ? "✓ Im Besitz"
                  : isLocked
                    ? "🔒 Nur VIP"
                    : purchasingId === item.id
                      ? "Kaufe…"
                      : price === 0
                        ? "Gratis"
                        : isDiscounted
                          ? `◈ ${price} (statt ${item.price})`
                          : `◈ ${price}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
