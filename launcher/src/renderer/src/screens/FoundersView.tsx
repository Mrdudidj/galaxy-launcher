import { SkinViewer3D } from "../components/skin/SkinViewer3D";
import { useEconomy, useShopCatalog } from "../api/useEconomy";
import { useAuthStore } from "../state/authStore";
import "./FoundersView.css";

const PET_ID = "pet-galaxy-companion";

export function FoundersView(): React.JSX.Element {
  const { data: catalog } = useShopCatalog();
  const { data: economy } = useEconomy();
  const skinUrl = useAuthStore((s) => s.skinUrl);

  const pet = catalog?.find((item) => item.id === PET_ID);
  const owns = economy?.inventory.some((i) => i.itemId === PET_ID) ?? false;

  return (
    <div className="founders-view">
      <h2>Gründer</h2>
      <p className="founders-view__hint">
        Die ersten 10 Gründer von Galaxy Launcher bekommen ein einzigartiges Haustier: das Logo selbst, als kleiner
        Begleitplanet mit Ring und Sternenstaub — das seltenste Kosmetik-Item, das es gibt.
      </p>

      <div className="founders-view__layout">
        <div className="founders-view__preview">
          <SkinViewer3D skinUrl={skinUrl} width={220} height={420} zoom={0.9} petId={PET_ID} />
        </div>

        <div className="founders-view__info">
          <div className={`founders-view__status ${owns ? "founders-view__status--unlocked" : ""}`}>
            {owns ? "✓ Du bist Gründer — der Logo-Begleiter ist in deinem Spind." : "Noch nicht freigeschaltet."}
          </div>
          {pet && <p className="founders-view__description">{pet.description}</p>}
          <p className="founders-view__note">
            Eine echte, weltweite Rangliste der ersten 10 braucht einen zentralen Server, der alle Anmeldungen kennt —
            den es für Galaxy Launcher noch nicht gibt. Sobald er läuft, wird die Vergabe automatisch anhand der
            echten Reihenfolge entschieden statt manuell.
          </p>
        </div>
      </div>
    </div>
  );
}
