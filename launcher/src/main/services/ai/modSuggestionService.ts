import type { ModSuggestion } from "../../../shared/instance.js";
import { getAiKey } from "./aiKeyStore.js";

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
}

export async function suggestMods(
  minecraftVersion: string,
  installedMods: string[],
  prompt: string
): Promise<ModSuggestion[]> {
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
        "Du schlägst Minecraft-Mods von Modrinth vor. Antworte AUSSCHLIESSLICH mit kompaktem JSON " +
        'in der Form [{"name": "Mod-Name", "reason": "Kurzer Grund auf Deutsch"}], maximal 6 Einträge, ' +
        "keine bereits installierten Mods erneut vorschlagen, kein Text außerhalb des JSON-Arrays.",
      messages: [
        {
          role: "user",
          content: `Minecraft-Version: ${minecraftVersion}\nBereits installiert: ${installedMods.join(", ") || "keine"}\nWunsch: ${prompt || "allgemein gute Mods für diese Version"}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`KI-Anfrage fehlgeschlagen (${response.status}).`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content.find((block) => block.type === "text")?.text ?? "[]";
  const jsonMatch = /\[[\s\S]*\]/.exec(text);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ModSuggestion =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ModSuggestion).name === "string" &&
        typeof (entry as ModSuggestion).reason === "string"
    );
  } catch {
    return [];
  }
}
