import { useEffect, useMemo, useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import { getErrorMessage } from "../../api/ipcError";
import { CreateInstanceWizard } from "../wizard/CreateInstanceWizard";
import { useInstancesStore } from "../../state/instancesStore";
import { useViewStore } from "../../state/viewStore";
import { InstanceDetailPanel } from "./InstanceDetailPanel";
import { InstanceQuickActions } from "./InstanceQuickActions";
import "./InstancesDrawer.css";

const UNGROUPED = "Ohne Kategorie";

export function InstancesDrawer(): React.JSX.Element {
  const isOpen = useViewStore((s) => s.isInstancesOpen);
  const closeInstances = useViewStore((s) => s.closeInstances);
  const { instances, selectedInstanceId, isLoading, refresh, remove, duplicate, select } = useInstancesStore();
  const [showWizard, setShowWizard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<{ id: string; name: string } | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  // Two-step flow: a tile click opens the small quickTarget popup
  // (rename/duplicate/category/"Bearbeiten"); only "Bearbeiten" promotes it
  // to editTarget, which is what triggers the wide, fully-tabbed panel.
  const [quickTarget, setQuickTarget] = useState<Instance | null>(null);
  const [editTarget, setEditTarget] = useState<Instance | null>(null);
  const [shortcutMessage, setShortcutMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen, refresh]);

  useEffect(() => {
    if (!isOpen) {
      setQuickTarget(null);
      setEditTarget(null);
    }
  }, [isOpen]);

  function openQuick(instance: Instance): void {
    select(instance.id);
    setQuickTarget(instance);
    setEditTarget(null);
  }

  const groups = useMemo(() => {
    const map = new Map<string, Instance[]>();
    for (const instance of instances) {
      const key = instance.group?.trim() || UNGROUPED;
      const list = map.get(key) ?? [];
      list.push(instance);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === UNGROUPED) return 1;
      if (b === UNGROUPED) return -1;
      return a.localeCompare(b);
    });
  }, [instances]);

  const existingGroups = useMemo(
    () => [...new Set(instances.map((i) => i.group?.trim()).filter((g): g is string => Boolean(g)))].sort(),
    [instances]
  );

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    if (quickTarget?.id === deleteTarget.id) setQuickTarget(null);
    if (editTarget?.id === deleteTarget.id) setEditTarget(null);
    setDeleteTarget(null);
  }

  async function confirmDuplicate(): Promise<void> {
    if (!duplicateTarget || !duplicateName.trim()) return;
    await duplicate(duplicateTarget.id, duplicateName.trim());
    setDuplicateTarget(null);
  }

  async function handleCreateShortcut(id: string, name: string): Promise<void> {
    try {
      await window.galaxy.instances.createShortcut(id, name);
      setShortcutMessage(`Verknüpfung für "${name}" auf dem Desktop erstellt.`);
    } catch (error) {
      setShortcutMessage(getErrorMessage(error, "Verknüpfung fehlgeschlagen."));
    }
    setTimeout(() => setShortcutMessage(null), 3500);
  }

  return (
    <>
      <div
        className={`instances-drawer__backdrop ${isOpen ? "instances-drawer__backdrop--open" : ""}`}
        onClick={closeInstances}
      />
      <div
        className={`instances-drawer ${isOpen ? "instances-drawer--open" : ""} ${editTarget ? "instances-drawer--detail-open" : ""}`}
      >
        <div className="instances-drawer__header">
          <h2>Instanzen</h2>
          <div className="instances-drawer__header-actions">
            <button className="instances-drawer__create-button" onClick={() => setShowWizard(true)}>
              + Neue Instanz
            </button>
            <button className="instances-drawer__close" onClick={closeInstances} title="Schließen">
              ✕
            </button>
          </div>
        </div>

        {shortcutMessage && <p className="instances-drawer__hint">{shortcutMessage}</p>}
        {isLoading && instances.length === 0 && <p className="instances-drawer__hint">Lade Instanzen…</p>}
        {!isLoading && instances.length === 0 && (
          <p className="instances-drawer__hint">Noch keine Instanzen. Erstelle deine erste oben.</p>
        )}

        <div className="instances-drawer__layout">
          <div className="instances-drawer__groups">
            {groups.map(([groupName, groupInstances]) => (
              <section className="instances-drawer__group" key={groupName}>
                <h3 className="instances-drawer__group-title">
                  {groupName}
                  <span className="instances-drawer__group-count">{groupInstances.length}</span>
                </h3>
                <div className="instances-drawer__tile-grid">
                  {groupInstances.map((instance) => (
                    <button
                      key={instance.id}
                      className={`instance-tile ${instance.id === selectedInstanceId ? "instance-tile--selected" : ""} ${quickTarget?.id === instance.id || editTarget?.id === instance.id ? "instance-tile--active" : ""}`}
                      onClick={() => openQuick(instance)}
                      title={`${instance.name} verwalten`}
                    >
                      <div className="instance-tile__icon">
                        {instance.name.slice(0, 1).toUpperCase()}
                        {instance.resolvedVersionId === null && (
                          <span className="instance-tile__pending" title="Noch nicht heruntergeladen" />
                        )}
                      </div>
                      <div className="instance-tile__name">{instance.name}</div>
                      <div className="instance-tile__meta">
                        {instance.minecraftVersion} · {instance.modLoader.type}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {editTarget ? (
            <InstanceDetailPanel
              instance={editTarget}
              onClose={() => setEditTarget(null)}
              onSaved={(updated) => {
                setEditTarget(updated);
                void refresh();
              }}
              onCreateShortcut={() => void handleCreateShortcut(editTarget.id, editTarget.name)}
              onDelete={() => setDeleteTarget({ id: editTarget.id, name: editTarget.name })}
            />
          ) : (
            quickTarget && (
              <InstanceQuickActions
                instance={quickTarget}
                existingGroups={existingGroups}
                onClose={() => setQuickTarget(null)}
                onEdit={() => setEditTarget(quickTarget)}
                onDuplicate={() => {
                  setDuplicateName(`${quickTarget.name} (Kopie)`);
                  setDuplicateTarget({ id: quickTarget.id, name: quickTarget.name });
                  setQuickTarget(null);
                }}
                onChanged={() => void refresh()}
              />
            )
          )}
        </div>
      </div>

      {showWizard && (
        <div className="instances-drawer__wizard-overlay">
          <CreateInstanceWizard onDone={() => setShowWizard(false)} />
        </div>
      )}

      {deleteTarget && (
        <div className="instances-drawer__confirm-overlay">
          <div className="instances-drawer__confirm-panel">
            <p>
              <strong>{deleteTarget.name}</strong> wirklich löschen? Das entfernt alle Mods, Welten und
              Einstellungen dieser Instanz unwiderruflich.
            </p>
            <div className="instances-drawer__confirm-actions">
              <button onClick={() => setDeleteTarget(null)}>Abbrechen</button>
              <button className="instances-drawer__confirm-danger" onClick={() => void confirmDelete()}>
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {duplicateTarget && (
        <div className="instances-drawer__confirm-overlay">
          <div className="instances-drawer__confirm-panel">
            <label className="instances-drawer__confirm-label">
              <span>Name der Kopie von "{duplicateTarget.name}"</span>
              <input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && void confirmDuplicate()}
              />
            </label>
            <div className="instances-drawer__confirm-actions">
              <button onClick={() => setDuplicateTarget(null)}>Abbrechen</button>
              <button
                className="instances-drawer__confirm-primary"
                disabled={!duplicateName.trim()}
                onClick={() => void confirmDuplicate()}
              >
                Duplizieren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
