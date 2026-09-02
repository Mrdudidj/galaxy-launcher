import { useEffect, useState } from "react";
import { getErrorMessage } from "../api/ipcError";
import type { SpotifyPlaybackState, SpotifySearchResult } from "../../../shared/spotify";
import "./NowPlayingWidget.css";

const POLL_MS = 3000;

// The widget window's own root component (see App.tsx's `?widget=spotify`
// check) — deliberately not using react-query/the rest of the app's data
// layer, since this window has no auth/instances/economy context at all, just
// a tight poll loop against MPRIS (via the main process) plus a couple of
// direct control/search calls.
export function NowPlayingWidget(): React.JSX.Element {
  const [state, setState] = useState<SpotifyPlaybackState>({ running: false });
  const [pinned, setPinned] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // index.css paints an opaque starfield on <body> for the main app shell —
  // this window is set transparent:true at the OS level, so that background
  // would otherwise show up as a solid rectangle instead of the intended
  // see-through overlay.
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll(): Promise<void> {
      const next = await window.galaxy.spotify.getPlaybackState();
      if (!cancelled) setState(next);
    }

    void poll();
    const interval = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    void window.galaxy.settings.get().then((settings) => setPinned(settings.spotify.pinned));
  }, [state]);

  async function togglePin(): Promise<void> {
    await window.galaxy.spotify.togglePin();
    setPinned((p) => !p);
  }

  async function runSearch(): Promise<void> {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await window.galaxy.spotify.search(trimmed));
    } catch (error) {
      setSearchError(getErrorMessage(error, "Suche fehlgeschlagen."));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function playResult(uri: string): Promise<void> {
    setResults([]);
    setQuery("");
    await window.galaxy.spotify.playUri(uri);
  }

  return (
    <div className="now-playing-widget">
      <div className="now-playing-widget__row">
        <button className="now-playing-widget__pin" onClick={() => void togglePin()} title={pinned ? "Lösen" : "Fixieren"}>
          {pinned ? "📌" : "📍"}
        </button>
        {!state.running ? (
          <span className="now-playing-widget__hint">Spotify läuft nicht</span>
        ) : !state.trackName ? (
          <span className="now-playing-widget__hint">Nichts spielt gerade</span>
        ) : (
          <div className="now-playing-widget__track">
            {state.albumArtUrl && <img className="now-playing-widget__art" src={state.albumArtUrl} alt="" />}
            <div className="now-playing-widget__info">
              <div className="now-playing-widget__title">{state.trackName}</div>
              <div className="now-playing-widget__artist">{state.artistNames}</div>
            </div>
          </div>
        )}
      </div>

      {state.running && !pinned && (
        <div className="now-playing-widget__controls">
          <button onClick={() => void window.galaxy.spotify.previous()} title="Zurück">
            ⏮
          </button>
          <button onClick={() => void window.galaxy.spotify.playPause()} title="Play/Pause">
            {state.isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={() => void window.galaxy.spotify.next()} title="Weiter">
            ⏭
          </button>
        </div>
      )}

      {!pinned && (
        <div className="now-playing-widget__search">
          <div className="now-playing-widget__search-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runSearch();
              }}
              placeholder="Song oder Playlist suchen…"
            />
            <button onClick={() => void runSearch()} disabled={searching}>
              {searching ? "…" : "🔍"}
            </button>
          </div>
          {searchError && <span className="now-playing-widget__search-error">{searchError}</span>}
          {results.length > 0 && (
            <div className="now-playing-widget__results">
              {results.map((r) => (
                <button key={r.uri} className="now-playing-widget__result" onClick={() => void playResult(r.uri)}>
                  {r.albumArtUrl && <img src={r.albumArtUrl} alt="" />}
                  <span className="now-playing-widget__result-text">
                    <span className="now-playing-widget__result-title">{r.name}</span>
                    <span className="now-playing-widget__result-artist">{r.artistNames}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
