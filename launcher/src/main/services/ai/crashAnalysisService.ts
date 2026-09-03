import type { CrashAnalysis } from "../../../shared/instance.js";
import { getAiKey } from "./aiKeyStore.js";

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
}

// Same fetch-to-Claude-with-a-JSON-system-prompt shape as modSuggestionService.ts.
// The log tail itself is the primary signal — Fabric/Forge print their loaded
// mod list and the actual exception on crash, so no separate "list installed
// mods" plumbing is needed for a useful answer.
export async function analyzeCrash(logTail: string): Promise<CrashAnalysis> {
  const apiKey = await getAiKey();
  if (!apiKey) {
    throw new Error("Kein KI-API-Schlüssel hinterlegt. Trage ihn in den Einstellungen ein.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system:
        "Du bist ein Minecraft-Absturz-Analyst. Du bekommst die letzten Log-Zeilen eines abgestürzten " +
        "Minecraft-Prozesses (Java-Stacktrace, Fabric/Forge-Ausgabe). Antworte AUSSCHLIESSLICH mit kompaktem " +
        'JSON in der Form {"summary": "Kurze Zusammenfassung auf Deutsch, was passiert ist", ' +
        '"likelyCause": "Wahrscheinlichste Ursache auf Deutsch", ' +
        '"suggestedFix": "Ein konkreter, umsetzbarer Vorschlag auf Deutsch"}, kein Text außerhalb des JSON. ' +
        "Wenn die Ursache aus dem Log nicht sicher erkennbar ist, sag das ehrlich statt zu raten.",
      messages: [{ role: "user", content: `Letzte Log-Zeilen:\n${logTail}` }]
    })
  });

  if (!response.ok) {
    throw new Error(`KI-Anfrage fehlgeschlagen (${response.status}).`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content.find((block) => block.type === "text")?.text ?? "{}";
  const jsonMatch = /\{[\s\S]*\}/.exec(text);
  if (!jsonMatch) {
    throw new Error("KI-Antwort konnte nicht ausgewertet werden.");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<CrashAnalysis>;
  return {
    summary: parsed.summary ?? "Keine Zusammenfassung verfügbar.",
    likelyCause: parsed.likelyCause ?? "Unbekannt.",
    suggestedFix: parsed.suggestedFix ?? "Kein Vorschlag verfügbar."
  };
}
