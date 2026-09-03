import { useEffect, useRef, useState } from "react";
import type { MinecraftVersionSummary } from "../../../shared/minecraft";
import type { ServerConfig, ServerNetworkInfo, ServerProperties } from "../../../shared/server";
import "./ServerView.css";

function CreateServerForm({ onCreated }: { onCreated: (config: ServerConfig) => void }): React.JSX.Element {
  const [versions, setVersions] = useState<MinecraftVersionSummary[]>([]);
  const [name, setName] = useState("Mein Server");
  const [minecraftVersion, setMinecraftVersion] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.galaxy.versions.list().then((list) => {
      setVersions(list);
      setMinecraftVersion((current) => current || (list[0]?.id ?? ""));
    });
  }, []);

  async function handleCreate(): Promise<void> {
    if (!name.trim() || !minecraftVersion) return;
    setCreating(true);
    setError(null);
    try {
      const config = await window.galaxy.server.create(name.trim(), minecraftVersion);
      onCreated(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Server konnte nicht erstellt werden.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="server-view__panel">
      <h3>Eigenen Server eröffnen</h3>
      <p className="server-view__hint">
        Ein echter, offizieller Minecraft-Server — kostenlos, läuft auf diesem Rechner. Freunde im selben Netzwerk
        können sofort beitreten; für Freunde außerhalb braucht es zusätzlich Portweiterleitung an deinem Router.
      </p>
      <div className="server-view__row">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mein Server" />
        </label>
        <label>
          Minecraft-Version
          <select value={minecraftVersion} onChange={(e) => setMinecraftVersion(e.target.value)}>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="server-view__error">{error}</p>}
      <button className="server-view__primary-button" onClick={() => void handleCreate()} disabled={creating || !name.trim()}>
        {creating ? "Erstelle…" : "Server erstellen"}
      </button>
    </div>
  );
}

function EulaGate({ config, onAccepted }: { config: ServerConfig; onAccepted: (config: ServerConfig) => void }): React.JSX.Element {
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);

  async function handleAccept(): Promise<void> {
    setAccepting(true);
    const updated = await window.galaxy.server.acceptEula();
    onAccepted(updated);
    setAccepting(false);
  }

  return (
    <div className="server-view__panel">
      <h3>Minecraft-Server-EULA</h3>
      <p className="server-view__hint">
        Bevor der Server-Prozess startet, muss die echte Minecraft End User License Agreement bestätigt werden — das
        verlangt Mojang von jedem, der einen Server betreibt, genau wie beim offiziellen Server-Download.
      </p>
      <p className="server-view__hint">
        Volltext: <a href="https://aka.ms/MinecraftEULA" target="_blank" rel="noopener noreferrer">aka.ms/MinecraftEULA</a>
      </p>
      <label className="server-view__checkbox">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        Ich akzeptiere die Minecraft-EULA für „{config.name}".
      </label>
      <button className="server-view__primary-button" onClick={() => void handleAccept()} disabled={!checked || accepting}>
        {accepting ? "…" : "Akzeptieren & weiter"}
      </button>
    </div>
  );
}

function JarDownloadGate({ config, onReady }: { config: ServerConfig; onReady: (config: ServerConfig) => void }): React.JSX.Element {
  const [progress, setProgress] = useState<{ downloaded: number; total: number } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return window.galaxy.server.onJarProgress((downloaded, total) => setProgress({ downloaded, total }));
  }, []);

  async function handleDownload(): Promise<void> {
    setDownloading(true);
    setError(null);
    try {
      const updated = await window.galaxy.server.downloadJar(config.minecraftVersion);
      onReady(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download fehlgeschlagen.");
    } finally {
      setDownloading(false);
    }
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.downloaded / progress.total) * 100) : 0;

  return (
    <div className="server-view__panel">
      <h3>Server-Software herunterladen</h3>
      <p className="server-view__hint">
        Der echte, offizielle Server-Download von Mojang für Version {config.minecraftVersion} — geprüft per
        Prüfsumme, genau wie beim normalen Spiel-Download.
      </p>
      {error && <p className="server-view__error">{error}</p>}
      <button className="server-view__primary-button" onClick={() => void handleDownload()} disabled={downloading}>
        {downloading ? `Lädt… ${pct}%` : "Herunterladen"}
      </button>
    </div>
  );
}

function ServerControlPanel({
  config,
  onConfigChanged,
  onDeleted
}: {
  config: ServerConfig;
  onConfigChanged: (config: ServerConfig) => void;
  onDeleted: () => void;
}): React.JSX.Element {
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [networkInfo, setNetworkInfo] = useState<ServerNetworkInfo | null>(null);
  const [properties, setProperties] = useState<ServerProperties>(config.properties);
  const [savedHint, setSavedHint] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void window.galaxy.server.isRunning().then(setRunning);
    void window.galaxy.server.networkInfo(config.properties.port).then(setNetworkInfo);
  }, [config.properties.port]);

  useEffect(() => {
    const offLog = window.galaxy.server.onLog((line) => setLogs((s) => [...s.slice(-499), line]));
    const offExit = window.galaxy.server.onExit((info) => {
      setRunning(false);
      setStarting(false);
      // A crash can mean the backend self-healed a bad jar (see
      // serverProcess.ts) by resetting jarReady — re-fetch so the UI
      // notices and routes back to the download step instead of showing
      // a dead "Server starten" button forever.
      if (info.crashed) void window.galaxy.server.get().then((updated) => updated && onConfigChanged(updated));
    });
    return () => {
      offLog();
      offExit();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [logs]);

  async function handleStart(): Promise<void> {
    setStarting(true);
    setLogs([]);
    try {
      await window.galaxy.server.start();
      setRunning(true);
    } catch (err) {
      setLogs((s) => [...s, err instanceof Error ? err.message : "Start fehlgeschlagen."]);
    } finally {
      setStarting(false);
    }
  }

  async function handleStop(): Promise<void> {
    await window.galaxy.server.stop();
  }

  async function handleSaveProperties(): Promise<void> {
    const updated = await window.galaxy.server.updateProperties(properties);
    onConfigChanged(updated);
    setSavedHint(true);
    setTimeout(() => setSavedHint(false), 2000);
  }

  async function handleDelete(): Promise<void> {
    await window.galaxy.server.delete();
    onDeleted();
  }

  return (
    <div className="server-view__layout">
      <div className="server-view__panel">
        <div className="server-view__row server-view__row--between">
          <h3>{config.name}</h3>
          <button
            className={running ? "server-view__stop-button" : "server-view__primary-button"}
            onClick={() => void (running ? handleStop() : handleStart())}
            disabled={starting}
          >
            {running ? "■ Server stoppen" : starting ? "Startet…" : "▶ Server starten"}
          </button>
        </div>

        {networkInfo && (
          <div className="server-view__network">
            <span className="server-view__section-label">Wie treten Freunde bei?</span>
            <p className="server-view__hint">
              Im selben Netzwerk: {networkInfo.localAddresses.length > 0 ? networkInfo.localAddresses[0] : "localhost"}
              :{networkInfo.port}
            </p>
            <p className="server-view__hint">
              Von außerhalb: dein Router braucht Portweiterleitung für Port {networkInfo.port} (TCP) auf diesen
              Rechner — das kann diese App nicht automatisch einrichten, das läuft über die Router-Oberfläche.
            </p>
          </div>
        )}

        <div className="server-view__console">
          {logs.length === 0 && <div className="server-view__console-line server-view__console-line--muted">Noch keine Ausgabe.</div>}
          {logs.map((line, i) => (
            <div key={i} className="server-view__console-line">
              {line}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      <div className="server-view__panel">
        <h3>Einstellungen</h3>
        <div className="server-view__row">
          <label>
            MOTD
            <input value={properties.motd} onChange={(e) => setProperties({ ...properties, motd: e.target.value })} />
          </label>
        </div>
        <div className="server-view__row">
          <label>
            Schwierigkeit
            <select
              value={properties.difficulty}
              onChange={(e) => setProperties({ ...properties, difficulty: e.target.value as ServerProperties["difficulty"] })}
            >
              <option value="peaceful">Friedlich</option>
              <option value="easy">Einfach</option>
              <option value="normal">Normal</option>
              <option value="hard">Schwer</option>
            </select>
          </label>
          <label>
            Spielmodus
            <select
              value={properties.gamemode}
              onChange={(e) => setProperties({ ...properties, gamemode: e.target.value as ServerProperties["gamemode"] })}
            >
              <option value="survival">Überleben</option>
              <option value="creative">Kreativ</option>
              <option value="adventure">Abenteuer</option>
              <option value="spectator">Zuschauer</option>
            </select>
          </label>
        </div>
        <div className="server-view__row">
          <label>
            Max. Spieler
            <input
              type="number"
              min={1}
              value={properties.maxPlayers}
              onChange={(e) => setProperties({ ...properties, maxPlayers: Number(e.target.value) })}
            />
          </label>
          <label>
            Port
            <input
              type="number"
              value={properties.port}
              onChange={(e) => setProperties({ ...properties, port: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="server-view__row">
          <label className="server-view__checkbox">
            <input type="checkbox" checked={properties.pvp} onChange={(e) => setProperties({ ...properties, pvp: e.target.checked })} />
            PvP erlaubt
          </label>
          <label className="server-view__checkbox">
            <input
              type="checkbox"
              checked={properties.whitelist}
              onChange={(e) => setProperties({ ...properties, whitelist: e.target.checked })}
            />
            Nur Whitelist
          </label>
        </div>
        <div className="server-view__row">
          <button className="server-view__primary-button" onClick={() => void handleSaveProperties()}>
            Speichern
          </button>
          {savedHint && <span className="server-view__saved-hint">Gespeichert — wirkt beim nächsten Start.</span>}
        </div>
        <p className="server-view__hint">Änderungen gelten erst nach einem Neustart des Servers.</p>

        <div className="server-view__danger-zone">
          {!confirmingDelete ? (
            <button className="server-view__danger-button" onClick={() => setConfirmingDelete(true)} disabled={running}>
              Server löschen
            </button>
          ) : (
            <div className="server-view__row">
              <span className="server-view__hint">Wirklich löschen? Die Welt geht unwiderruflich verloren.</span>
              <button className="server-view__danger-button" onClick={() => void handleDelete()}>
                Ja, endgültig löschen
              </button>
              <button onClick={() => setConfirmingDelete(false)}>Abbrechen</button>
            </div>
          )}
          {running && <p className="server-view__hint">Stoppe zuerst den Server, um ihn löschen zu können.</p>}
        </div>
      </div>
    </div>
  );
}

export function ServerView(): React.JSX.Element {
  const [config, setConfig] = useState<ServerConfig | null | undefined>(undefined);

  useEffect(() => {
    void window.galaxy.server.get().then(setConfig);
  }, []);

  if (config === undefined) {
    return (
      <div className="server-view">
        <h2>Server</h2>
      </div>
    );
  }

  return (
    <div className="server-view">
      <h2>Server</h2>
      <p className="server-view__hint">Dein eigener, kostenloser Minecraft-Server — direkt auf diesem Rechner.</p>

      {!config && <CreateServerForm onCreated={setConfig} />}
      {config && !config.eulaAccepted && <EulaGate config={config} onAccepted={setConfig} />}
      {config && config.eulaAccepted && !config.jarReady && <JarDownloadGate config={config} onReady={setConfig} />}
      {config && config.eulaAccepted && config.jarReady && (
        <ServerControlPanel config={config} onConfigChanged={setConfig} onDeleted={() => setConfig(null)} />
      )}
    </div>
  );
}
