import { PublicClientApplication } from "@azure/msal-node";
import { MicrosoftAuthenticator } from "@xmcl/user";
import { shell } from "electron";
import { getMsaClientId } from "../../config.js";
import type { MinecraftSession } from "../../../shared/auth.js";
import { msalCachePlugin, clearMsalCache } from "./msalCache.js";

const SCOPES = ["XboxLive.signin", "offline_access"];

// Holds the *current* session's Minecraft access token in the main process
// only — the renderer never sees it directly, matching how every other
// secret-bearing call in this app stays main-side and is only reached via IPC.
let currentSession: MinecraftSession | null = null;

export function getCurrentSession(): MinecraftSession | null {
  return currentSession;
}

interface MinecraftProfileSkin {
  id: string;
  state: string;
  url: string;
}

interface MinecraftProfileResponse {
  id: string;
  name: string;
  skins: MinecraftProfileSkin[];
}

function createPca(clientId: string): PublicClientApplication {
  return new PublicClientApplication({
    auth: { clientId, authority: "https://login.microsoftonline.com/consumers" },
    cache: { cachePlugin: msalCachePlugin }
  });
}

export function isAuthConfigured(): boolean {
  return getMsaClientId() !== null;
}

// The Minecraft Services API returns the profile UUID without dashes;
// the game itself (and everything downstream) expects the standard
// 8-4-4-4-12 hyphenated form.
function toDashedUuid(raw: string): string {
  if (raw.includes("-")) return raw;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

async function fetchSkinBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

async function finishMinecraftLogin(msAccessToken: string): Promise<MinecraftSession> {
  const authenticator = new MicrosoftAuthenticator();
  const { minecraftXstsResponse } = await authenticator.acquireXBoxToken(msAccessToken);
  const claims = minecraftXstsResponse.DisplayClaims.xui[0];
  if (!claims) throw new Error("Xbox Live hat keine Nutzerdaten zurückgegeben.");

  const mcAuth = await authenticator.loginMinecraftWithXBox(claims.uhs, minecraftXstsResponse.Token);

  // This profile fetch IS the ownership check: no owned copy of Minecraft means
  // no valid profile, so a 404 here means "this account doesn't own the game"
  // rather than a separate entitlement lookup.
  const profileRes = await fetch("https://api.minecraftservices.com/minecraft/profile", {
    headers: { Authorization: `Bearer ${mcAuth.access_token}` }
  });
  if (profileRes.status === 404) {
    throw new Error("Dieser Microsoft-Account besitzt kein Minecraft.");
  }
  if (!profileRes.ok) {
    throw new Error(`Minecraft-Profil konnte nicht geladen werden (${profileRes.status}).`);
  }
  const profile = (await profileRes.json()) as MinecraftProfileResponse;
  const activeSkin = profile.skins.find((skin) => skin.state === "ACTIVE") ?? profile.skins[0];

  const session: MinecraftSession = {
    minecraftAccessToken: mcAuth.access_token,
    minecraftUsername: profile.name,
    minecraftUuid: toDashedUuid(profile.id),
    skinBase64: activeSkin ? await fetchSkinBase64(activeSkin.url) : null
  };
  currentSession = session;
  return session;
}

export async function loginInteractive(): Promise<MinecraftSession> {
  const clientId = getMsaClientId();
  if (!clientId) throw new Error("Microsoft-Anmeldung ist noch nicht eingerichtet (MSA_CLIENT_ID fehlt).");

  const pca = createPca(clientId);
  const result = await pca.acquireTokenInteractive({
    scopes: SCOPES,
    openBrowser: async (url) => {
      await shell.openExternal(url);
    }
  });
  if (!result.accessToken) throw new Error("Keine Microsoft-Zugangsdaten erhalten.");

  return finishMinecraftLogin(result.accessToken);
}

export async function loginSilent(): Promise<MinecraftSession | null> {
  const clientId = getMsaClientId();
  if (!clientId) return null;

  const pca = createPca(clientId);
  const accounts = await pca.getTokenCache().getAllAccounts();
  const account = accounts[0];
  if (!account) return null;

  try {
    const result = await pca.acquireTokenSilent({ account, scopes: SCOPES });
    if (!result.accessToken) return null;
    return await finishMinecraftLogin(result.accessToken);
  } catch {
    // Refresh token expired/revoked — fall back to the normal login screen.
    return null;
  }
}

export async function logout(): Promise<void> {
  const clientId = getMsaClientId();
  if (clientId) {
    const pca = createPca(clientId);
    const accounts = await pca.getTokenCache().getAllAccounts();
    for (const account of accounts) {
      await pca.getTokenCache().removeAccount(account);
    }
  }
  await clearMsalCache();
  currentSession = null;
}
