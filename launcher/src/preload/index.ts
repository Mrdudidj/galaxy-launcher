import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { Instance } from "@galaxy-launcher/shared-types";
import type {
  AppSettings,
  CreateInstanceInput,
  DiscordRpcSettings,
  InstanceSettingsPatch,
  ModSuggestion,
  ServerEntry,
  StartInstanceDownloadInput,
  WizardDefaults
} from "../shared/instance";
import type { DownloadProgress, FabricLoaderSummary, MinecraftVersionSummary } from "../shared/minecraft";
import type { NewsItem } from "../shared/backend";
import type { EconomyState, Rank, ShopItem } from "../shared/economy";
import type { SkinState } from "../shared/skin";
import type { MinecraftSession } from "../shared/auth";

const galaxyApi = {
  ping: (): Promise<{ message: string; timestamp: number }> => ipcRenderer.invoke("app:ping"),

  versions: {
    list: (): Promise<MinecraftVersionSummary[]> => ipcRenderer.invoke("versions:list")
  },

  fabric: {
    listLoaders: (minecraftVersion: string): Promise<FabricLoaderSummary[]> =>
      ipcRenderer.invoke("fabric:listLoaders", minecraftVersion)
  },

  instances: {
    list: (): Promise<Instance[]> => ipcRenderer.invoke("instances:list"),
    create: (input: CreateInstanceInput): Promise<Instance> => ipcRenderer.invoke("instances:create", input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke("instances:delete", id),
    duplicate: (id: string, newName: string): Promise<Instance> =>
      ipcRenderer.invoke("instances:duplicate", id, newName),
    copyKeybinds: (fromId: string, toId: string): Promise<void> =>
      ipcRenderer.invoke("instances:copyKeybinds", fromId, toId),
    listWorlds: (instanceId: string): Promise<string[]> => ipcRenderer.invoke("instances:listWorlds", instanceId),
    copyWorld: (fromId: string, toId: string, worldName: string): Promise<void> =>
      ipcRenderer.invoke("instances:copyWorld", fromId, toId, worldName),
    applyDefaultMods: (instanceId: string): Promise<void> =>
      ipcRenderer.invoke("instances:applyDefaultMods", instanceId),
    writeServers: (instanceId: string, servers: ServerEntry[]): Promise<void> =>
      ipcRenderer.invoke("instances:writeServers", instanceId, servers),
    readServers: (instanceId: string): Promise<ServerEntry[]> => ipcRenderer.invoke("instances:readServers", instanceId),
    removeMod: (instanceId: string, fileName: string): Promise<void> =>
      ipcRenderer.invoke("instances:removeMod", instanceId, fileName),
    removeResourcePack: (instanceId: string, fileName: string): Promise<void> =>
      ipcRenderer.invoke("instances:removeResourcePack", instanceId, fileName),
    updateSettings: (id: string, patch: InstanceSettingsPatch): Promise<Instance> =>
      ipcRenderer.invoke("instances:updateSettings", id, patch),
    createShortcut: (id: string, name: string): Promise<{ path: string }> =>
      ipcRenderer.invoke("instances:createShortcut", id, name)
  },

  app: {
    getLaunchInstanceId: (): Promise<string | null> => ipcRenderer.invoke("app:getLaunchInstanceId")
  },

  dialogs: {
    addMods: (instanceId: string): Promise<string[]> => ipcRenderer.invoke("dialogs:addMods", instanceId),
    addResourcePacks: (instanceId: string): Promise<string[]> =>
      ipcRenderer.invoke("dialogs:addResourcePacks", instanceId),
    pickDefaultMod: (): Promise<AppSettings | null> => ipcRenderer.invoke("dialogs:pickDefaultMod"),
    saveTexture: (defaultName: string, base64Png: string): Promise<string | null> =>
      ipcRenderer.invoke("dialogs:saveTexture", defaultName, base64Png)
  },

  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke("settings:get"),
    removeDefaultMod: (filePath: string): Promise<AppSettings> =>
      ipcRenderer.invoke("settings:removeDefaultMod", filePath),
    updateDiscordRpc: (patch: Partial<DiscordRpcSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke("settings:updateDiscordRpc", patch)
  },

  wizard: {
    getDefaults: (): Promise<WizardDefaults> => ipcRenderer.invoke("wizard:getDefaults"),
    updateDefaults: (patch: Partial<WizardDefaults>): Promise<void> =>
      ipcRenderer.invoke("wizard:updateDefaults", patch)
  },

  downloads: {
    startInstance: (input: StartInstanceDownloadInput): Promise<string> =>
      ipcRenderer.invoke("downloads:startInstance", input),
    onProgress: (callback: (progress: DownloadProgress) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, progress: DownloadProgress): void => callback(progress);
      ipcRenderer.on("downloads:progress", listener);
      return () => ipcRenderer.removeListener("downloads:progress", listener);
    }
  },

  backend: {
    getNews: (): Promise<NewsItem[]> => ipcRenderer.invoke("backend:getNews")
  },

  shop: {
    getCatalog: (): Promise<ShopItem[]> => ipcRenderer.invoke("shop:getCatalog")
  },

  economy: {
    get: (): Promise<EconomyState> => ipcRenderer.invoke("economy:get"),
    purchase: (itemId: string): Promise<EconomyState> => ipcRenderer.invoke("economy:purchase", itemId),
    setEquipped: (itemId: string, equipped: boolean): Promise<EconomyState> =>
      ipcRenderer.invoke("economy:setEquipped", itemId, equipped),
    redeemCode: (
      code: string
    ): Promise<{ economy: EconomyState; grantedCoins: number; grantedGlow: string | null; grantedRank: Rank | null }> =>
      ipcRenderer.invoke("economy:redeemCode", code),
    setRank: (rank: Rank): Promise<EconomyState> => ipcRenderer.invoke("economy:setRank", rank)
  },

  skin: {
    get: (): Promise<SkinState> => ipcRenderer.invoke("skin:get"),
    save: (base64Png: string): Promise<SkinState> => ipcRenderer.invoke("skin:save", base64Png),
    setGlow: (color: string | null): Promise<SkinState> => ipcRenderer.invoke("skin:setGlow", color)
  },

  ai: {
    hasKey: (): Promise<boolean> => ipcRenderer.invoke("ai:hasKey"),
    setKey: (key: string): Promise<void> => ipcRenderer.invoke("ai:setKey", key),
    clearKey: (): Promise<void> => ipcRenderer.invoke("ai:clearKey"),
    suggestMods: (minecraftVersion: string, installedMods: string[], prompt: string): Promise<ModSuggestion[]> =>
      ipcRenderer.invoke("ai:suggestMods", minecraftVersion, installedMods, prompt)
  },

  discord: {
    isConfigured: (): Promise<boolean> => ipcRenderer.invoke("discord:isConfigured"),
    connect: (): Promise<{ connected: boolean; error?: string }> => ipcRenderer.invoke("discord:connect"),
    disconnect: (): Promise<void> => ipcRenderer.invoke("discord:disconnect"),
    isConnected: (): Promise<boolean> => ipcRenderer.invoke("discord:isConnected"),
    setActivity: (details: string, state: string): Promise<void> =>
      ipcRenderer.invoke("discord:setActivity", details, state)
  },

  auth: {
    isConfigured: (): Promise<boolean> => ipcRenderer.invoke("auth:isConfigured"),
    loginInteractive: (): Promise<MinecraftSession> => ipcRenderer.invoke("auth:loginInteractive"),
    loginSilent: (): Promise<MinecraftSession | null> => ipcRenderer.invoke("auth:loginSilent"),
    logout: (): Promise<void> => ipcRenderer.invoke("auth:logout")
  },

  launch: {
    isRunning: (): Promise<boolean> => ipcRenderer.invoke("launch:isRunning"),
    kill: (): Promise<void> => ipcRenderer.invoke("launch:kill"),
    start: (instanceId: string): Promise<void> => ipcRenderer.invoke("launch:start", instanceId),
    onLog: (callback: (line: string, stream: "stdout" | "stderr") => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, line: string, stream: "stdout" | "stderr"): void =>
        callback(line, stream);
      ipcRenderer.on("launch:log", listener);
      return () => ipcRenderer.removeListener("launch:log", listener);
    },
    onJavaProgress: (callback: (downloaded: number, total: number) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, downloaded: number, total: number): void =>
        callback(downloaded, total);
      ipcRenderer.on("launch:javaProgress", listener);
      return () => ipcRenderer.removeListener("launch:javaProgress", listener);
    },
    onExit: (callback: (info: { code: number | null; crashed: boolean }) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, info: { code: number | null; crashed: boolean }): void =>
        callback(info);
      ipcRenderer.on("launch:exit", listener);
      return () => ipcRenderer.removeListener("launch:exit", listener);
    }
  }
};

export type GalaxyApi = typeof galaxyApi;

contextBridge.exposeInMainWorld("galaxy", galaxyApi);
