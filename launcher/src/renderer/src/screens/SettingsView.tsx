import { useEffect, useState } from "react";
import { RankBadge } from "../components/economy/RankBadge";
import { useEconomy } from "../api/useEconomy";
import type { SpotifyControlAction } from "../../../shared/spotify";
import "./SettingsView.css";

const CONTROL_ACTION_LABELS: Record<SpotifyControlAction, string> = {
  playPause: "Play/Pause",
  next: "Weiter",
  previous: "Zurück",
  volumeUp: "Lauter",
  volumeDown: "Leiser",
  none: "Nichts"
};

export function SettingsView(): React.JSX.Element {
  const { data: economy } = useEconomy();
  const [defaultMods, setDefaultMods] = useState<string[]>([]);
  const [isPicking, setIsPicking] = useState(false);

  const [hasAiKey, setHasAiKey] = useState(false);
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [aiKeyMessage, setAiKeyMessage] = useState<string | null>(null);

  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [discordConfigured, setDiscordConfigured] = useState(true);
  const [discordStatus, setDiscordStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [discordError, setDiscordError] = useState<string | null>(null);

  const [spotifyWidgetVisible, setSpotifyWidgetVisible] = useState(false);
  const [pinHotkeyInput, setPinHotkeyInput] = useState("Control+Shift+M");
  const [pinHotkeyMessage, setPinHotkeyMessage] = useState<string | null>(null);

  const [hasSpotifySecret, setHasSpotifySecret] = useState(false);
  const [spotifySecretInput, setSpotifySecretInput] = useState("");
  const [spotifySecretMessage, setSpotifySecretMessage] = useState<string | null>(null);

  const [controlKeyInput, setControlKeyInput] = useState("B");
  const [controlKeyMessage, setControlKeyMessage] = useState<string | null>(null);
  const [pressActions, setPressActions] = useState<{
    single: SpotifyControlAction;
    double: SpotifyControlAction;
    triple: SpotifyControlAction;
  }>({ single: "playPause", double: "next", triple: "previous" });

  const [launchCommandInput, setLaunchCommandInput] = useState("spotify");
  const [launchCommandMessage, setLaunchCommandMessage] = useState<string | null>(null);

  useEffect(() => {
    void window.galaxy.settings.get().then((settings) => {
      setDefaultMods(settings.defaultMods);
      setDiscordEnabled(settings.discordRpc.enabled);
      setSpotifyWidgetVisible(settings.spotify.widgetVisible);
      setPinHotkeyInput(settings.spotify.pinHotkey);
      setControlKeyInput(settings.spotify.controlKey);
      setPressActions(settings.spotify.pressActions);
      setLaunchCommandInput(settings.spotify.launchCommand);
    });
    void window.galaxy.ai.hasKey().then(setHasAiKey);
    void window.galaxy.discord.isConfigured().then(setDiscordConfigured);
    void window.galaxy.discord.isConnected().then((connected) => {
      if (connected) setDiscordStatus("connected");
    });
    void window.galaxy.spotify.hasClientSecret().then(setHasSpotifySecret);
  }, []);

  async function handleSaveAiKey(): Promise<void> {
    if (!aiKeyInput.trim()) return;
    await window.galaxy.ai.setKey(aiKeyInput.trim());
    setAiKeyInput("");
    setHasAiKey(true);
    setAiKeyMessage("Gespeichert.");
    setTimeout(() => setAiKeyMessage(null), 2000);
  }

  async function handleClearAiKey(): Promise<void> {
    await window.galaxy.ai.clearKey();
    setHasAiKey(false);
  }

  async function handleToggleDiscord(enabled: boolean): Promise<void> {
    setDiscordEnabled(enabled);
    await window.galaxy.settings.updateDiscordRpc({ enabled });
    setDiscordError(null);

    if (!enabled) {
      await window.galaxy.discord.disconnect();
      setDiscordStatus("idle");
      return;
    }

    setDiscordStatus("connecting");
    const result = await window.galaxy.discord.connect();
    if (result.connected) {
      setDiscordStatus("connected");
      await window.galaxy.discord.setActivity("Im Launcher", "Galaxy Launcher");
    } else {
      setDiscordStatus("error");
      setDiscordError(result.error ?? "Verbindung fehlgeschlagen.");
    }
  }

  async function handleSaveSpotifySecret(): Promise<void> {
    if (!spotifySecretInput.trim()) return;
    await window.galaxy.spotify.setClientSecret(spotifySecretInput.trim());
    setSpotifySecretInput("");
    setHasSpotifySecret(true);
    setSpotifySecretMessage("Gespeichert.");
    setTimeout(() => setSpotifySecretMessage(null), 2000);
  }

  async function handleClearSpotifySecret(): Promise<void> {
    await window.galaxy.spotify.clearClientSecret();
    setHasSpotifySecret(false);
  }

  async function handleSaveControlKey(): Promise<void> {
    const ok = await window.galaxy.spotify.setControlKey(controlKeyInput.trim());
    setControlKeyMessage(ok ? "Gespeichert." : "Diese Tastenkombination ist bereits belegt.");
    setTimeout(() => setControlKeyMessage(null), 2500);
  }

  async function handlePressActionChange(
    slot: "single" | "double" | "triple",
    action: SpotifyControlAction
  ): Promise<void> {
    const next = { ...pressActions, [slot]: action };
    setPressActions(next);
    await window.galaxy.settings.updateSpotify({ pressActions: next });
  }

  async function handleSaveLaunchCommand(): Promise<void> {
    await window.galaxy.settings.updateSpotify({ launchCommand: launchCommandInput.trim() || "spotify" });
    setLaunchCommandMessage("Gespeichert.");
    setTimeout(() => setLaunchCommandMessage(null), 2000);
  }

  async function handleToggleSpotifyWidget(visible: boolean): Promise<void> {
    setSpotifyWidgetVisible(visible);
    if (visible) {
      await window.galaxy.spotify.showWidget();
    } else {
      await window.galaxy.spotify.hideWidget();
    }
  }

  async function handleSavePinHotkey(): Promise<void> {
    const ok = await window.galaxy.spotify.setPinHotkey(pinHotkeyInput.trim());
    setPinHotkeyMessage(ok ? "Gespeichert." : "Diese Tastenkombination ist bereits belegt.");
    setTimeout(() => setPinHotkeyMessage(null), 2500);
  }

  async function handleAdd(): Promise<void> {
    setIsPicking(true);
    const settings = await window.galaxy.dialogs.pickDefaultMod();
    if (settings) setDefaultMods(settings.defaultMods);
    setIsPicking(false);
  }

  async function handleRemove(filePath: string): Promise<void> {
    const settings = await window.galaxy.settings.removeDefaultMod(filePath);
    setDefaultMods(settings.defaultMods);
  }

  return (
    <div className="settings-view">
      <h2>Einstellungen</h2>

      <section className="settings-view__section">
        <h3>Standard-Mods</h3>
        <p className="settings-view__hint">
          Diese Mods werden automatisch in jede neue Instanz übernommen, damit du sie nicht jedes Mal neu
          hinzufügen musst.
        </p>

        {defaultMods.length > 0 && (
          <div className="settings-view__list">
            {defaultMods.map((path) => (
              <div className="settings-view__list-item" key={path}>
                <span className="settings-view__list-item-name" title={path}>
                  {path.split(/[/\\]/).pop()}
                </span>
                <button className="settings-view__list-remove" onClick={() => void handleRemove(path)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="settings-view__add-button" onClick={() => void handleAdd()} disabled={isPicking}>
          {isPicking ? "Öffne Dateiauswahl…" : "+ Mod hinzufügen"}
        </button>
      </section>

      <section className="settings-view__section">
        <h3>Dein Rang {economy?.rank && economy.rank !== "member" && <RankBadge rank={economy.rank} />}</h3>
        <p className="settings-view__hint">
          Mitglied: voller Zugriff auf den Shop zum normalen Preis. VIP: 40&nbsp;% Rabatt auf alles, plus
          VIP-exklusive Kleidung (goldener Rahmen im Shop). Owner: alles im Shop kostenlos.
        </p>
      </section>

      <section className="settings-view__section">
        <h3>KI-Mod-Vorschläge</h3>
        <p className="settings-view__hint">
          Hinterlege einen Anthropic-API-Schlüssel, um im Instanz-Assistenten KI-Mod-Vorschläge zu bekommen. Wird
          verschlüsselt gespeichert, niemals im Klartext.
        </p>
        {hasAiKey ? (
          <div className="settings-view__list-item">
            <span className="settings-view__list-item-name">✓ Schlüssel hinterlegt</span>
            <button className="settings-view__list-remove" onClick={() => void handleClearAiKey()}>
              Entfernen
            </button>
          </div>
        ) : (
          <div className="settings-view__inline-row">
            <input
              type="password"
              value={aiKeyInput}
              onChange={(e) => setAiKeyInput(e.target.value)}
              placeholder="sk-ant-…"
            />
            <button className="settings-view__add-button" onClick={() => void handleSaveAiKey()}>
              Speichern
            </button>
          </div>
        )}
        {aiKeyMessage && <span className="settings-view__saved-hint">{aiKeyMessage}</span>}
      </section>

      <section className="settings-view__section">
        <h3>Discord-Status</h3>
        <p className="settings-view__hint">
          Zeigt anderen, was du gerade spielst — sobald ein Discord-Client lokal läuft. Aktualisiert sich
          automatisch mit deiner ausgewählten Instanz.
        </p>
        {discordConfigured ? (
          <>
            <label className="settings-view__toggle">
              <input
                type="checkbox"
                checked={discordEnabled}
                onChange={(e) => void handleToggleDiscord(e.target.checked)}
              />
              Aktiv
            </label>
            <span className={`settings-view__status settings-view__status--${discordStatus}`}>
              {discordStatus === "connected" && "● Verbunden"}
              {discordStatus === "connecting" && "○ Verbinde…"}
              {discordStatus === "idle" && "○ Getrennt"}
              {discordStatus === "error" && `✕ ${discordError}`}
            </span>
          </>
        ) : (
          <p className="settings-view__hint">Noch nicht eingerichtet.</p>
        )}
      </section>

      <section className="settings-view__section">
        <h3>Spotify</h3>
        <p className="settings-view__hint">
          Steuert die lokal laufende Spotify-Desktop-App direkt (MPRIS/D-Bus) — dasselbe, was auch Medientasten
          nutzen. Läuft ohne Anmeldung; braucht Spotify offen auf diesem Rechner. Ein Client-Secret (kostenlose
          Spotify-Developer-App) wird nur für die Songsuche gebraucht.
        </p>

        <label className="settings-view__toggle">
          <input
            type="checkbox"
            checked={spotifyWidgetVisible}
            onChange={(e) => void handleToggleSpotifyWidget(e.target.checked)}
          />
          Fenster anzeigen
        </label>

        <div className="settings-view__inline-row">
          <input
            value={pinHotkeyInput}
            onChange={(e) => setPinHotkeyInput(e.target.value)}
            placeholder="z. B. Control+Shift+M"
          />
          <button className="settings-view__add-button" onClick={() => void handleSavePinHotkey()}>
            Taste zum Fixieren/Lösen speichern
          </button>
        </div>
        {pinHotkeyMessage && <span className="settings-view__saved-hint">{pinHotkeyMessage}</span>}

        <h4>Steuerungstaste</h4>
        <p className="settings-view__hint">
          Eine Taste, mehrfach drücken für unterschiedliche Aktionen — z. B. 2× für "Weiter".
        </p>
        <div className="settings-view__inline-row">
          <input value={controlKeyInput} onChange={(e) => setControlKeyInput(e.target.value)} placeholder="z. B. B" />
          <button className="settings-view__add-button" onClick={() => void handleSaveControlKey()}>
            Taste speichern
          </button>
        </div>
        {controlKeyMessage && <span className="settings-view__saved-hint">{controlKeyMessage}</span>}

        <div className="settings-view__press-actions">
          {(["single", "double", "triple"] as const).map((slot) => (
            <label key={slot} className="settings-view__press-action">
              {slot === "single" ? "1×" : slot === "double" ? "2×" : "3×"}
              <select
                value={pressActions[slot]}
                onChange={(e) => void handlePressActionChange(slot, e.target.value as SpotifyControlAction)}
              >
                {Object.entries(CONTROL_ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <h4>Spotify-Client-Secret</h4>
        <p className="settings-view__hint">Nur für die Songsuche im Fenster — aus deiner eigenen Spotify-Developer-App.</p>
        {hasSpotifySecret ? (
          <div className="settings-view__list-item">
            <span className="settings-view__list-item-name">✓ Hinterlegt</span>
            <button className="settings-view__list-remove" onClick={() => void handleClearSpotifySecret()}>
              Entfernen
            </button>
          </div>
        ) : (
          <div className="settings-view__inline-row">
            <input
              type="password"
              value={spotifySecretInput}
              onChange={(e) => setSpotifySecretInput(e.target.value)}
              placeholder="Client Secret…"
            />
            <button className="settings-view__add-button" onClick={() => void handleSaveSpotifySecret()}>
              Speichern
            </button>
          </div>
        )}
        {spotifySecretMessage && <span className="settings-view__saved-hint">{spotifySecretMessage}</span>}

        <details className="settings-view__advanced">
          <summary>Erweitert: Startbefehl</summary>
          <p className="settings-view__hint">
            Wird genutzt, um Spotify automatisch zu starten, falls es beim Abspielen noch nicht läuft. Standard
            passt für die meisten nativen Installationen — bei Flatpak/Snap ggf. anpassen.
          </p>
          <div className="settings-view__inline-row">
            <input
              value={launchCommandInput}
              onChange={(e) => setLaunchCommandInput(e.target.value)}
              placeholder="spotify"
            />
            <button className="settings-view__add-button" onClick={() => void handleSaveLaunchCommand()}>
              Speichern
            </button>
          </div>
          {launchCommandMessage && <span className="settings-view__saved-hint">{launchCommandMessage}</span>}
        </details>
      </section>

      <section className="settings-view__section">
        <h3>Account</h3>
        <p className="settings-view__hint">Microsoft-Anmeldung folgt später.</p>
      </section>
    </div>
  );
}
