import { getSpotifyClientId } from "../../config.js";
import { getSpotifyClientSecret } from "./spotifySecretStore.js";
import type { SpotifySearchResult } from "../../../shared/spotify.js";

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface SpotifySearchResponse {
  tracks?: {
    items: Array<{
      uri: string;
      name: string;
      artists: Array<{ name: string }>;
      album: { images: Array<{ url: string }> };
    }>;
  };
}

// Client Credentials — app-only auth (no user login, no browser popup), the
// right flow for search since it's never tied to a specific user's data.
// Search itself has never been Premium-gated, unlike playback control.
let cachedToken: { token: string; expiresAt: number } | null = null;

export function isSpotifySearchConfigured(): boolean {
  return getSpotifyClientId() !== null;
}

async function getAppAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = getSpotifyClientId();
  const clientSecret = await getSpotifyClientSecret();
  if (!clientId) throw new Error("Spotify ist noch nicht eingerichtet (SPOTIFY_CLIENT_ID fehlt).");
  if (!clientSecret) throw new Error("Spotify-Client-Secret fehlt. In den Einstellungen hinterlegen.");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
    },
    body: new URLSearchParams({ grant_type: "client_credentials" })
  });
  if (!response.ok) {
    throw new Error(`Spotify-Anmeldung fehlgeschlagen (${response.status}). Client-Secret prüfen.`);
  }

  const tokens = (await response.json()) as TokenResponse;
  cachedToken = { token: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 - 30_000 };
  return tokens.access_token;
}

export async function searchTracks(query: string): Promise<SpotifySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const accessToken = await getAppAccessToken();
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "8");

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`Spotify-Suche fehlgeschlagen (${response.status}).`);
  }

  const data = (await response.json()) as SpotifySearchResponse;
  return (data.tracks?.items ?? []).map((item) => ({
    uri: item.uri,
    name: item.name,
    artistNames: item.artists.map((a) => a.name).join(", "),
    albumArtUrl: item.album.images[0]?.url ?? null
  }));
}
