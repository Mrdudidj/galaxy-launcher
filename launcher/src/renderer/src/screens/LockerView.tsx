import { useMemo } from "react";
import type { ShopItem } from "../../../shared/economy";
import { CosmeticIcon, hasCosmeticIcon } from "../components/economy/CosmeticIcon";
import { SkinViewer3D } from "../components/skin/SkinViewer3D";
import { CATEGORY_LABELS } from "../data/shopCategoryLabels";
import { getEmoteAnimation } from "../data/emoteAnimations";
import { useEconomy, useInvalidateEconomy, useShopCatalog } from "../api/useEconomy";
import { useAuthStore } from "../state/authStore";
import "./LockerView.css";

export function LockerView(): React.JSX.Element {
  const { data: catalog } = useShopCatalog();
  const { data: economy } = useEconomy();
  const invalidateEconomy = useInvalidateEconomy();
  const skinUrl = useAuthStore((s) => s.skinUrl);
  const glowColor = useAuthStore((s) => s.glowColor);
  const hydrateSkin = useAuthStore((s) => s.hydrateSkin);

  const ownedItems: ShopItem[] =
    economy?.inventory
      .map((entry) => catalog?.find((item) => item.id === entry.itemId))
      .filter((item): item is ShopItem => Boolean(item)) ?? [];

  const equippedIds = new Set(economy?.inventory.filter((i) => i.equipped).map((i) => i.itemId) ?? []);

  const equippedEmoteId = ownedItems.find((item) => item.category === "emote" && equippedIds.has(item.id))?.id ?? null;
  const equippedHatId = ownedItems.find((item) => item.category === "hat" && equippedIds.has(item.id))?.id ?? null;
  const equippedPetId = ownedItems.find((item) => item.category === "pet" && equippedIds.has(item.id))?.id ?? null;
  const equippedAnimation = useMemo(
    () => (equippedEmoteId ? getEmoteAnimation(equippedEmoteId) : null),
    [equippedEmoteId]
  );

  async function toggleEquip(itemId: string): Promise<void> {
    await window.galaxy.economy.setEquipped(itemId, !equippedIds.has(itemId));
    invalidateEconomy();
    // Glow/outfit equip changes activeSkinBase64/glowColor on the main side —
    // pull that fresh state in, same as SkinEditorView keeps the store in sync
    // after its own skin mutations.
    void hydrateSkin();
  }

  return (
    <div className="locker-view">
      <h2>Spind</h2>
      <p className="locker-view__hint">Rüste deine gekauften Emotes, Hüte und Outfits aus.</p>

      <div className="locker-view__layout">
        <div
          className="locker-view__preview"
          style={glowColor ? ({ "--glow-color": glowColor } as React.CSSProperties) : undefined}
        >
          <SkinViewer3D
            skinUrl={skinUrl}
            width={220}
            height={420}
            zoom={0.9}
            animation={equippedAnimation}
            hatId={equippedHatId}
            petId={equippedPetId}
          />
          <div className="locker-view__equipped-badges">
            {ownedItems
              .filter((item) => equippedIds.has(item.id))
              .map((item) => (
                <span
                  key={item.id}
                  className="locker-view__badge"
                  style={{ background: `linear-gradient(135deg, ${item.colorFrom}, ${item.colorTo})` }}
                  title={item.name}
                >
                  {hasCosmeticIcon(item.id) ? (
                    <CosmeticIcon itemId={item.id} colorFrom="rgba(255,255,255,0.95)" colorTo="rgba(255,255,255,0.6)" />
                  ) : (
                    item.icon
                  )}
                </span>
              ))}
            {ownedItems.filter((item) => equippedIds.has(item.id)).length === 0 && (
              <span className="locker-view__badge-hint">Nichts ausgerüstet</span>
            )}
          </div>
        </div>

        <div className="locker-view__items">
          {ownedItems.length === 0 && (
            <p className="locker-view__hint">Noch nichts im Spind — schau im Shop vorbei.</p>
          )}
          {ownedItems.map((item) => {
            const isEquipped = equippedIds.has(item.id);
            return (
              <div className={`locker-item ${isEquipped ? "locker-item--equipped" : ""}`} key={item.id}>
                <div
                  className="locker-item__icon"
                  style={{ background: `linear-gradient(135deg, ${item.colorFrom}, ${item.colorTo})` }}
                >
                  {hasCosmeticIcon(item.id) ? (
                    <CosmeticIcon itemId={item.id} colorFrom="rgba(255,255,255,0.95)" colorTo="rgba(255,255,255,0.6)" />
                  ) : (
                    <span>{item.icon}</span>
                  )}
                </div>
                <div className="locker-item__info">
                  <div className="locker-item__name">{item.name}</div>
                  <div className="locker-item__category">{CATEGORY_LABELS[item.category]}</div>
                </div>
                <button
                  className={`locker-item__toggle ${isEquipped ? "locker-item__toggle--active" : ""}`}
                  onClick={() => void toggleEquip(item.id)}
                >
                  {isEquipped ? "Ausgerüstet" : "Ausrüsten"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
