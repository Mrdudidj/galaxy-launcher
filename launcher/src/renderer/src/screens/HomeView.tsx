import { useEffect, useRef } from "react";
import { GlowingName } from "../components/economy/GlowingName";
import { PlayButton } from "../components/play/PlayButton";
import { SkinViewer3D } from "../components/skin/SkinViewer3D";
import { useEconomy } from "../api/useEconomy";
import { useAuthStore } from "../state/authStore";
import { useInstancesStore } from "../state/instancesStore";
import { useLaunchStore } from "../state/launchStore";
import { useViewStore, type AppView } from "../state/viewStore";
import "./HomeView.css";

const QUICK_ACCESS: { view: AppView; glyph: string; label: string }[] = [
  { view: "shop", glyph: "$", label: "Shop" },
  { view: "locker", glyph: "▤", label: "Spind" },
  { view: "skinEditor", glyph: "◐", label: "Skin-Editor" },
  { view: "founders", glyph: "🪐", label: "Gründer" }
];

export function HomeView(): React.JSX.Element {
  const instances = useInstancesStore((s) => s.instances);
  const selectedInstanceId = useInstancesStore((s) => s.selectedInstanceId);
  const isInstancesOpen = useViewStore((s) => s.isInstancesOpen);
  const openInstances = useViewStore((s) => s.openInstances);
  const setView = useViewStore((s) => s.setView);
  const playerName = useAuthStore((s) => s.playerName);
  const isDevBypass = useAuthStore((s) => s.isDevBypass);
  const skinUrl = useAuthStore((s) => s.skinUrl);
  const glowColor = useAuthStore((s) => s.glowColor);
  const { data: economy } = useEconomy();
  const phase = useLaunchStore((s) => s.phase);
  const logs = useLaunchStore((s) => s.logs);
  const javaProgress = useLaunchStore((s) => s.javaProgress);
  const errorMessage = useLaunchStore((s) => s.errorMessage);
  const start = useLaunchStore((s) => s.start);
  const stop = useLaunchStore((s) => s.stop);
  const logEndRef = useRef<HTMLDivElement>(null);

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId) ?? null;
  const isDownloaded = selectedInstance?.resolvedVersionId != null;
  const isBusy = phase === "starting" || phase === "downloading-java";
  const isRunning = phase === "running";

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [logs]);

  useEffect(() => {
    // No-ops in the main process when Discord isn't connected, so this is safe
    // to call unconditionally rather than tracking connection state here too.
    if (isRunning && selectedInstance) {
      void window.galaxy.discord.setActivity("Spielt Minecraft", `${selectedInstance.name} · ${selectedInstance.minecraftVersion}`);
    } else if (isBusy && selectedInstance) {
      void window.galaxy.discord.setActivity("Startet Minecraft…", selectedInstance.name);
    } else if (selectedInstance) {
      void window.galaxy.discord.setActivity("Im Launcher", `${selectedInstance.name} ausgewählt`);
    } else {
      void window.galaxy.discord.setActivity("Im Launcher", "Wählt eine Instanz");
    }
  }, [selectedInstance?.id, selectedInstance?.name, selectedInstance?.minecraftVersion, isRunning, isBusy]);

  let playLabel = "Spielen";
  let playDisabled = false;
  let hint = "";

  if (isDevBypass) {
    playLabel = "Start folgt bald";
    playDisabled = true;
    hint = "Das eigentliche Starten kommt, sobald du dich mit einem echten Microsoft-Konto anmeldest.";
  } else if (!selectedInstance) {
    playLabel = "Spielen";
    playDisabled = true;
    hint = "Wähle zuerst eine Instanz aus.";
  } else if (!isDownloaded) {
    playLabel = "Erst herunterladen";
    playDisabled = true;
    hint = "Diese Instanz muss zuerst heruntergeladen werden (Instanzen-Ansicht).";
  } else if (isRunning) {
    playLabel = "■ Beenden";
    playDisabled = false;
  } else if (phase === "starting") {
    playLabel = "Wird gestartet…";
    playDisabled = true;
  } else if (phase === "downloading-java") {
    const pct = javaProgress && javaProgress.total > 0 ? Math.round((javaProgress.downloaded / javaProgress.total) * 100) : 0;
    playLabel = `Java wird geladen… ${pct}%`;
    playDisabled = true;
  } else {
    playLabel = "▶ Spielen";
    playDisabled = false;
    if (phase === "crashed") hint = "Das Spiel ist abgestürzt — siehe Log unten.";
    if (phase === "error" && errorMessage) hint = errorMessage;
  }

  function handlePlayClick(): void {
    if (isRunning) {
      void stop();
    } else if (selectedInstance) {
      void start(selectedInstance.id);
    }
  }

  return (
    <div className="home-view">
      <div className="home-view__hero">
        <div
          className="home-view__skin-frame"
          style={glowColor ? ({ "--glow-color": glowColor } as React.CSSProperties) : undefined}
        >
          <SkinViewer3D skinUrl={skinUrl} width={200} height={420} />
        </div>

        <div className="home-view__play-overlay">
          {!isInstancesOpen && <PlayButton label={playLabel} disabled={playDisabled} onClick={handlePlayClick} />}
          <span className="home-view__player-name">
            <GlowingName name={playerName ?? ""} glowColor={economy?.nameGlowColor ?? null} />
          </span>
        </div>
      </div>

      <div className="home-view__center">
        {hint && <p className="home-view__hint">{hint}</p>}

        {selectedInstance ? (
          <button className="home-view__instance-pill" onClick={openInstances}>
            {selectedInstance.name} · {selectedInstance.minecraftVersion}
          </button>
        ) : (
          <button className="home-view__instance-pill home-view__instance-pill--muted" onClick={openInstances}>
            Keine Instanz ausgewählt
          </button>
        )}

        {(isBusy || isRunning || logs.length > 0) && (
          <div className="home-view__log">
            {logs.map((line, i) => (
              <div key={i} className="home-view__log-line">
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {!isInstancesOpen && (
          <div className="home-view__quick-access">
            {QUICK_ACCESS.map((item) => (
              <button key={item.view} className="home-view__quick-card" onClick={() => setView(item.view)}>
                <span className="home-view__quick-glyph">{item.glyph}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
