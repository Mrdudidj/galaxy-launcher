import { useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import "./WizardStep.css";

export function StepResourcePacks({
  instance,
  onNext,
  onBack
}: {
  instance: Instance;
  onNext: () => void;
  onBack: () => void;
}): React.JSX.Element {
  const [addedFileNames, setAddedFileNames] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddFiles(): Promise<void> {
    setIsAdding(true);
    const filePaths = await window.galaxy.dialogs.addResourcePacks(instance.id);
    setAddedFileNames((prev) => [...prev, ...filePaths.map((p) => p.split(/[/\\]/).pop() ?? p)]);
    setIsAdding(false);
  }

  return (
    <div className="wizard-step">
      <span className="wizard-step__progress">Schritt 3 von 5</span>
      <h3 className="wizard-step__title">Ressourcenpakete</h3>
      <p className="wizard-step__hint">Füge .zip-Ressourcenpakete hinzu, oder überspringe diesen Schritt.</p>

      {addedFileNames.length > 0 && (
        <div className="wizard-step__list">
          {addedFileNames.map((name, i) => (
            <div className="wizard-step__list-item" key={`${name}-${i}`}>
              <span className="wizard-step__list-item-name">{name}</span>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="wizard-step__add-button" onClick={() => void handleAddFiles()} disabled={isAdding}>
        {isAdding ? "Öffne Dateiauswahl…" : "+ Paket hinzufügen"}
      </button>

      <div className="wizard-step__actions">
        <button type="button" className="wizard-step__back" onClick={onBack}>
          Zurück
        </button>
        <button type="button" className="wizard-step__next" onClick={onNext}>
          Weiter
        </button>
      </div>
    </div>
  );
}
