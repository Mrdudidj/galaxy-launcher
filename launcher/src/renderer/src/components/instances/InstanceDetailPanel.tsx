import { useEffect, useRef, useState } from "react";
import type { Instance } from "@galaxy-launcher/shared-types";
import type { ModSuggestion, ServerEntry } from "../../../../shared/instance";
import { useLaunchStore } from "../../state/launchStore";
import { DownloadButton } from "./DownloadButton";
import { InstanceSettingsPanel } from "./InstanceSettingsPanel";
import "./InstanceDetailPanel.css";

type Tab = "overview" | "mods" | "worlds" | "servers" | "resourcePacks" | "console";

const TABS: { tab: Tab; label: string }[] = [
  { tab: "overview", label: "Übersicht" },
  { tab: "mods", label: "Mods" },
  { tab: "worlds", label: "Welten" },
  { tab: "servers", label: "Server" },
  { tab: "resourcePacks", label: "Ressourcenpakete" },
  { tab: "console", label: "Konsole" }
];

async function refetchInstance(id: string): Promise<Instance | null> {
  const instances = await window.galaxy.instances.list();
  return instances.find((i) => i.id === id) ?? null;
}

function ModsTab({
  instance,
  onChanged
}: {
  instance: Instance;
  onChanged: (updated: Instance) => void;
}): React.JSX.Element {
  const [isAdding, setIsAdding] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<ModSuggestion[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    const updated = await refetchInstance(instance.id);
    if (updated) onChanged(updated);
  }

  async function handleAdd(): Promise<void> {
    setIsAdding(true);
    await window.galaxy.dialogs.addMods(instance.id);
    await refresh();
    setIsAdding(false);
  }

  async function handleRemove(fileName: string): Promise<void> {
    await window.galaxy.instances.removeMod(instance.id, fileName);
    await refresh();
  }

  async function handleAskAi(): Promise<void> {
    setIsAsking(true);
    setAiError(null);
    try {
      const suggestions = await window.galaxy.ai.suggestMods(
        instance.minecraftVersion,
        instance.mods.map((m) => m.fileName),
        aiPrompt
      );
      setAiSuggestions(suggestions);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "KI-Vorschlag fehlgeschlagen.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="instance-detail-panel__tab-content">
      {instance.mods.length === 0 && <p className="instance-detail-panel__hint">Noch keine Mods.</p>}
      <div className="instance-detail-panel__list">
        {instance.mods.map((mod) => (
          <div className="instance-detail-panel__list-item" key={mod.fileName}>
            <span>{mod.fileName}</span>
            <button onClick={() => void handleRemove(mod.fileName)}>✕</button>
          </div>
        ))}
      </div>
      <button className="instance-detail-panel__add-button" onClick={() => void handleAdd()} disabled={isAdding}>
        {isAdding ? "Öffne Dateiauswahl…" : "+ Mod-Datei hinzufügen"}
      </button>

      <div className="instance-detail-panel__ai">
        <span className="instance-detail-panel__ai-label">✨ KI-Mod-Vorschlag</span>
        <div className="instance-detail-panel__ai-row">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="z. B. mehr Baumods, Performance-Mods…"
            onKeyDown={(e) => e.key === "Enter" && void handleAskAi()}
          />
          <button onClick={() => void handleAskAi()} disabled={isAsking}>
            {isAsking ? "Frage KI…" : "Vorschlagen"}
          </button>
        </div>
        {aiError && <p className="instance-detail-panel__ai-error">{aiError}</p>}
        {aiSuggestions.length > 0 && (
          <div className="instance-detail-panel__ai-suggestions">
            {aiSuggestions.map((s) => (
              <div className="instance-detail-panel__ai-suggestion" key={s.name}>
                <strong>{s.name}</strong>
                <span>{s.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorldsTab({ instance }: { instance: Instance }): React.JSX.Element {
  const [worlds, setWorlds] = useState<string[] | null>(null);

  useEffect(() => {
    void window.galaxy.instances.listWorlds(instance.id).then(setWorlds);
  }, [instance.id]);

  return (
    <div className="instance-detail-panel__tab-content">
      {worlds === null && <p className="instance-detail-panel__hint">Lade Welten…</p>}
      {worlds?.length === 0 && <p className="instance-detail-panel__hint">Noch keine Welten gespielt.</p>}
      <div className="instance-detail-panel__list">
        {worlds?.map((world) => (
          <div className="instance-detail-panel__list-item" key={world}>
            <span>{world}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServersTab({ instance }: { instance: Instance }): React.JSX.Element {
  const [servers, setServers] = useState<ServerEntry[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void window.galaxy.instances.readServers(instance.id).then(setServers);
  }, [instance.id]);

  async function persist(next: ServerEntry[]): Promise<void> {
    setServers(next);
    setIsSaving(true);
    await window.galaxy.instances.writeServers(instance.id, next);
    setIsSaving(false);
  }

  function handleAdd(): void {
    if (!name.trim() || !address.trim()) return;
    void persist([...servers, { name: name.trim(), address: address.trim() }]);
    setName("");
    setAddress("");
  }

  function handleRemove(index: number): void {
    void persist(servers.filter((_, i) => i !== index));
  }

  return (
    <div className="instance-detail-panel__tab-content">
      {servers.length === 0 && <p className="instance-detail-panel__hint">Noch keine Server.</p>}
      <div className="instance-detail-panel__list">
        {servers.map((server, i) => (
          <div className="instance-detail-panel__list-item" key={`${server.name}-${i}`}>
            <span>
              {server.name} — {server.address}
            </span>
            <button onClick={() => handleRemove(i)}>✕</button>
          </div>
        ))}
      </div>
      <div className="instance-detail-panel__server-form">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Servername" />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="IP oder Adresse"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button onClick={handleAdd} disabled={isSaving}>
          + Hinzufügen
        </button>
      </div>
    </div>
  );
}

function ResourcePacksTab({
  instance,
  onChanged
}: {
  instance: Instance;
  onChanged: (updated: Instance) => void;
}): React.JSX.Element {
  const [isAdding, setIsAdding] = useState(false);

  async function refresh(): Promise<void> {
    const updated = await refetchInstance(instance.id);
    if (updated) onChanged(updated);
  }

  async function handleAdd(): Promise<void> {
    setIsAdding(true);
    await window.galaxy.dialogs.addResourcePacks(instance.id);
    await refresh();
    setIsAdding(false);
  }

  async function handleRemove(fileName: string): Promise<void> {
    await window.galaxy.instances.removeResourcePack(instance.id, fileName);
    await refresh();
  }

  return (
    <div className="instance-detail-panel__tab-content">
      {instance.resourcePacks.length === 0 && (
        <p className="instance-detail-panel__hint">Noch keine Ressourcenpakete.</p>
      )}
      <div className="instance-detail-panel__list">
        {instance.resourcePacks.map((pack) => (
          <div className="instance-detail-panel__list-item" key={pack.fileName}>
            <span>{pack.fileName}</span>
            <button onClick={() => void handleRemove(pack.fileName)}>✕</button>
          </div>
        ))}
      </div>
      <button className="instance-detail-panel__add-button" onClick={() => void handleAdd()} disabled={isAdding}>
        {isAdding ? "Öffne Dateiauswahl…" : "+ Ressourcenpaket hinzufügen"}
      </button>
    </div>
  );
}

function ConsoleTab({
  instance,
  onChanged
}: {
  instance: Instance;
  onChanged: (updated: Instance) => void;
}): React.JSX.Element {
  const phase = useLaunchStore((s) => s.phase);
  const logs = useLaunchStore((s) => s.logs);
  const javaProgress = useLaunchStore((s) => s.javaProgress);
  const errorMessage = useLaunchStore((s) => s.errorMessage);
  const activeInstanceId = useLaunchStore((s) => s.activeInstanceId);
  const start = useLaunchStore((s) => s.start);
  const stop = useLaunchStore((s) => s.stop);
  const logEndRef = useRef<HTMLDivElement>(null);

  const isThis = activeInstanceId === instance.id;
  const isBusy = isThis && (phase === "starting" || phase === "downloading-java");
  const isRunning = isThis && phase === "running";
  const isOtherActive =
    activeInstanceId !== null &&
    !isThis &&
    (phase === "starting" || phase === "downloading-java" || phase === "running");
  const isDownloaded = instance.resolvedVersionId != null;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [logs]);

  let label = "▶ Starten";
  let disabled = false;
  let hint = "";

  if (!isDownloaded) {
    hint = "Diese Instanz muss zuerst heruntergeladen werden.";
  } else if (isOtherActive) {
    disabled = true;
    hint = "Es läuft bereits eine andere Instanz.";
  } else if (isRunning) {
    label = "■ Beenden";
  } else if (isBusy) {
    disabled = true;
    if (phase === "downloading-java") {
      const pct = javaProgress && javaProgress.total > 0 ? Math.round((javaProgress.downloaded / javaProgress.total) * 100) : 0;
      label = `Java wird geladen… ${pct}%`;
    } else {
      label = "Wird gestartet…";
    }
  } else {
    if (isThis && phase === "crashed") hint = "Das Spiel ist abgestürzt — siehe Log unten.";
    if (isThis && phase === "error" && errorMessage) hint = errorMessage;
  }

  function handleClick(): void {
    if (isRunning) {
      void stop();
    } else {
      void start(instance.id);
    }
  }

  async function handleDownloaded(): Promise<void> {
    const updated = await refetchInstance(instance.id);
    if (updated) onChanged(updated);
  }

  return (
    <div className="instance-detail-panel__tab-content">
      <div className="instance-detail-panel__console-controls">
        {isDownloaded ? (
          <button className="instance-detail-panel__console-start" onClick={handleClick} disabled={disabled}>
            {label}
          </button>
        ) : (
          <DownloadButton
            instanceId={instance.id}
            minecraftVersion={instance.minecraftVersion}
            modLoader={instance.modLoader}
            isDownloaded={false}
            onDownloaded={() => void handleDownloaded()}
          />
        )}
        {hint && <span className="instance-detail-panel__hint">{hint}</span>}
      </div>
      <div className="instance-detail-panel__console">
        {!isThis && (
          <div className="instance-detail-panel__console-line instance-detail-panel__console-line--muted">
            Noch keine Ausgabe für diese Instanz — starte sie, um den Log hier live zu sehen.
          </div>
        )}
        {isThis && logs.length === 0 && (
          <div className="instance-detail-panel__console-line instance-detail-panel__console-line--muted">
            Warte auf Ausgabe…
          </div>
        )}
        {isThis &&
          logs.map((line, i) => (
            <div key={i} className="instance-detail-panel__console-line">
              {line}
            </div>
          ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

export function InstanceDetailPanel({
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
  const [tab, setTab] = useState<Tab>("overview");
  const [current, setCurrent] = useState(instance);

  function handleUpdated(updated: Instance): void {
    setCurrent(updated);
    onSaved(updated);
  }

  return (
    <div className="instance-detail-panel" onClick={(e) => e.stopPropagation()}>
      <div className="instance-detail-panel__header">
        <h4>{current.name}</h4>
        <button className="instance-detail-panel__close" onClick={onClose} title="Schließen">
          ✕
        </button>
      </div>

      <div className="instance-detail-panel__tabs">
        {TABS.map((t) => (
          <button
            key={t.tab}
            className={tab === t.tab ? "active" : ""}
            onClick={() => setTab(t.tab)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="instance-detail-panel__body">
        {tab === "overview" && (
          <InstanceSettingsPanel
            instance={current}
            existingGroups={existingGroups}
            onClose={onClose}
            onSaved={handleUpdated}
            onDuplicate={onDuplicate}
            onCreateShortcut={onCreateShortcut}
            onDelete={onDelete}
          />
        )}
        {tab === "mods" && <ModsTab instance={current} onChanged={handleUpdated} />}
        {tab === "worlds" && <WorldsTab instance={current} />}
        {tab === "servers" && <ServersTab instance={current} />}
        {tab === "resourcePacks" && <ResourcePacksTab instance={current} onChanged={handleUpdated} />}
        {tab === "console" && <ConsoleTab instance={current} onChanged={handleUpdated} />}
      </div>
    </div>
  );
}
