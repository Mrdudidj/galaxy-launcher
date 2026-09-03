import type { ModerationVerdict } from "../../../shared/moderation.js";
import { getAiKey } from "../ai/aiKeyStore.js";

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
}

// Same fetch-to-Claude-with-a-JSON-system-prompt shape as modSuggestionService.ts
// — reuses the user's own already-configured key rather than a separate one.
// Never applies a consequence itself: the admin console always shows this
// verdict for a human (the admin) to approve or reject before anything happens.
export async function reviewMessage(messageText: string): Promise<ModerationVerdict> {
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
      max_tokens: 300,
      system:
        "Du prüfst eine einzelne Chat-Nachricht aus einem Minecraft-Launcher-Chat auf Beleidigungen, " +
        "Belästigung oder Hassrede — unabhängig davon, in welcher Sprache sie geschrieben ist. Achte auch auf " +
        "absichtlich verkürzte, abgekürzte oder verstümmelte Schreibweisen (z. B. Leetspeak, Sternchen-Zensur, " +
        "Lautschrift), die eine Beleidigung erkennbar meinen, auch wenn das Wort nicht vollständig ausgeschrieben " +
        "ist. Antworte AUSSCHLIESSLICH mit kompaktem JSON in der Form " +
        '{"flagged": true oder false, "reason": "Kurze Begründung auf Deutsch"}, kein Text außerhalb des JSON.',
      messages: [{ role: "user", content: messageText }]
    })
  });

  if (!response.ok) {
    throw new Error(`KI-Anfrage fehlgeschlagen (${response.status}).`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content.find((block) => block.type === "text")?.text ?? "{}";
  const jsonMatch = /\{[\s\S]*\}/.exec(text);
  if (!jsonMatch) {
    return { flagged: false, reason: "KI-Antwort konnte nicht ausgewertet werden." };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ModerationVerdict>;
    return {
      flagged: typeof parsed.flagged === "boolean" ? parsed.flagged : false,
      reason: typeof parsed.reason === "string" ? parsed.reason : "Keine Begründung angegeben."
    };
  } catch {
    return { flagged: false, reason: "KI-Antwort konnte nicht ausgewertet werden." };
  }
}
