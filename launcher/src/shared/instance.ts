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

export interface DiscordRpcSettings {
  enabled: boolean;
}
