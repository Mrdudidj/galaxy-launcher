import { useEffect, useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import { getErrorMessage } from "../../api/ipcError";
import type { ModSuggestion } from "../../../../shared/instance";
import "./WizardStep.css";

export function StepMods({
  instance,
  onNext
}: {
  instance: Instance;
  onNext: () => void;
}): React.JSX.Element {
  const [addedFileNames, setAddedFileNames] = useState<string[]>([]);
  const [defaultModCount, setDefaultModCount] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<ModSuggestion[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    void window.galaxy.settings.get().then((settings) => {
      setDefaultModCount(settings.defaultMods.length);
      if (settings.defaultMods.length > 0) {
        void window.galaxy.instances.applyDefaultMods(instance.id);
      }
    });
  }, [instance.id]);

  async function handleAddFiles(): Promise<void> {
    setIsAdding(true);
    const filePaths = await window.galaxy.dialogs.addMods(instance.id);
    setAddedFileNames((prev) => [...prev, ...filePaths.map((p) => p.split(/[/\\]/).pop() ?? p)]);
    setIsAdding(false);
  }

  async function handleAskAi(): Promise<void> {
    setIsAsking(true);
    setAiError(null);
    try {
      const suggestions = await window.galaxy.ai.suggestMods(instance.minecraftVersion, addedFileNames, aiPrompt);
      setAiSuggestions(suggestions);
    } catch (error) {
      setAiError(getErrorMessage(error, "KI-Vorschlag fehlgeschlagen."));
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="wizard-step">
      <span className="wizard-step__progress">Schritt 1 von 5</span>
      <h3 className="wizard-step__title">Mods</h3>
      <p className="wizard-step__hint">
        Füge .jar-Mod-Dateien hinzu.
        {defaultModCount !== null && defaultModCount > 0
          ? ` ${defaultModCount} Standard-Mod(s) aus den Einstellungen werden automatisch übernommen.`
          : " In den Einstellungen kannst du Standard-Mods festlegen, die jede neue Instanz automatisch bekommt."}
      </p>

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
        {isAdding ? "Öffne Dateiauswahl…" : "+ Mod-Datei hinzufügen"}
      </button>

      <div className="wizard-step__ai">
        <span className="wizard-step__ai-label">✨ KI-Mod-Vorschlag</span>
        <div className="wizard-step__ai-row">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="z. B. mehr Baumods, Performance-Mods…"
            onKeyDown={(e) => e.key === "Enter" && void handleAskAi()}
          />
          <button type="button" onClick={() => void handleAskAi()} disabled={isAsking}>
            {isAsking ? "Frage KI…" : "Vorschlagen"}
          </button>
        </div>
        {aiError && <p className="wizard-step__ai-error">{aiError}</p>}
        {aiSuggestions.length > 0 && (
          <div className="wizard-step__ai-suggestions">
            {aiSuggestions.map((s) => (
              <div className="wizard-step__ai-suggestion" key={s.name}>
                <strong>{s.name}</strong>
                <span>{s.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="wizard-step__actions" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="wizard-step__next" onClick={onNext}>
          Weiter
        </button>
      </div>
    </div>
  );
}
