import { BrowserWindow, ipcMain } from "electron";
import { writeFile } from "node:fs/promises";
import { hasAiKey, setAiKey, clearAiKey } from "../services/ai/aiKeyStore.js";
import { suggestMods } from "../services/ai/modSuggestionService.js";
import { isAuthConfigured, loginInteractive, loginSilent, logout as msaLogout } from "../services/auth/microsoftAuth.js";
import { getNews } from "../services/backend/backendClient.js";
import {
  connectDiscordRpc,
  disconnectDiscordRpc,
  isDiscordConfigured,
  isDiscordRpcConnected,
  setDiscordActivity
} from "../services/discord/discordRpcService.js";
import { pickFiles, pickSaveLocation } from "../services/dialogs.js";
import { isGameRunning, killActiveGame, launchInstance } from "../services/minecraft/launchInstance.js";
import { installMod, searchMods } from "../services/mods/modrinthService.js";
import {
  generateAdminCode,
  getEconomy,
  purchaseItem,
  redeemCode,
  setEquipped,
  setRank
} from "../services/economy/economyStore.js";
import { SHOP_CATALOG } from "../services/economy/shopCatalog.js";
import {
  adjustCoins,
  approveReport,
  confirmChatReview,
  createChatReviewSession,
  createReport,
  createSupportTicket,
  getModerationState,
  grantItem,
  readChatOutbox,
  rejectReport,
  resolveSupportTicket,
  revokeItem,
  runAiChatCheck,
  suspendAccount,
  tempBanAccount,
  toggleReviewMessageFlag,
  undoAuditEntry,
  updateModerationSettings,
  warnPlayer
} from "../services/moderation/moderationStore.js";
import { createDesktopShortcut } from "../services/shortcuts/shortcutService.js";
import { getSkinState, saveCustomSkin, setGlowColor } from "../services/skins/skinStore.js";
import { adjustVolume, getPlaybackState, next, playPause, playUri, previous } from "../services/spotify/spotifyControl.js";
import { searchTracks } from "../services/spotify/spotifySearchService.js";
import {
  clearSpotifyClientSecret,
  hasSpotifyClientSecret,
  setSpotifyClientSecret
} from "../services/spotify/spotifySecretStore.js";
import {
  hideSpotifyWidget,
  registerControlHotkey,
  registerPinHotkey,
  showSpotifyWidget,
  toggleSpotifyWidgetPin
} from "../windows/spotifyWidgetWindow.js";
import { listFabricLoaders } from "../services/minecraft/fabric.js";
import { installInstanceFiles, type InstallInstanceInput } from "../services/minecraft/installInstance.js";
import { listReleaseVersions } from "../services/minecraft/versionManifest.js";
import {
  addDefaultMod,
  getSettings,
  removeDefaultMod,
  updateDiscordRpcSettings,
  updateScreensaverSettings,
  updateSpotifySettings
} from "../services/settings/settingsStore.js";
import {
  addLocalMods,
  addLocalResourcePacks,
  applyDefaultMods,
  copyKeybinds,
  copyWorld,
  listWorlds,
  readServers,
  removeMod,
  removeResourcePack,
  writeServers
} from "../services/instances/instanceFiles.js";
import type { CreateInstanceInput } from "../services/instances/instanceStore.js";
import {
  createInstance,
  deleteInstance,
  duplicateInstance,
  listInstances,
  updateInstance
} from "../services/instances/instanceStore.js";
import { getWizardDefaults, updateWizardDefaults } from "../services/instances/wizardDefaults.js";
import { applyCustomTexture, listTextures, readTexturePng, readTexturePngBatch } from "../services/textures/textureCatalog.js";
import type { AppSettings, InstanceSettingsPatch, ServerEntry, WizardDefaults } from "../../shared/instance.js";
import type { Rank } from "../../shared/economy.js";
import type { ModerationSettings, SupportTicketCategory } from "../../shared/moderation.js";

function getLaunchInstanceId(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--instance="));
  return arg ? arg.slice("--instance=".length) : null;
}

export function registerIpcHandlers(): void {
  ipcMain.handle("app:ping", () => {
    return { message: "pong", timestamp: Date.now() };
  });

  ipcMain.handle("versions:list", () => listReleaseVersions());

  ipcMain.handle("fabric:listLoaders", (_event, minecraftVersion: string) => listFabricLoaders(minecraftVersion));

  ipcMain.handle("instances:list", () => listInstances());

  ipcMain.handle("instances:create", (_event, input: CreateInstanceInput) => createInstance(input));

  ipcMain.handle("instances:delete", (_event, id: string) => deleteInstance(id));

  ipcMain.handle("instances:duplicate", (_event, id: string, newName: string) => duplicateInstance(id, newName));

  ipcMain.handle("instances:updateSettings", (_event, id: string, patch: InstanceSettingsPatch) =>
    updateInstance(id, (instance) => ({
      ...instance,
      name: patch.name?.trim() ? patch.name.trim() : instance.name,
      memory: patch.memory ?? instance.memory,
      resolution: patch.resolution ?? instance.resolution,
      extraJvmArgs: patch.extraJvmArgs ?? instance.extraJvmArgs,
      group: patch.group !== undefined ? patch.group : instance.group
    }))
  );

  ipcMain.handle("instances:copyKeybinds", (_event, fromId: string, toId: string) => copyKeybinds(fromId, toId));

  ipcMain.handle("instances:listWorlds", (_event, instanceId: string) => listWorlds(instanceId));

  ipcMain.handle("instances:copyWorld", (_event, fromId: string, toId: string, worldName: string) =>
    copyWorld(fromId, toId, worldName)
  );

  ipcMain.handle("instances:applyDefaultMods", async (_event, instanceId: string) => {
    const settings = await getSettings();
    await applyDefaultMods(instanceId, settings.defaultMods);
  });

  ipcMain.handle("instances:writeServers", (_event, instanceId: string, servers: ServerEntry[]) =>
    writeServers(instanceId, servers)
  );

  ipcMain.handle("instances:readServers", (_event, instanceId: string) => readServers(instanceId));

  ipcMain.handle("instances:removeMod", (_event, instanceId: string, fileName: string) =>
    removeMod(instanceId, fileName)
  );

  ipcMain.handle("instances:removeResourcePack", (_event, instanceId: string, fileName: string) =>
    removeResourcePack(instanceId, fileName)
  );

  ipcMain.handle("textures:list", (_event, instanceId: string) => listTextures(instanceId));

  ipcMain.handle("textures:read", (_event, instanceId: string, texturePath: string) =>
    readTexturePng(instanceId, texturePath)
  );

  ipcMain.handle("textures:readBatch", (_event, instanceId: string, texturePaths: string[]) =>
    readTexturePngBatch(instanceId, texturePaths)
  );

  ipcMain.handle("textures:apply", (_event, instanceId: string, texturePath: string, base64Png: string) =>
    applyCustomTexture(instanceId, texturePath, base64Png)
  );

  ipcMain.handle("mods:search", (_event, instanceId: string, query: string) => searchMods(instanceId, query));

  ipcMain.handle("mods:install", (_event, instanceId: string, projectId: string) => installMod(instanceId, projectId));

  ipcMain.handle("dialogs:addMods", async (event, instanceId: string) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    const filePaths = await pickFiles(window, ["jar"]);
    if (filePaths.length > 0) await addLocalMods(instanceId, filePaths);
    return filePaths;
  });

  ipcMain.handle("dialogs:addResourcePacks", async (event, instanceId: string) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    const filePaths = await pickFiles(window, ["zip"]);
    if (filePaths.length > 0) await addLocalResourcePacks(instanceId, filePaths);
    return filePaths;
  });

  ipcMain.handle("dialogs:pickDefaultMod", async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;
    const filePaths = await pickFiles(window, ["jar"]);
    if (filePaths.length === 0) return null;
    return addDefaultMod(filePaths[0]!);
  });

  ipcMain.handle("settings:get", () => getSettings());

  ipcMain.handle("settings:removeDefaultMod", (_event, filePath: string) => removeDefaultMod(filePath));

  ipcMain.handle("wizard:getDefaults", () => getWizardDefaults());

  ipcMain.handle("wizard:updateDefaults", (_event, patch: Partial<WizardDefaults>) => updateWizardDefaults(patch));

  ipcMain.handle("downloads:startInstance", async (event, input: InstallInstanceInput & { instanceId: string }) => {
    const versionId = await installInstanceFiles(input, (progress) => {
      event.sender.send("downloads:progress", progress);
    });
    await updateInstance(input.instanceId, (instance) => ({ ...instance, resolvedVersionId: versionId }));
    return versionId;
  });

  ipcMain.handle("backend:getNews", () => getNews());

  ipcMain.handle("shop:getCatalog", () => SHOP_CATALOG);

  ipcMain.handle("economy:get", () => getEconomy());

  ipcMain.handle("economy:purchase", (_event, itemId: string) => purchaseItem(itemId));

  ipcMain.handle("economy:setEquipped", (_event, itemId: string, equipped: boolean) =>
    setEquipped(itemId, equipped)
  );

  ipcMain.handle("economy:redeemCode", (_event, code: string) => redeemCode(code));

  ipcMain.handle("economy:setRank", (_event, rank: Rank) => setRank(rank));

  ipcMain.handle("economy:generateAdminCode", (_event, durationDays: number | null) => generateAdminCode(durationDays));

  ipcMain.handle("moderation:getState", () => getModerationState());

  ipcMain.handle("moderation:readChatOutbox", (_event, instanceId: string) => readChatOutbox(instanceId));

  ipcMain.handle(
    "moderation:createReport",
    (_event, messageText: string, source: "outbox" | "manual", playerName: string | null) =>
      createReport(messageText, source, playerName)
  );

  ipcMain.handle("moderation:approveReport", (_event, reportId: string) => approveReport(reportId));

  ipcMain.handle("moderation:rejectReport", (_event, reportId: string) => rejectReport(reportId));

  ipcMain.handle("moderation:warnPlayer", (_event, reason: string) => warnPlayer(reason));

  ipcMain.handle("moderation:grantItem", (_event, itemId: string) => grantItem(itemId));

  ipcMain.handle("moderation:revokeItem", (_event, itemId: string) => revokeItem(itemId));

  ipcMain.handle("moderation:adjustCoins", (_event, amount: number, reason: string) => adjustCoins(amount, reason));

  ipcMain.handle("moderation:suspendAccount", (_event, reason: string) => suspendAccount(reason));

  ipcMain.handle("moderation:tempBanAccount", (_event, durationHours: number, reason: string) =>
    tempBanAccount(durationHours, reason)
  );

  ipcMain.handle("moderation:undoAuditEntry", (_event, entryId: string) => undoAuditEntry(entryId));

  ipcMain.handle("moderation:updateSettings", (_event, patch: Partial<ModerationSettings>) =>
    updateModerationSettings(patch)
  );

  ipcMain.handle("moderation:createChatReviewSession", (_event, instanceId: string, windowMinutes: number) =>
    createChatReviewSession(instanceId, windowMinutes)
  );

  ipcMain.handle("moderation:toggleReviewMessageFlag", (_event, sessionId: string, messageIndex: number) =>
    toggleReviewMessageFlag(sessionId, messageIndex)
  );

  ipcMain.handle("moderation:confirmChatReview", (_event, sessionId: string, localPlayerName: string) =>
    confirmChatReview(sessionId, localPlayerName)
  );

  ipcMain.handle("moderation:runAiChatCheck", (_event, sessionId: string, localPlayerName: string) =>
    runAiChatCheck(sessionId, localPlayerName)
  );

  ipcMain.handle(
    "moderation:createSupportTicket",
    (_event, category: SupportTicketCategory, relatedAuditEntryId: string | null, message: string) =>
      createSupportTicket(category, relatedAuditEntryId, message)
  );

  ipcMain.handle("moderation:resolveSupportTicket", (_event, id: string) => resolveSupportTicket(id));

  ipcMain.handle("app:getLaunchInstanceId", () => getLaunchInstanceId());

  ipcMain.handle("instances:createShortcut", (_event, id: string, name: string) => createDesktopShortcut(id, name));

  ipcMain.handle("skin:get", () => getSkinState());

  ipcMain.handle("skin:save", (_event, base64Png: string) => saveCustomSkin(base64Png));

  ipcMain.handle("skin:setGlow", (_event, color: string | null) => setGlowColor(color));

  ipcMain.handle("ai:hasKey", () => hasAiKey());

  ipcMain.handle("ai:setKey", (_event, key: string) => setAiKey(key));

  ipcMain.handle("ai:clearKey", () => clearAiKey());

  ipcMain.handle("ai:suggestMods", (_event, minecraftVersion: string, installedMods: string[], prompt: string) =>
    suggestMods(minecraftVersion, installedMods, prompt)
  );

  ipcMain.handle("settings:updateDiscordRpc", (_event, patch: { enabled?: boolean; clientId?: string | null }) =>
    updateDiscordRpcSettings(patch)
  );

  ipcMain.handle("discord:isConfigured", () => isDiscordConfigured());

  ipcMain.handle("discord:connect", () => connectDiscordRpc());

  ipcMain.handle("discord:disconnect", () => disconnectDiscordRpc());

  ipcMain.handle("discord:isConnected", () => isDiscordRpcConnected());

  ipcMain.handle("discord:setActivity", (_event, details: string, state: string) =>
    setDiscordActivity(details, state)
  );

  ipcMain.handle(
    "settings:updateSpotify",
    (_event, patch: Partial<Omit<AppSettings["spotify"], "controlKey">>) => updateSpotifySettings(patch)
  );

  ipcMain.handle("settings:updateScreensaver", (_event, patch: Partial<AppSettings["screensaver"]>) =>
    updateScreensaverSettings(patch)
  );

  ipcMain.handle("spotify:getPlaybackState", () => getPlaybackState());

  ipcMain.handle("spotify:playPause", () => playPause());

  ipcMain.handle("spotify:next", () => next());

  ipcMain.handle("spotify:previous", () => previous());

  ipcMain.handle("spotify:adjustVolume", (_event, delta: number) => adjustVolume(delta));

  ipcMain.handle("spotify:playUri", async (_event, uri: string) => {
    const { launchCommand } = (await getSettings()).spotify;
    return playUri(uri, launchCommand);
  });

  ipcMain.handle("spotify:search", (_event, query: string) => searchTracks(query));

  ipcMain.handle("spotify:hasClientSecret", () => hasSpotifyClientSecret());

  ipcMain.handle("spotify:setClientSecret", (_event, secret: string) => setSpotifyClientSecret(secret));

  ipcMain.handle("spotify:clearClientSecret", () => clearSpotifyClientSecret());

  ipcMain.handle("spotify:showWidget", () => showSpotifyWidget());

  ipcMain.handle("spotify:hideWidget", () => hideSpotifyWidget());

  ipcMain.handle("spotify:togglePin", () => toggleSpotifyWidgetPin());

  ipcMain.handle("spotify:setPinHotkey", async (_event, accelerator: string) => {
    const ok = registerPinHotkey(accelerator);
    if (ok) await updateSpotifySettings({ pinHotkey: accelerator });
    return ok;
  });

  ipcMain.handle("spotify:setControlKey", async (_event, accelerator: string) => {
    const ok = registerControlHotkey(accelerator);
    if (ok) await updateSpotifySettings({ controlKey: accelerator });
    return ok;
  });

  ipcMain.handle("dialogs:saveTexture", async (event, defaultName: string, base64Png: string) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;
    const filePath = await pickSaveLocation(window, defaultName, ["png"]);
    if (!filePath) return null;
    await writeFile(filePath, Buffer.from(base64Png, "base64"));
    return filePath;
  });

  ipcMain.handle("auth:isConfigured", () => isAuthConfigured());

  ipcMain.handle("auth:loginInteractive", () => loginInteractive());

  ipcMain.handle("auth:loginSilent", () => loginSilent());

  ipcMain.handle("auth:logout", () => msaLogout());

  ipcMain.handle("launch:isRunning", () => isGameRunning());

  ipcMain.handle("launch:kill", () => killActiveGame());

  ipcMain.handle("launch:start", (event, instanceId: string) =>
    launchInstance(instanceId, {
      onLog: (line, stream) => event.sender.send("launch:log", line, stream),
      onJavaProgress: (downloaded, total) => event.sender.send("launch:javaProgress", downloaded, total),
      onExit: (info) => event.sender.send("launch:exit", info)
    })
  );
}
