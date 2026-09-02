import { useMemo, useState } from "react";
import { getErrorMessage } from "../api/ipcError";
import { effectivePrice, type ShopItemCategory } from "../../../shared/economy";
import { CosmeticIcon, hasCosmeticIcon } from "../components/economy/CosmeticIcon";
import { CoinBalance } from "../components/economy/CoinBalance";
import { RankBadge } from "../components/economy/RankBadge";
import { SkinViewer3D } from "../components/skin/SkinViewer3D";
import { CATEGORY_LABELS as BASE_CATEGORY_LABELS } from "../data/shopCategoryLabels";
import { getEmoteAnimation, hasEmoteAnimation } from "../data/emoteAnimations";
import { useEconomy, useInvalidateEconomy, useShopCatalog } from "../api/useEconomy";
import { useAuthStore } from "../state/authStore";
import "./ShopView.css";

const CATEGORY_LABELS: Record<"all" | ShopItemCategory, string> = { all: "Alle", ...BASE_CATEGORY_LABELS };

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
  const glowColor = useAuthStore((s) => s.glowColor);

  const equippedIds = new Set(economy?.inventory.filter((i) => i.equipped).map((i) => i.itemId) ?? []);
  const equippedHatId = catalog?.find((item) => item.category === "hat" && equippedIds.has(item.id))?.id ?? null;
  const equippedPetId = catalog?.find((item) => item.category === "pet" && equippedIds.has(item.id))?.id ?? null;

  // Hovering an emote temporarily overrides the idle pose; otherwise the
  // preview reflects whatever's actually equipped, same as real gameplay.
  const previewAnimation = useMemo(
    () => (previewEmoteId ? getEmoteAnimation(previewEmoteId) : null),
    [previewEmoteId]
  );

  const owned = new Set(economy?.inventory.map((i) => i.itemId) ?? []);
  // founderOnly items (the Logo-Begleiter) are never for sale — granted via
  // redeem code only, so they don't belong in the normal buy grid at all.
  const visibleItems =
    catalog?.filter((item) => !item.founderOnly && (category === "all" || item.category === category)) ?? [];

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
      if (result.grantedItemName) parts.push(`${result.grantedItemName} freigeschaltet`);
      setRedeemMessage(`${parts.join(" · ")}!`);
      setRedeemInput("");
      invalidateEconomy();
    } catch (error) {
      setRedeemMessage(getErrorMessage(error, "Code ungültig."));
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

      <div className="shop-view__layout">
        <div className="shop-view__sidebar">
          <div
            className="shop-view__preview"
            style={glowColor ? ({ "--glow-color": glowColor } as React.CSSProperties) : undefined}
          >
            <SkinViewer3D
              skinUrl={skinUrl}
              width={220}
              height={420}
              zoom={0.9}
              animation={previewAnimation}
              hatId={equippedHatId}
              petId={equippedPetId}
            />
            {previewEmoteId && <span className="shop-view__preview-label">Vorschau läuft…</span>}
          </div>

          <div className="shop-view__redeem">
            <span className="shop-view__redeem-label">Code einlösen</span>
            <div className="shop-view__redeem-row">
              <input
                value={redeemInput}
                onChange={(e) => setRedeemInput(e.target.value)}
                placeholder="Code eingeben…"
                onKeyDown={(e) => e.key === "Enter" && void handleRedeem()}
              />
              <button onClick={() => void handleRedeem()}>Einlösen</button>
            </div>
            {redeemMessage && <span className="shop-view__redeem-message">{redeemMessage}</span>}
          </div>
        </div>

        <div className="shop-view__main">
          <div className="shop-view__tabs">
            {/* "pet" has no browsable items — the one pet is founderOnly (redeem-only), see Gründer screen */}
            {(Object.keys(CATEGORY_LABELS) as (typeof category)[])
              .filter((key) => key !== "pet")
              .map((key) => (
                <button key={key} className={category === key ? "active" : ""} onClick={() => setCategory(key)}>
                  {CATEGORY_LABELS[key]}
                </button>
              ))}
          </div>

          <div className="shop-view__grid">
            {visibleItems.map((item) => {
              const isOwned = owned.has(item.id);
              const isEquipped = equippedIds.has(item.id);
              const rank = economy?.rank ?? "member";
              const isLocked = item.vipOnly && rank === "member";
              const price = effectivePrice(item, rank);
              const isDiscounted = price !== item.price;

              const canPreview = hasEmoteAnimation(item.id);
              const hasIcon = hasCosmeticIcon(item.id);

              return (
                <div
                  className={`shop-item ${item.vipOnly ? "shop-item--vip" : ""} ${isEquipped ? "shop-item--equipped" : ""}`}
                  key={item.id}
                  onMouseEnter={() => canPreview && setPreviewEmoteId(item.id)}
                  onMouseLeave={() => canPreview && setPreviewEmoteId(null)}
                >
                  <div
                    className="shop-item__icon"
                    style={{ background: `linear-gradient(135deg, ${item.colorFrom}, ${item.colorTo})` }}
                  >
                    {hasIcon ? (
                      <CosmeticIcon itemId={item.id} colorFrom="rgba(255,255,255,0.95)" colorTo="rgba(255,255,255,0.6)" />
                    ) : (
                      <span>{item.icon}</span>
                    )}
                    {canPreview && <span className="shop-item__preview-hint">▶ Vorschau bei Hover</span>}
                    {isEquipped && <span className="shop-item__equipped-badge">Ausgerüstet</span>}
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
      </div>
    </div>
  );
}
