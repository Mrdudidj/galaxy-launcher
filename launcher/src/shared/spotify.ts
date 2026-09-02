// Two distinguishable "nothing to show" states, since MPRIS makes them
// genuinely different: Spotify not being on the session bus at all (not
// running) vs. Spotify running with no track loaded yet.
export type SpotifyPlaybackState =
  | { running: false }
  | {
      running: true;
      isPlaying: boolean;
      trackName: string;
      artistNames: string;
      albumArtUrl: string | null;
      volume: number | null;
    };

export interface SpotifySearchResult {
  uri: string;
  name: string;
  artistNames: string;
  albumArtUrl: string | null;
}

export type SpotifyControlAction = "playPause" | "next" | "previous" | "volumeUp" | "volumeDown" | "none";
