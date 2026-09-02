import type { SpotifyControlAction } from "./spotify.js";

export interface CreateInstanceInput {
  name: string;
  minecraftVersion: string;
  modLoaderType?: "vanilla" | "fabric" | "forge" | "quilt";
  modLoaderVersion?: string;
}

export interface StartInstanceDownloadInput {
  instanceId: string;
  minecraftVersion: string;
  modLoader: { type: "vanilla" | "fabric" | "forge" | "quilt"; version: string | null };
}

export interface ServerEntry {
  name: string;
  address: string;
}

export interface WizardDefaults {
  keybindsSourceInstanceId: string | null;
  worldSourceInstanceId: string | null;
  servers: ServerEntry[];
}

export interface AppSettings {
  defaultMods: string[];
  discordRpc: DiscordRpcSettings;
  spotify: SpotifySettings;
  screensaver: ScreensaverSettings;
}

export interface ScreensaverSettings {
  enabled: boolean;
  /** Minutes of no mouse/keyboard activity in the launcher before it kicks in. */
  idleMinutes: number;
  /** Whether the Minecraft-history narration is read aloud (Web Speech API) in addition to the on-screen captions. */
  narrationEnabled: boolean;
}

export interface InstanceSettingsPatch {
  name?: string;
  memory?: { minMb: number; maxMb: number };
  resolution?: { width: number; height: number; fullscreen: boolean };
  extraJvmArgs?: string[];
  group?: string | null;
}

export interface ModSuggestion {
  name: string;
  reason: string;
}

export interface ModrinthSearchHit {
  projectId: string;
  title: string;
  description: string;
  author: string;
  downloads: number;
  iconUrl: string | null;
}

export interface ModInstallResult {
  installedFileNames: string[];
}

export interface TextureEntry {
  /** Path relative to assets/minecraft/textures, no extension — e.g. "gui/sprites/hud/hotbar". */
  path: string;
  /** First path segment (block, item, entity, gui, ...). */
  category: string;
  fileName: string;
}

export interface DiscordRpcSettings {
  enabled: boolean;
}

export interface SpotifySettings {
  /** Widget shown/hidden — separate from whether Spotify is currently running. */
  widgetVisible: boolean;
  /** Accelerator string (Electron format, e.g. "Control+Shift+M") for the pin/unpin toggle. */
  pinHotkey: string;
  widgetBounds: { x: number; y: number; width: number; height: number } | null;
  pinned: boolean;
  /** Single accelerator whose press-count (within a short window) selects an action below. */
  controlKey: string;
  pressActions: {
    single: SpotifyControlAction;
    double: SpotifyControlAction;
    triple: SpotifyControlAction;
  };
  /** Command used to launch Spotify when playing a track while it's not running (varies by install method). */
  launchCommand: string;
}
