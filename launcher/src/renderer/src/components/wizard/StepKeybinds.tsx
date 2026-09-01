import { useEffect, useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import "./WizardStep.css";

export function StepKeybinds({
  instance,
  onNext,
  onBack
}: {
  instance: Instance;
  onNext: () => void;
  onBack: () => void;
}): React.JSX.Element {
  const [otherInstances, setOtherInstances] = useState<Instance[]>([]);
  const [sourceId, setSourceId] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    void Promise.all([window.galaxy.instances.list(), window.galaxy.wizard.getDefaults()]).then(
      ([instances, defaults]) => {
        const candidates = instances.filter((i) => i.id !== instance.id);
        setOtherInstances(candidates);
        const preferred = defaults.keybindsSourceInstanceId;
        setSourceId(preferred && candidates.some((c) => c.id === preferred) ? preferred : "");
      }
    );
  }, [instance.id]);

  async function handleNext(): Promise<void> {
    setIsApplying(true);
    if (sourceId) {
      await window.galaxy.instances.copyKeybinds(sourceId, instance.id);
      await window.galaxy.wizard.updateDefaults({ keybindsSourceInstanceId: sourceId });
    }
    setIsApplying(false);
    onNext();
  }

  return (
    <div className="wizard-step">
      <span className="wizard-step__progress">Schritt 2 von 5</span>
      <h3 className="wizard-step__title">Tastenbelegung</h3>
      <p className="wizard-step__hint">
        Übernimm deine Tastenbelegung von einer bestehenden Instanz, statt sie neu einzustellen.
      </p>

      <label className="wizard-step__field">
        <span>Übernehmen von</span>
        <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">Keine — Standardbelegung</option>
          {otherInstances.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>

      <div className="wizard-step__actions">
        <button type="button" className="wizard-step__back" onClick={onBack}>
          Zurück
        </button>
        <button type="button" className="wizard-step__next" onClick={() => void handleNext()} disabled={isApplying}>
          {isApplying ? "Übernehme…" : "Weiter"}
        </button>
      </div>
    </div>
  );
}
