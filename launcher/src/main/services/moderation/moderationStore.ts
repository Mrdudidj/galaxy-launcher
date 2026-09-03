import { app } from "electron";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  AuditEntry,
  ChatOutboxEntry,
  ChatReviewMessage,
  ChatReviewSession,
  ModerationSettings,
  ModerationState,
  ModerationVerdict,
  PlayerRecord,
  Report,
  SupportTicket,
  SupportTicketCategory
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
  settings: DEFAULT_SETTINGS,
  chatReviewSessions: [],
  playerRecords: {},
  supportTickets: []
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
// `enforce` defaults to true (existing callers are all about the one player
// this app can actually act on); the chat-review flow below passes false for
// anyone who isn't the person signed into this launcher install, since a real
// chat-ban for someone else needs a server this app doesn't have yet — that
// case still gets an audit-log entry, just not a real chatBanUntil/warningCount
// mutation that would otherwise incorrectly restrict the local player.
function applyWarning(state: ModerationState, description: string, enforce = true): void {
  if (!enforce) {
    addAuditEntry(state, { type: "warn", description, previous: {} });
    return;
  }
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

// Chat-Prüfung: review the last N minutes of real, captured /galaxy chat
// (same outbox file the Reports tab's "aus Outbox anlegen" already reads),
// mark individual messages as violations, then either confirm manually or
// let the AI flag everything in one pass. See applyWarning's comment above
// for what "warning" actually means for a player who isn't you.
export async function createChatReviewSession(instanceId: string, windowMinutes: number): Promise<ModerationState> {
  const outbox = await readChatOutbox(instanceId);
  const cutoffMs = Date.now() - windowMinutes * 60_000;
  const messages: ChatReviewMessage[] = outbox
    .filter((entry) => new Date(entry.timestamp).getTime() >= cutoffMs)
    .map((entry) => ({
      timestamp: entry.timestamp,
      playerName: entry.playerName,
      message: entry.message,
      flagged: false,
      aiFlagged: false,
      aiReason: null
    }));

  const session: ChatReviewSession = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    instanceId,
    windowMinutes,
    messages,
    status: "open",
    confirmedAt: null
  };

  const state = await readState();
  state.chatReviewSessions.unshift(session);
  await writeState(state);
  return state;
}

export async function toggleReviewMessageFlag(sessionId: string, messageIndex: number): Promise<ModerationState> {
  const state = await readState();
  const session = state.chatReviewSessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Chat-Prüfung nicht gefunden.");
  const message = session.messages[messageIndex];
  if (!message) throw new Error("Nachricht nicht gefunden.");
  message.flagged = !message.flagged;
  await writeState(state);
  return state;
}

function notificationTextFor(message: ChatReviewMessage): string {
  const when = new Date(message.timestamp);
  const dateStr = when.toLocaleDateString("de-DE");
  const timeStr = when.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `Du hast am ${dateStr} um ${timeStr} geschrieben: "${message.message}" — das verstößt gegen die Regeln. Dafür hast du eine Verwarnung erhalten.`;
}

async function applyChatReviewWarnings(
  state: ModerationState,
  session: ChatReviewSession,
  localPlayerName: string
): Promise<void> {
  for (const message of session.messages) {
    if (!message.flagged) continue;

    const record: PlayerRecord = state.playerRecords[message.playerName] ?? {
      warningCount: 0,
      lastWarnedAt: null,
      notifications: []
    };
    record.warningCount += 1;
    record.lastWarnedAt = new Date().toISOString();
    record.notifications.unshift({ message: notificationTextFor(message), createdAt: new Date().toISOString() });
    state.playerRecords[message.playerName] = record;

    const isLocalPlayer = message.playerName.toLowerCase() === localPlayerName.toLowerCase();
    applyWarning(
      state,
      `Chat-Prüfung: "${message.message.slice(0, 80)}" von ${message.playerName}` +
        (isLocalPlayer ? "" : " (nur protokolliert — kein Server, um andere Spieler zu sperren)"),
      isLocalPlayer
    );
  }
}

export async function confirmChatReview(sessionId: string, localPlayerName: string): Promise<ModerationState> {
  const state = await readState();
  const session = state.chatReviewSessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Chat-Prüfung nicht gefunden.");
  if (session.status === "confirmed") throw new Error("Bereits bestätigt.");

  await applyChatReviewWarnings(state, session, localPlayerName);
  session.status = "confirmed";
  session.confirmedAt = new Date().toISOString();
  await writeState(state);
  return state;
}

// The "AI-Check"-Knopf: scans every message in the session regardless of
// language (see chatModerationService.ts's prompt), flags whatever it judges
// a violation, then immediately confirms — no manual review step, matching
// "dann werden die Spieler automatisch eine Warnung bekommen".
export async function runAiChatCheck(sessionId: string, localPlayerName: string): Promise<ModerationState> {
  const state = await readState();
  const session = state.chatReviewSessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Chat-Prüfung nicht gefunden.");
  if (session.status === "confirmed") throw new Error("Bereits bestätigt.");

  for (const message of session.messages) {
    try {
      const verdict = await reviewMessage(message.message);
      message.aiFlagged = verdict.flagged;
      message.aiReason = verdict.reason;
      if (verdict.flagged) message.flagged = true;
    } catch (error) {
      // No key configured, or this one request failed — leave the message as
      // the admin left it rather than aborting the whole batch.
      message.aiReason = error instanceof Error ? error.message : "KI-Prüfung fehlgeschlagen.";
    }
  }

  await applyChatReviewWarnings(state, session, localPlayerName);
  session.status = "confirmed";
  session.confirmedAt = new Date().toISOString();
  await writeState(state);
  return state;
}

export async function createSupportTicket(
  category: SupportTicketCategory,
  relatedAuditEntryId: string | null,
  message: string
): Promise<ModerationState> {
  const state = await readState();
  const ticket: SupportTicket = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    category,
    relatedAuditEntryId,
    message,
    status: "open"
  };
  state.supportTickets.unshift(ticket);
  await writeState(state);
  return state;
}

export async function resolveSupportTicket(id: string): Promise<ModerationState> {
  const state = await readState();
  const ticket = state.supportTickets.find((t) => t.id === id);
  if (!ticket) throw new Error("Ticket nicht gefunden.");
  ticket.status = "resolved";
  await writeState(state);
  return state;
}
