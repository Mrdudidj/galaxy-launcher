import { useMemo } from "react";
import type { ShopItem } from "../../../shared/economy";
import { SkinViewer3D } from "../components/skin/SkinViewer3D";
import { getEmoteAnimation } from "../data/emoteAnimations";
import { useEconomy, useInvalidateEconomy, useShopCatalog } from "../api/useEconomy";
import { useAuthStore } from "../state/authStore";
import "./LockerView.css";

export function LockerView(): React.JSX.Element {
  const { data: catalog } = useShopCatalog();
  const { data: economy } = useEconomy();
  const invalidateEconomy = useInvalidateEconomy();
  const skinUrl = useAuthStore((s) => s.skinUrl);

  const ownedItems: ShopItem[] =
    economy?.inventory
      .map((entry) => catalog?.find((item) => item.id === entry.itemId))
      .filter((item): item is ShopItem => Boolean(item)) ?? [];

  const equippedIds = new Set(economy?.inventory.filter((i) => i.equipped).map((i) => i.itemId) ?? []);

  const equippedEmoteId = ownedItems.find((item) => item.category === "emote" && equippedIds.has(item.id))?.id ?? null;
  const equippedAnimation = useMemo(
    () => (equippedEmoteId ? getEmoteAnimation(equippedEmoteId) : null),
    [equippedEmoteId]
  );

  async function toggleEquip(itemId: string): Promise<void> {
    await window.galaxy.economy.setEquipped(itemId, !equippedIds.has(itemId));
    invalidateEconomy();
  }

  return (
    <div className="locker-view">
      <h2>Spind</h2>
      <p className="locker-view__hint">Rüste deine gekauften Emotes, Hüte und Outfits aus.</p>

      <div className="locker-view__layout">
        <div className="locker-view__preview">
          <SkinViewer3D skinUrl={skinUrl} width={180} height={380} animation={equippedAnimation} />
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
                  {item.icon}
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
              <div className="locker-item" key={item.id}>
                <div
                  className="locker-item__icon"
                  style={{ background: `linear-gradient(135deg, ${item.colorFrom}, ${item.colorTo})` }}
                >
                  <span>{item.icon}</span>
                </div>
                <div className="locker-item__info">
                  <div className="locker-item__name">{item.name}</div>
                  <div className="locker-item__category">{item.category}</div>
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
