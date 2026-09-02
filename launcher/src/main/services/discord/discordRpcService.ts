import { Client } from "@xhayper/discord-rpc";
import { getDiscordClientId } from "../../config.js";

const RETRY_DELAY_MS = 15_000;

let client: Client | null = null;
// Tracks user intent (Settings toggle), independent of the current connection
// state — retryLoop reads this to know whether a failed/dropped connection
// should keep trying, or whether the user turned it off and it should stop.
let wantsConnection = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export function isDiscordConfigured(): boolean {
  return getDiscordClientId() !== null;
}

function clearRetryTimer(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleRetry(): void {
  clearRetryTimer();
  if (!wantsConnection) return;
  retryTimer = setTimeout(() => {
    if (wantsConnection) void attemptConnect();
  }, RETRY_DELAY_MS);
}

// The Discord desktop client isn't always up yet when Galaxy Launcher starts
// (or it gets closed/restarted mid-session) — a one-shot login() attempt that
// never retries meant the toggle silently stayed "on" but dead until the user
// noticed and manually flipped it off and on again. This keeps trying quietly
// in the background for as long as the user wants it connected.
async function attemptConnect(): Promise<{ connected: boolean; error?: string }> {
  const clientId = getDiscordClientId();
  if (!clientId) {
    return { connected: false, error: "Discord ist noch nicht eingerichtet." };
  }
  if (client?.isConnected) {
    return { connected: true };
  }

  try {
    const nextClient = new Client({ clientId });
    nextClient.on("disconnected", () => {
      if (client === nextClient) {
        client = null;
        scheduleRetry();
      }
    });
    await nextClient.login();
    client = nextClient;
    clearRetryTimer();
    return { connected: true };
  } catch (error) {
    client = null;
    scheduleRetry();
    // Most common cause: no Discord desktop client running locally to hand the
    // RPC pipe to — not a bug, just nothing to connect to yet. The retry loop
    // picks it up once Discord actually starts.
    return { connected: false, error: error instanceof Error ? error.message : "Verbindung fehlgeschlagen." };
  }
}

export async function connectDiscordRpc(): Promise<{ connected: boolean; error?: string }> {
  wantsConnection = true;
  await disconnectClientOnly();
  return attemptConnect();
}

async function disconnectClientOnly(): Promise<void> {
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

export async function disconnectDiscordRpc(): Promise<void> {
  wantsConnection = false;
  clearRetryTimer();
  await disconnectClientOnly();
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
