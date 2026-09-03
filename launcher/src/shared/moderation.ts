export interface ModerationVerdict {
  flagged: boolean;
  reason: string;
}

export interface Report {
  id: string;
  createdAt: string;
  messageText: string;
  playerName: string | null;
  source: "outbox" | "manual";
  aiVerdict: ModerationVerdict | null;
  status: "pending_review" | "approved" | "rejected";
}

export type AuditActionType = "warn" | "itemGrant" | "itemRevoke" | "coinChange" | "accountSuspend" | "accountTempBan";

export interface AuditPreviousState {
  warningCount?: number;
  chatBanUntil?: string | null;
  coins?: number;
  accountStatus?: AccountStatus | null;
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  type: AuditActionType;
  description: string;
  undone: boolean;
  itemId?: string;
  previous: AuditPreviousState;
}

export interface AccountStatus {
  /** null = indefinite suspension; an ISO timestamp = temp ban expiring then. */
  suspended: boolean;
  bannedUntil: string | null;
  reason: string;
}

export interface ChatOutboxEntry {
  timestamp: string;
  playerName: string;
  message: string;
  reported: boolean;
}

export interface ModerationSettings {
  chatBanHours: number;
  escalatedBanHours: number;
  warningsBeforeEscalation: number;
}

export interface ChatReviewMessage {
  timestamp: string;
  playerName: string;
  message: string;
  flagged: boolean;
  aiFlagged: boolean;
  aiReason: string | null;
}

export interface ChatReviewSession {
  id: string;
  createdAt: string;
  instanceId: string;
  windowMinutes: number;
  messages: ChatReviewMessage[];
  status: "open" | "confirmed";
  confirmedAt: string | null;
}

export interface PlayerNotification {
  message: string;
  createdAt: string;
}

export interface PlayerRecord {
  warningCount: number;
  lastWarnedAt: string | null;
  notifications: PlayerNotification[];
}

export type SupportTicketCategory = "warnAppeal" | "bug" | "other";

export interface SupportTicket {
  id: string;
  createdAt: string;
  category: SupportTicketCategory;
  relatedAuditEntryId: string | null;
  message: string;
  status: "open" | "resolved";
}

export interface ModerationState {
  reports: Report[];
  auditLog: AuditEntry[];
  warningCount: number;
  chatBanUntil: string | null;
  accountStatus: AccountStatus | null;
  settings: ModerationSettings;
  chatReviewSessions: ChatReviewSession[];
  /** Keyed by in-game player name — separate from the local, real-enforced
   * warningCount/chatBanUntil above, which only ever applies to whoever is
   * signed into this launcher install. See moderationStore.ts's
   * confirmChatReview for how the two connect. */
  playerRecords: Record<string, PlayerRecord>;
  supportTickets: SupportTicket[];
}
