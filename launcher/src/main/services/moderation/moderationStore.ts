import { app } from "electron";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AuditEntry,
  ChatOutboxEntry,
  ModerationSettings,
  ModerationState,
  ModerationVerdict,
  Report
} from "../../../shared/moderation.js";
import { SHOP_CATALOG } from "../economy/shopCatalog.js";
import { adminAdjustCoins, adminGrantItem, adminRevokeItem, getEconomy } from "../economy/economyStore.js";
import { getInstanceGameDir } from "../instances/instancePaths.js";
import { reviewMessage } from "./chatModerationService.js";

const DEFAULT_SETTINGS: ModerationSettings = {
  chatBanHours: 24,
  escalatedBanHours: 24 * 7,
  warningsBeforeEscalation: 3
};

const DEFAULT_STATE: ModerationState = {
  reports: [],
  auditLog: [],
  warningCount: 0,
  chatBanUntil: null,
  accountStatus: null,
  settings: DEFAULT_SETTINGS
};

function moderationPath(): string {
  return join(app.getPath("userData"), "moderation.json");
}

async function readState(): Promise<ModerationState> {
  try {
    const raw = await readFile(moderationPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<ModerationState>;
    // Merged one level deep — a moderation.json saved before `settings`
    // existed would otherwise lose the new ban-duration defaults to `undefined`.
    return { ...DEFAULT_STATE, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeState(state: ModerationState): Promise<void> {
  await writeFile(moderationPath(), JSON.stringify(state, null, 2), "utf-8");
}

export async function getModerationState(): Promise<ModerationState> {
  return readState();
}

export async function updateModerationSettings(patch: Partial<ModerationSettings>): Promise<ModerationState> {
  const state = await readState();
  state.settings = { ...state.settings, ...patch };
  await writeState(state);
  return state;
}

// Real captured text from an actual play session — see GalaxyChatOutbox.java —
// not sample data. Missing/empty is the normal case for an instance that was
// never played with Galaxy-Chat active, not an error.
export async function readChatOutbox(instanceId: string): Promise<ChatOutboxEntry[]> {
  try {
    const raw = await readFile(`${getInstanceGameDir(instanceId)}/config/galaxychat-outbox.json`, "utf-8");
    const parsed = JSON.parse(raw) as { messages?: ChatOutboxEntry[] };
    return parsed.messages ?? [];
  } catch {
    return [];
  }
}

export async function createReport(
  messageText: string,
  source: "outbox" | "manual",
  playerName: string | null
): Promise<Report> {
  let aiVerdict: ModerationVerdict | null = null;
  try {
    aiVerdict = await reviewMessage(messageText);
  } catch {
    // No key configured, or the request failed — the admin can still decide
    // manually; the report just won't carry an AI opinion.
  }

  const report: Report = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    messageText,
    playerName,
    source,
    aiVerdict,
    status: "pending_review"
  };

  const state = await readState();
  state.reports.unshift(report);
  await writeState(state);
  return report;
}

function addAuditEntry(state: ModerationState, entry: Omit<AuditEntry, "id" | "createdAt" | "undone">): AuditEntry {
  const full: AuditEntry = { ...entry, id: randomUUID(), createdAt: new Date().toISOString(), undone: false };
  state.auditLog.unshift(full);
  return full;
}

// Shared by "approve a report" and "manually warn" — a confirmed violation
// always goes through the same escalation, regardless of where it came from.
function applyWarning(state: ModerationState, description: string): void {
  const previous = { warningCount: state.warningCount, chatBanUntil: state.chatBanUntil };
  state.warningCount += 1;
  const hours =
    state.warningCount >= state.settings.warningsBeforeEscalation
      ? state.settings.escalatedBanHours
      : state.settings.chatBanHours;
  state.chatBanUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  addAuditEntry(state, { type: "warn", description, previous });
}

export async function approveReport(reportId: string): Promise<ModerationState> {
  const state = await readState();
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) throw new Error("Report nicht gefunden.");
  report.status = "approved";
  applyWarning(state, `Report bestätigt: "${report.messageText.slice(0, 80)}"`);
  await writeState(state);
  return state;
}

export async function rejectReport(reportId: string): Promise<ModerationState> {
  const state = await readState();
  const report = state.reports.find((r) => r.id === reportId);
  if (!report) throw new Error("Report nicht gefunden.");
  report.status = "rejected";
  await writeState(state);
  return state;
}

export async function warnPlayer(reason: string): Promise<ModerationState> {
  const state = await readState();
  applyWarning(state, reason);
  await writeState(state);
  return state;
}

export async function grantItem(itemId: string): Promise<ModerationState> {
  const item = SHOP_CATALOG.find((i) => i.id === itemId);
  if (!item) throw new Error(`Unbekannter Artikel: ${itemId}`);
  await adminGrantItem(itemId);
  const state = await readState();
  addAuditEntry(state, { type: "itemGrant", description: `"${item.name}" vergeben`, itemId, previous: {} });
  await writeState(state);
  return state;
}

export async function revokeItem(itemId: string): Promise<ModerationState> {
  const item = SHOP_CATALOG.find((i) => i.id === itemId);
  if (!item) throw new Error(`Unbekannter Artikel: ${itemId}`);
  await adminRevokeItem(itemId);
  const state = await readState();
  addAuditEntry(state, { type: "itemRevoke", description: `"${item.name}" entzogen`, itemId, previous: {} });
  await writeState(state);
  return state;
}

export async function adjustCoins(amount: number, reason: string): Promise<ModerationState> {
  const before = await getEconomy();
  await adminAdjustCoins(amount);
  const state = await readState();
  addAuditEntry(state, {
    type: "coinChange",
    description: `${amount >= 0 ? "+" : ""}${amount} Münzen — ${reason}`,
    previous: { coins: before.coins }
  });
  await writeState(state);
  return state;
}

export async function suspendAccount(reason: string): Promise<ModerationState> {
  const state = await readState();
  const previous = { accountStatus: state.accountStatus };
  state.accountStatus = { suspended: true, bannedUntil: null, reason };
  addAuditEntry(state, { type: "accountSuspend", description: `Account gesperrt — ${reason}`, previous });
  await writeState(state);
  return state;
}

export async function tempBanAccount(durationHours: number, reason: string): Promise<ModerationState> {
  const state = await readState();
  const previous = { accountStatus: state.accountStatus };
  const bannedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  state.accountStatus = { suspended: true, bannedUntil, reason };
  addAuditEntry(state, {
    type: "accountTempBan",
    description: `Account für ${durationHours}h gesperrt — ${reason}`,
    previous
  });
  await writeState(state);
  return state;
}

export async function undoAuditEntry(entryId: string): Promise<ModerationState> {
  const state = await readState();
  const entry = state.auditLog.find((e) => e.id === entryId);
  if (!entry) throw new Error("Log-Eintrag nicht gefunden.");
  if (entry.undone) throw new Error("Bereits rückgängig gemacht.");

  switch (entry.type) {
    case "warn":
      state.warningCount = entry.previous.warningCount ?? state.warningCount;
      state.chatBanUntil = entry.previous.chatBanUntil ?? null;
      break;
    case "itemGrant":
      if (entry.itemId) await adminRevokeItem(entry.itemId);
      break;
    case "itemRevoke":
      if (entry.itemId) await adminGrantItem(entry.itemId);
      break;
    case "coinChange": {
      const current = await getEconomy();
      const restoreTo = entry.previous.coins ?? current.coins;
      await adminAdjustCoins(restoreTo - current.coins);
      break;
    }
    case "accountSuspend":
    case "accountTempBan":
      state.accountStatus = entry.previous.accountStatus ?? null;
      break;
  }

  entry.undone = true;
  await writeState(state);
  return state;
}
