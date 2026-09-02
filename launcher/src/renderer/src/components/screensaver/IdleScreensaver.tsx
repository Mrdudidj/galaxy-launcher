import { useEffect, useRef, useState } from "react";
import { GalaxyLogo } from "../brand/GalaxyLogo";
import "./IdleScreensaver.css";

// Original wording, not reproduced from any source — a short, factual
// retelling of Minecraft's history for the narrator voice-over + captions.
const STORY_LINES = [
  "Vor über zehn Jahren, im Mai 2009, begann ein schwedischer Programmierer namens Markus „Notch“ Persson mit einem kleinen Experiment.",
  "Inspiriert von Baukasten- und Simulationsspielen baute er eine Welt komplett aus Würfeln — Blöcke, die man abbauen und wieder zusammensetzen konnte.",
  "Er nannte es Minecraft. Schon in den ersten Testversionen verbreitete es sich rasend schnell, lange bevor es offiziell veröffentlicht wurde.",
  "Ein Jahr später gründete Notch das Studio Mojang, um das Spiel gemeinsam mit anderen weiterzubauen.",
  "Nach der offiziellen Veröffentlichung 2011 wuchs Minecraft zu einem der meistverkauften Spiele aller Zeiten heran.",
  "2014 übernahm Microsoft das Studio — und aus einem kleinen Experiment eines einzelnen Entwicklers wurde eine der größten Welten, die je gebaut wurden.",
  "Und genau in dieser Welt, mit genau diesem Launcher, geht deine eigene Geschichte weiter."
];

export function IdleScreensaver({
  narrationEnabled,
  onDismiss
}: {
  narrationEnabled: boolean;
  onDismiss: () => void;
}): React.JSX.Element {
  const [lineIndex, setLineIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    function dismiss(): void {
      window.speechSynthesis?.cancel();
      onDismiss();
    }
    window.addEventListener("mousemove", dismiss);
    window.addEventListener("mousedown", dismiss);
    window.addEventListener("keydown", dismiss);
    window.addEventListener("wheel", dismiss);
    return () => {
      window.removeEventListener("mousemove", dismiss);
      window.removeEventListener("mousedown", dismiss);
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("wheel", dismiss);
    };
    // Intentionally not depending on onDismiss's identity — the caller passes
    // a fresh closure each render, and re-binding these listeners every
    // render would risk missing the very first move event that triggers them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advances one caption line at a time, each timed to roughly how long it
  // takes to read aloud — speechSynthesis has no reliable "line finished"
  // signal across platforms, so this is an estimate (~14 characters/second),
  // not a precise sync with the actual audio.
  useEffect(() => {
    if (lineIndex >= STORY_LINES.length) return;
    const line = STORY_LINES[lineIndex]!;

    if (narrationEnabled && "speechSynthesis" in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(line);
        const voices = window.speechSynthesis.getVoices();
        const germanVoice = voices.find((v) => v.lang.toLowerCase().startsWith("de"));
        if (germanVoice) utterance.voice = germanVoice;
        utterance.lang = germanVoice?.lang ?? "de-DE";
        utterance.rate = 0.98;
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Web Speech API not available/blocked in this environment — the
        // on-screen caption still carries the story, so this fails silently.
      }
    }

    const readMs = Math.max(2600, line.length * 70);
    const timer = setTimeout(() => setLineIndex((i) => i + 1), readMs);
    return () => clearTimeout(timer);
  }, [lineIndex, narrationEnabled]);

  return (
    <div className="idle-screensaver">
      <div className="idle-screensaver__starfield" />
      <div className="idle-screensaver__glow" />
      <div className="idle-screensaver__logo">
        <GalaxyLogo size={96} />
      </div>
      <p className="idle-screensaver__caption">{STORY_LINES[Math.min(lineIndex, STORY_LINES.length - 1)]}</p>
      <p className="idle-screensaver__hint">Bewegung oder Taste zum Fortfahren</p>
    </div>
  );
}
