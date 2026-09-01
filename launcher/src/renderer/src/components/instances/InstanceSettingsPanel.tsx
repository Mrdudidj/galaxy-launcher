import { useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import "./InstanceSettingsPanel.css";

export function InstanceSettingsPanel({
  instance,
  existingGroups,
  onClose,
  onSaved,
  onDuplicate,
  onCreateShortcut,
  onDelete
}: {
  instance: Instance;
  existingGroups: string[];
  onClose: () => void;
  onSaved: (updated: Instance) => void;
  onDuplicate: () => void;
  onCreateShortcut: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const [name, setName] = useState(instance.name);
  const [minMb, setMinMb] = useState(instance.memory.minMb);
  const [maxMb, setMaxMb] = useState(instance.memory.maxMb);
  const [width, setWidth] = useState(instance.resolution.width);
  const [height, setHeight] = useState(instance.resolution.height);
  const [group, setGroup] = useState(instance.group ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    const updated = await window.galaxy.instances.updateSettings(instance.id, {
      name,
      memory: { minMb, maxMb: Math.max(maxMb, minMb) },
      resolution: { width, height, fullscreen: instance.resolution.fullscreen },
      group: group.trim() ? group.trim() : null
    });
    setIsSaving(false);
    onSaved(updated);
  }

  return (
    <div className="instance-settings-panel" onClick={(e) => e.stopPropagation()}>
      <label className="instance-settings-panel__field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Instanzname" />
      </label>

      <label className="instance-settings-panel__field">
        <span>Arbeitsspeicher (RAM)</span>
        <div className="instance-settings-panel__memory-row">
          <input
            type="number"
            min={512}
            step={256}
            value={minMb}
            onChange={(e) => setMinMb(Number(e.target.value))}
          />
          <span>–</span>
          <input
            type="number"
            min={minMb}
            step={256}
            value={maxMb}
            onChange={(e) => setMaxMb(Number(e.target.value))}
          />
          <span className="instance-settings-panel__unit">MB</span>
        </div>
      </label>

      <label className="instance-settings-panel__field">
        <span>Kategorie</span>
        <input
          list="instance-settings-panel-groups"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder="z. B. Modpacks, Freunde, Vanilla…"
        />
        <datalist id="instance-settings-panel-groups">
          {existingGroups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </label>

      <label className="instance-settings-panel__field">
        <span>Auflösung</span>
        <div className="instance-settings-panel__memory-row">
          <input type="number" min={640} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          <span>×</span>
          <input type="number" min={480} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
        </div>
      </label>

      <div className="instance-settings-panel__quick-actions">
        <button onClick={onDuplicate}>⧉ Duplizieren</button>
        <button onClick={onCreateShortcut}>🔗 Verknüpfung</button>
        <button className="instance-settings-panel__danger" onClick={onDelete}>
          ✕ Löschen
        </button>
      </div>

      <div className="instance-settings-panel__actions">
        <button onClick={onClose}>Abbrechen</button>
        <button className="instance-settings-panel__save" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? "Speichere…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}
