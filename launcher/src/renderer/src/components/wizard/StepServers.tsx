import { useEffect, useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import type { ServerEntry } from "../../../../shared/instance";
import "./WizardStep.css";

export function StepServers({
  instance,
  onFinish,
  onBack
}: {
  instance: Instance;
  onFinish: () => void;
  onBack: () => void;
}): React.JSX.Element {
  const [servers, setServers] = useState<ServerEntry[]>([]);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    void window.galaxy.wizard.getDefaults().then((defaults) => setServers(defaults.servers));
  }, []);

  function handleAdd(): void {
    if (!newName.trim() || !newAddress.trim()) return;
    setServers((prev) => [...prev, { name: newName.trim(), address: newAddress.trim() }]);
    setNewName("");
    setNewAddress("");
  }

  function handleRemove(index: number): void {
    setServers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFinish(): Promise<void> {
    setIsFinishing(true);
    await window.galaxy.instances.writeServers(instance.id, servers);
    await window.galaxy.wizard.updateDefaults({ servers });
    setIsFinishing(false);
    onFinish();
  }

  return (
    <div className="wizard-step">
      <span className="wizard-step__progress">Schritt 5 von 5</span>
      <h3 className="wizard-step__title">Server</h3>
      <p className="wizard-step__hint">Trage deine üblichen Server ein — sie werden für nächste Instanzen gemerkt.</p>

      {servers.length > 0 && (
        <div className="wizard-step__list">
          {servers.map((s, i) => (
            <div className="wizard-step__list-item" key={`${s.address}-${i}`}>
              <span className="wizard-step__list-item-name">
                {s.name} — {s.address}
              </span>
              <button type="button" className="wizard-step__list-remove" onClick={() => handleRemove(i)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="wizard-step__row">
        <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input
          placeholder="Adresse"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button type="button" className="wizard-step__add-button" onClick={handleAdd}>
          +
        </button>
      </div>

      <div className="wizard-step__actions">
        <button type="button" className="wizard-step__back" onClick={onBack}>
          Zurück
        </button>
        <button type="button" className="wizard-step__next" onClick={() => void handleFinish()} disabled={isFinishing}>
          {isFinishing ? "Speichere…" : "Fertig"}
        </button>
      </div>
    </div>
  );
}
