import { Client } from "@xhayper/discord-rpc";
import { getDiscordClientId } from "../../config.js";

let client: Client | null = null;

export function isDiscordConfigured(): boolean {
  return getDiscordClientId() !== null;
}

export async function connectDiscordRpc(): Promise<{ connected: boolean; error?: string }> {
  const clientId = getDiscordClientId();
  if (!clientId) {
    return { connected: false, error: "Discord ist noch nicht eingerichtet." };
  }
  if (client?.isConnected) {
    return { connected: true };
  }
  await disconnectDiscordRpc();

  try {
    const nextClient = new Client({ clientId });
    await nextClient.login();
    client = nextClient;
    return { connected: true };
  } catch (error) {
    client = null;
    // Most common cause: no Discord desktop client running locally to hand the
    // RPC pipe to — not a bug, just nothing to connect to yet.
    return { connected: false, error: error instanceof Error ? error.message : "Verbindung fehlgeschlagen." };
  }
}

export async function disconnectDiscordRpc(): Promise<void> {
  const previous = client;
  client = null;
  if (previous) {
    try {
      await previous.destroy();
    } catch {
      // already gone
    }
  }
}

export async function setDiscordActivity(details: string, state: string): Promise<void> {
  if (!client?.isConnected) return;
  try {
    await client.user?.setActivity({
      details,
      state,
      startTimestamp: Date.now(),
      largeImageKey: "galaxy_logo",
      largeImageText: "Galaxy Launcher"
    });
  } catch {
    // Presence updates are best-effort — a failed update shouldn't surface as an app error.
  }
}

export function isDiscordRpcConnected(): boolean {
  return client?.isConnected ?? false;
}
