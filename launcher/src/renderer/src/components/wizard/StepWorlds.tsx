import { useEffect, useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import "./WizardStep.css";

export function StepWorlds({
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
  const [worlds, setWorlds] = useState<string[]>([]);
  const [worldName, setWorldName] = useState<string>("");
  const [isLoadingWorlds, setIsLoadingWorlds] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    void window.galaxy.instances.list().then((instances) => {
      setOtherInstances(instances.filter((i) => i.id !== instance.id));
    });
  }, [instance.id]);

  useEffect(() => {
    if (!sourceId) {
      setWorlds([]);
      setWorldName("");
      return;
    }
    setIsLoadingWorlds(true);
    void window.galaxy.instances.listWorlds(sourceId).then((names) => {
      setWorlds(names);
      setWorldName(names[0] ?? "");
      setIsLoadingWorlds(false);
    });
  }, [sourceId]);

  async function handleNext(): Promise<void> {
    if (sourceId && worldName) {
      setIsApplying(true);
      await window.galaxy.instances.copyWorld(sourceId, instance.id, worldName);
      setIsApplying(false);
    }
    onNext();
  }

  return (
    <div className="wizard-step">
      <span className="wizard-step__progress">Schritt 4 von 5</span>
      <h3 className="wizard-step__title">Welten</h3>
      <p className="wizard-step__hint">
        Kopiere eine Welt aus einer bestehenden Instanz, oder starte mit einer leeren Welt.
      </p>

      <label className="wizard-step__field">
        <span>Instanz</span>
        <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">Keine — leer starten</option>
          {otherInstances.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>

      {sourceId && (
        <label className="wizard-step__field">
          <span>Welt</span>
          <select value={worldName} onChange={(e) => setWorldName(e.target.value)} disabled={isLoadingWorlds}>
            {isLoadingWorlds && <option>Lade Welten…</option>}
            {!isLoadingWorlds && worlds.length === 0 && <option>Keine Welten gefunden</option>}
            {worlds.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="wizard-step__actions">
        <button type="button" className="wizard-step__back" onClick={onBack}>
          Zurück
        </button>
        <button type="button" className="wizard-step__next" onClick={() => void handleNext()} disabled={isApplying}>
          {isApplying ? "Kopiere…" : "Weiter"}
        </button>
      </div>
    </div>
  );
}
