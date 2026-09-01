import { useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import type { InstanceSettingsPatch } from "../../../../shared/instance";
import "./InstanceQuickActions.css";

type Mode = "menu" | "rename" | "category";

export function InstanceQuickActions({
  instance,
  existingGroups,
  onClose,
  onEdit,
  onDuplicate,
  onChanged
}: {
  instance: Instance;
  existingGroups: string[];
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onChanged: (updated: Instance) => void;
}): React.JSX.Element {
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState(instance.name);
  const [group, setGroup] = useState(instance.group ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function save(patch: InstanceSettingsPatch): Promise<void> {
    setIsSaving(true);
    const updated = await window.galaxy.instances.updateSettings(instance.id, patch);
    setIsSaving(false);
    onChanged(updated);
    onClose();
  }

  return (
    <div className="instance-quick-actions" onClick={(e) => e.stopPropagation()}>
      <div className="instance-quick-actions__header">
        <div className="instance-quick-actions__icon">{instance.name.slice(0, 1).toUpperCase()}</div>
        <span className="instance-quick-actions__name">{instance.name}</span>
        <button className="instance-quick-actions__close" onClick={onClose} title="Schließen">
          ✕
        </button>
      </div>

      {mode === "menu" && (
        <div className="instance-quick-actions__buttons">
          <button onClick={onEdit}>⚙ Bearbeiten</button>
          <button onClick={() => setMode("rename")}>✏ Umbenennen</button>
          <button onClick={onDuplicate}>⧉ Kopieren</button>
          <button onClick={() => setMode("category")}>🏷 Kategorie</button>
        </div>
      )}

      {mode === "rename" && (
        <div className="instance-quick-actions__form">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && name.trim() && void save({ name: name.trim() })}
          />
          <div className="instance-quick-actions__form-actions">
            <button onClick={() => setMode("menu")}>Abbrechen</button>
            <button
              className="instance-quick-actions__save"
              disabled={!name.trim() || isSaving}
              onClick={() => void save({ name: name.trim() })}
            >
              ✓ Speichern
            </button>
          </div>
        </div>
      )}

      {mode === "category" && (
        <div className="instance-quick-actions__form">
          <input
            list="instance-quick-actions-groups"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="z. B. Modpacks, Freunde…"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && void save({ group: group.trim() ? group.trim() : null })}
          />
          <datalist id="instance-quick-actions-groups">
            {existingGroups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <div className="instance-quick-actions__form-actions">
            <button onClick={() => setMode("menu")}>Abbrechen</button>
            <button
              className="instance-quick-actions__save"
              disabled={isSaving}
              onClick={() => void save({ group: group.trim() ? group.trim() : null })}
            >
              ✓ Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
