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

export interface ModerationState {
  reports: Report[];
  auditLog: AuditEntry[];
  warningCount: number;
  chatBanUntil: string | null;
  accountStatus: AccountStatus | null;
}
