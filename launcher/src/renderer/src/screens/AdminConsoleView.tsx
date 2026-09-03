import { useEffect, useState } from "react";
import type {
  AuditActionType,
  ChatOutboxEntry,
  ChatReviewSession,
  ModerationSettings,
  SupportTicketCategory
} from "../../../shared/moderation";
import { useInvalidateModeration, useModeration } from "../api/useModeration";
import { useEconomy, useInvalidateEconomy, useShopCatalog } from "../api/useEconomy";
import { useAuthStore } from "../state/authStore";
import "./AdminConsoleView.css";

type Tab = "reports" | "chatReview" | "players" | "log" | "manage" | "support";

const TICKET_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  warnAppeal: "Verwarnung war ein Fehler",
  bug: "Bug gefunden",
  other: "Sonstiges"
};

const RANK_LABELS: Record<string, string> = {
  member: "Mitglied",
  vip: "VIP",
  admin: "Admin",
  owner: "Owner"
};

const ACTION_LABELS: Record<AuditActionType, string> = {
  warn: "Verwarnung",
  itemGrant: "Item vergeben",
  itemRevoke: "Item entzogen",
  coinChange: "Münzen geändert",
  accountSuspend: "Account gesperrt",
  accountTempBan: "Account temporär gesperrt"
};

function ReportsTab(): React.JSX.Element {
  const { data: moderation } = useModeration();
  const invalidate = useInvalidateModeration();
  const [instances, setInstances] = useState<{ id: string; name: string }[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [outbox, setOutbox] = useState<ChatOutboxEntry[]>([]);
  const [manualText, setManualText] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    void window.galaxy.instances.list().then((list) => {
      setInstances(list.map((i) => ({ id: i.id, name: i.name })));
      if (list.length > 0) setSelectedInstanceId((current) => current || list[0]!.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedInstanceId) return;
    void window.galaxy.moderation.readChatOutbox(selectedInstanceId).then(setOutbox);
  }, [selectedInstanceId]);

  async function createFromOutbox(entry: ChatOutboxEntry): Promise<void> {
    setBusy(true);
    await window.galaxy.moderation.createReport(entry.message, "outbox", entry.playerName);
    invalidate();
    setBusy(false);
  }

  async function createManual(): Promise<void> {
    if (!manualText.trim()) return;
    setBusy(true);
    await window.galaxy.moderation.createReport(manualText.trim(), "manual", null);
    setManualText("");
    invalidate();
    setBusy(false);
  }

  async function approve(id: string): Promise<void> {
    await window.galaxy.moderation.approveReport(id);
    invalidate();
  }

  async function reject(id: string): Promise<void> {
    await window.galaxy.moderation.rejectReport(id);
    invalidate();
  }

  const allReports = moderation?.reports ?? [];
  const needle = filter.trim().toLowerCase();
  const reports = needle
    ? allReports.filter(
        (r) => r.messageText.toLowerCase().includes(needle) || (r.playerName ?? "").toLowerCase().includes(needle)
      )
    : allReports;

  return (
    <div className="admin-console__tab-content">
      <div className="admin-console__section">
        <span className="admin-console__section-label">Testreport erstellen</span>
        <p className="admin-console__hint">
          Ohne echten Server gibt es noch keine Melde-Warteschlange von anderen Spielern — hier lassen sich Reports
          aus echtem, im Spiel per /galaxy chat gesendetem Text anlegen, oder direkt Text eingeben.
        </p>
        {instances.length > 0 && (
          <div className="admin-console__row">
            <select value={selectedInstanceId} onChange={(e) => setSelectedInstanceId(e.target.value)}>
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {outbox.length === 0 ? (
          <p className="admin-console__hint">Keine echten /galaxy-chat-Nachrichten für diese Instanz gefunden.</p>
        ) : (
          <div className="admin-console__outbox-list">
            {outbox.map((entry, i) => (
              <div className="admin-console__outbox-entry" key={i}>
                <span>
                  {entry.playerName}: {entry.message}
                </span>
                {entry.reported && <span className="admin-console__reported-badge">Gemeldet</span>}
                <button onClick={() => void createFromOutbox(entry)} disabled={busy}>
                  Als Report anlegen
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="admin-console__row">
          <input
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Oder Text direkt eingeben…"
            onKeyDown={(e) => e.key === "Enter" && void createManual()}
          />
          <button onClick={() => void createManual()} disabled={busy}>
            Report anlegen
          </button>
        </div>
      </div>

      {allReports.length > 0 && (
        <div className="admin-console__row">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Reports durchsuchen (Text oder Spielername)…"
          />
        </div>
      )}

      <div className="admin-console__reports-list">
        {reports.length === 0 && (
          <p className="admin-console__hint">{needle ? "Keine Treffer." : "Keine Reports."}</p>
        )}
        {reports.map((report) => (
          <div className={`admin-console__report admin-console__report--${report.status}`} key={report.id}>
            <div className="admin-console__report-text">"{report.messageText}"</div>
            {report.playerName && <div className="admin-console__report-meta">von {report.playerName}</div>}
            {report.aiVerdict ? (
              <div
                className={`admin-console__verdict ${report.aiVerdict.flagged ? "admin-console__verdict--flagged" : ""}`}
              >
                {report.aiVerdict.flagged ? "⚠ KI: Verstoß erkannt" : "✓ KI: Kein Verstoß erkannt"} —{" "}
                {report.aiVerdict.reason}
              </div>
            ) : (
              <div className="admin-console__verdict">KI-Prüfung nicht verfügbar (kein API-Key hinterlegt).</div>
            )}
            {report.status === "pending_review" ? (
              <div className="admin-console__row">
                <button className="admin-console__approve" onClick={() => void approve(report.id)}>
                  Bestätigen (Warn + Bann)
                </button>
                <button className="admin-console__reject" onClick={() => void reject(report.id)}>
                  Ablehnen
                </button>
              </div>
            ) : (
              <div className="admin-console__report-status">{report.status === "approved" ? "Bestätigt" : "Abgelehnt"}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayersTab(): React.JSX.Element {
  const { data: economy } = useEconomy();
  const { data: catalog } = useShopCatalog();
  const { data: moderation } = useModeration();
  const invalidateEconomy = useInvalidateEconomy();
  const invalidateModeration = useInvalidateModeration();
  const [selectedItemId, setSelectedItemId] = useState("");
  const [coinAmount, setCoinAmount] = useState(100);
  const [reason, setReason] = useState("");
  const [tempBanHours, setTempBanHours] = useState(24);

  function refresh(): void {
    invalidateEconomy();
    invalidateModeration();
  }

  async function grant(): Promise<void> {
    if (!selectedItemId) return;
    await window.galaxy.moderation.grantItem(selectedItemId);
    refresh();
  }

  async function revoke(): Promise<void> {
    if (!selectedItemId) return;
    await window.galaxy.moderation.revokeItem(selectedItemId);
    refresh();
  }

  async function giveCoins(): Promise<void> {
    await window.galaxy.moderation.adjustCoins(coinAmount, reason || "Admin-Aktion");
    refresh();
  }

  async function takeCoins(): Promise<void> {
    await window.galaxy.moderation.adjustCoins(-coinAmount, reason || "Admin-Aktion");
    refresh();
  }

  async function warn(): Promise<void> {
    if (!reason.trim()) return;
    await window.galaxy.moderation.warnPlayer(reason.trim());
    refresh();
  }

  async function suspend(): Promise<void> {
    if (!reason.trim()) return;
    await window.galaxy.moderation.suspendAccount(reason.trim());
    refresh();
  }

  async function tempBan(): Promise<void> {
    if (!reason.trim()) return;
    await window.galaxy.moderation.tempBanAccount(tempBanHours, reason.trim());
    refresh();
  }

  const chatBanActive = moderation?.chatBanUntil && new Date(moderation.chatBanUntil) > new Date();

  return (
    <div className="admin-console__tab-content">
      <div className="admin-console__player-card">
        <div className="admin-console__player-stat">
          Münzen: <strong>{economy?.coins ?? 0}</strong>
        </div>
        <div className="admin-console__player-stat">
          Verwarnungen: <strong>{moderation?.warningCount ?? 0}</strong>
        </div>
        <div className="admin-console__player-stat">
          Chat-Status:{" "}
          <strong>
            {chatBanActive ? `Gesperrt bis ${new Date(moderation!.chatBanUntil!).toLocaleString("de-DE")}` : "Nicht gesperrt"}
          </strong>
        </div>
        <div className="admin-console__player-stat">
          Account-Status:{" "}
          <strong>
            {moderation?.accountStatus?.suspended
              ? moderation.accountStatus.bannedUntil
                ? `Temp-gesperrt bis ${new Date(moderation.accountStatus.bannedUntil).toLocaleString("de-DE")}`
                : "Dauerhaft gesperrt"
              : "Aktiv"}
          </strong>
        </div>
      </div>

      {moderation && Object.keys(moderation.playerRecords).length > 0 && (
        <div className="admin-console__section">
          <span className="admin-console__section-label">Spieler aus Chat-Prüfungen</span>
          <p className="admin-console__hint">
            Über die Chat-Prüfung markierte Spieler, mit ihrer jeweiligen Verwarnungs-Historie.
          </p>
          <div className="admin-console__log-list">
            {Object.entries(moderation.playerRecords).map(([name, record]) => (
              <div className="admin-console__log-entry" key={name}>
                <div className="admin-console__log-type">{name}</div>
                <div className="admin-console__log-description">
                  {record.warningCount}× verwarnt
                  {record.notifications[0] ? ` · zuletzt: "${record.notifications[0].message.slice(0, 60)}..."` : ""}
                </div>
                <div className="admin-console__log-time">
                  {record.lastWarnedAt ? new Date(record.lastWarnedAt).toLocaleString("de-DE") : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-console__section">
        <span className="admin-console__section-label">Spind-Item</span>
        <div className="admin-console__row">
          <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
            <option value="">Item wählen…</option>
            {catalog?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button onClick={() => void grant()} disabled={!selectedItemId}>
            Vergeben
          </button>
          <button onClick={() => void revoke()} disabled={!selectedItemId}>
            Entziehen
          </button>
        </div>
      </div>

      <div className="admin-console__section">
        <span className="admin-console__section-label">Münzen</span>
        <div className="admin-console__row">
          <input type="number" value={coinAmount} onChange={(e) => setCoinAmount(Number(e.target.value))} />
          <button onClick={() => void giveCoins()}>Geben</button>
          <button onClick={() => void takeCoins()}>Entziehen</button>
        </div>
      </div>

      <div className="admin-console__section">
        <span className="admin-console__section-label">Grund (für Verwarnung/Sperre)</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z. B. Beleidigung im Chat" />
      </div>

      <div className="admin-console__section admin-console__section--danger">
        <span className="admin-console__section-label">Verwarnung &amp; Sperren</span>
        <div className="admin-console__row">
          <button onClick={() => void warn()} disabled={!reason.trim()}>
            Verwarnen
          </button>
        </div>
        <div className="admin-console__row">
          <button className="admin-console__danger" onClick={() => void suspend()} disabled={!reason.trim()}>
            Account dauerhaft sperren
          </button>
        </div>
        <div className="admin-console__row">
          <input type="number" value={tempBanHours} onChange={(e) => setTempBanHours(Number(e.target.value))} />
          <span>Stunden</span>
          <button className="admin-console__danger" onClick={() => void tempBan()} disabled={!reason.trim()}>
            Account temporär sperren
          </button>
        </div>
        <p className="admin-console__hint">
          Account-Sperren werden erfasst und protokolliert, aber noch nicht beim Start durchgesetzt — das braucht
          den echten Server. Die Chat-Sperre aus Verwarnungen wirkt dagegen schon jetzt wirklich im Spiel.
        </p>
      </div>
    </div>
  );
}

function LogTab(): React.JSX.Element {
  const { data: moderation } = useModeration();
  const invalidate = useInvalidateModeration();
  const [filter, setFilter] = useState("");

  async function undo(id: string): Promise<void> {
    await window.galaxy.moderation.undoAuditEntry(id);
    invalidate();
  }

  const allEntries = moderation?.auditLog ?? [];
  const needle = filter.trim().toLowerCase();
  const entries = needle
    ? allEntries.filter(
        (e) => e.description.toLowerCase().includes(needle) || ACTION_LABELS[e.type].toLowerCase().includes(needle)
      )
    : allEntries;

  return (
    <div className="admin-console__tab-content">
      {allEntries.length === 0 && <p className="admin-console__hint">Noch keine Aktionen protokolliert.</p>}
      {allEntries.length > 0 && (
        <div className="admin-console__row">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Log durchsuchen…" />
        </div>
      )}
      {allEntries.length > 0 && entries.length === 0 && <p className="admin-console__hint">Keine Treffer.</p>}
      <div className="admin-console__log-list">
        {entries.map((entry) => (
          <div
            className={`admin-console__log-entry ${entry.undone ? "admin-console__log-entry--undone" : ""}`}
            key={entry.id}
          >
            <div className="admin-console__log-type">{ACTION_LABELS[entry.type]}</div>
            <div className="admin-console__log-description">{entry.description}</div>
            <div className="admin-console__log-time">{new Date(entry.createdAt).toLocaleString("de-DE")}</div>
            {!entry.undone ? (
              <button onClick={() => void undo(entry.id)}>Rückgängig</button>
            ) : (
              <span className="admin-console__undone-badge">Rückgängig gemacht</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageTab(): React.JSX.Element {
  const { data: economy } = useEconomy();
  const { data: moderation } = useModeration();
  const invalidate = useInvalidateModeration();
  const [settings, setSettings] = useState<ModerationSettings | null>(null);
  const [copied, setCopied] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [unlimited, setUnlimited] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (moderation?.settings) setSettings(moderation.settings);
  }, [moderation?.settings]);

  async function save(): Promise<void> {
    if (!settings) return;
    await window.galaxy.moderation.updateSettings(settings);
    invalidate();
  }

  async function generateCode(): Promise<void> {
    setGenerating(true);
    const code = await window.galaxy.economy.generateAdminCode(unlimited ? null : durationDays);
    setGeneratedCode(code);
    setGenerating(false);
  }

  async function copyCode(): Promise<void> {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isOwner = economy?.rank === "owner";

  return (
    <div className="admin-console__tab-content">
      <div className="admin-console__section">
        <span className="admin-console__section-label">Dein Rang</span>
        <p className="admin-console__hint">
          Aktueller Rang auf diesem Gerät: <strong>{RANK_LABELS[economy?.rank ?? "member"]}</strong>
        </p>
      </div>

      {isOwner && (
        <div className="admin-console__section">
          <span className="admin-console__section-label">Jemandem Admin geben</span>
          <p className="admin-console__hint">
            Erzeugt einen einmaligen, zufälligen Code — im Shop unter „Code einlösen" bekommt die Person damit auf
            ihrem eigenen Gerät befristet Zugriff auf diese Konsole. Nach Ablauf der gewählten Dauer fällt der Rang
            automatisch zurück. Wichtig: es gibt noch keinen echten Server, der Konten geräteübergreifend verbindet
            — der Code schaltet die Konsole nur auf dem Gerät frei, auf dem er eingelöst wird, mit eigenen, lokalen
            Reports und Log. Sobald es einen echten Server gibt, wird daraus eine echte, geteilte Berechtigung.
          </p>
          <div className="admin-console__row">
            <label className="admin-console__inline-toggle">
              <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
              Unbegrenzt
            </label>
            {!unlimited && (
              <>
                <input
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                />
                <span>Tage</span>
              </>
            )}
            <button onClick={() => void generateCode()} disabled={generating}>
              Code generieren
            </button>
          </div>
          {generatedCode && (
            <div className="admin-console__row">
              <input value={generatedCode} readOnly />
              <button onClick={() => void copyCode()}>{copied ? "Kopiert!" : "Kopieren"}</button>
            </div>
          )}
        </div>
      )}

      <div className="admin-console__section">
        <span className="admin-console__section-label">Chat-Sperre — Dauer</span>
        <p className="admin-console__hint">
          Wie lange eine bestätigte Verwarnung den Galaxy-Chat sperrt, und ab wie vielen Verwarnungen die längere
          Sperre greift.
        </p>
        {settings && (
          <>
            <div className="admin-console__row">
              <span>Normale Sperre (Stunden)</span>
              <input
                type="number"
                min={1}
                value={settings.chatBanHours}
                onChange={(e) => setSettings({ ...settings, chatBanHours: Number(e.target.value) })}
              />
            </div>
            <div className="admin-console__row">
              <span>Verlängerte Sperre (Stunden)</span>
              <input
                type="number"
                min={1}
                value={settings.escalatedBanHours}
                onChange={(e) => setSettings({ ...settings, escalatedBanHours: Number(e.target.value) })}
              />
            </div>
            <div className="admin-console__row">
              <span>Verwarnungen bis Verlängerung</span>
              <input
                type="number"
                min={1}
                value={settings.warningsBeforeEscalation}
                onChange={(e) => setSettings({ ...settings, warningsBeforeEscalation: Number(e.target.value) })}
              />
            </div>
            <div className="admin-console__row">
              <button onClick={() => void save()}>Speichern</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChatReviewTab(): React.JSX.Element {
  const { data: moderation } = useModeration();
  const invalidate = useInvalidateModeration();
  const playerName = useAuthStore((s) => s.playerName);
  const [instances, setInstances] = useState<{ id: string; name: string }[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [windowMinutes, setWindowMinutes] = useState(5);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.galaxy.instances.list().then((list) => {
      setInstances(list.map((i) => ({ id: i.id, name: i.name })));
      if (list.length > 0) setSelectedInstanceId((current) => current || list[0]!.id);
    });
  }, []);

  async function createSession(): Promise<void> {
    if (!selectedInstanceId) return;
    setBusy(true);
    await window.galaxy.moderation.createChatReviewSession(selectedInstanceId, windowMinutes);
    invalidate();
    setBusy(false);
  }

  async function toggleFlag(sessionId: string, index: number): Promise<void> {
    await window.galaxy.moderation.toggleReviewMessageFlag(sessionId, index);
    invalidate();
  }

  async function confirm(sessionId: string): Promise<void> {
    setBusy(true);
    await window.galaxy.moderation.confirmChatReview(sessionId, playerName ?? "");
    invalidate();
    setBusy(false);
  }

  async function aiCheck(sessionId: string): Promise<void> {
    setBusy(true);
    await window.galaxy.moderation.runAiChatCheck(sessionId, playerName ?? "");
    invalidate();
    setBusy(false);
  }

  const sessions = moderation?.chatReviewSessions ?? [];

  return (
    <div className="admin-console__tab-content">
      <div className="admin-console__section">
        <span className="admin-console__section-label">Neue Chat-Prüfung</span>
        <p className="admin-console__hint">
          Holt die echten, per /galaxy chat gesendeten Nachrichten der letzten Minuten und legt sie zur Prüfung ab.
        </p>
        {instances.length > 0 && (
          <div className="admin-console__row">
            <select value={selectedInstanceId} onChange={(e) => setSelectedInstanceId(e.target.value)}>
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(Number(e.target.value))}
              style={{ maxWidth: 70 }}
            />
            <span>Minuten</span>
            <button onClick={() => void createSession()} disabled={busy}>
              Prüfung erstellen
            </button>
          </div>
        )}
      </div>

      {sessions.length === 0 && <p className="admin-console__hint">Noch keine Chat-Prüfungen.</p>}

      <div className="admin-console__review-list">
        {sessions.map((session: ChatReviewSession) => {
          const flaggedCount = session.messages.filter((m) => m.flagged).length;
          const isOpen = openSessionId === session.id;
          return (
            <div className="admin-console__review-session" key={session.id}>
              <div className="admin-console__review-session-header">
                <span>
                  {new Date(session.createdAt).toLocaleString("de-DE")} · {session.windowMinutes} Min ·{" "}
                  {session.messages.length} Nachrichten
                  {flaggedCount > 0 && ` · ${flaggedCount} markiert`}
                </span>
                <span className={`admin-console__review-status admin-console__review-status--${session.status}`}>
                  {session.status === "confirmed" ? "Bestätigt" : "Offen"}
                </span>
                <button onClick={() => setOpenSessionId(isOpen ? null : session.id)}>
                  {isOpen ? "Schließen" : "Bearbeiten"}
                </button>
              </div>

              {isOpen && (
                <div className="admin-console__review-body">
                  {session.messages.length === 0 && (
                    <p className="admin-console__hint">Keine Nachrichten in diesem Zeitraum.</p>
                  )}
                  <div className="admin-console__review-messages">
                    {session.messages.map((message, index) => (
                      <label
                        key={index}
                        className={`admin-console__review-message ${message.flagged ? "admin-console__review-message--flagged" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={message.flagged}
                          disabled={session.status === "confirmed"}
                          onChange={() => void toggleFlag(session.id, index)}
                        />
                        <span className="admin-console__review-message-time">
                          {new Date(message.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="admin-console__review-message-player">{message.playerName}</span>
                        <span className="admin-console__review-message-text">{message.message}</span>
                        {message.aiFlagged && (
                          <span className="admin-console__review-message-ai" title={message.aiReason ?? ""}>
                            KI: Verstoß
                          </span>
                        )}
                      </label>
                    ))}
                  </div>

                  {session.status === "open" && (
                    <>
                      {flaggedCount > 0 && (
                        <div className="admin-console__section">
                          <span className="admin-console__section-label">Markiert — wird bestätigt für</span>
                          {session.messages
                            .filter((m) => m.flagged)
                            .map((m, i) => (
                              <div className="admin-console__review-flagged-entry" key={i}>
                                {m.playerName}: "{m.message}"
                              </div>
                            ))}
                        </div>
                      )}
                      <div className="admin-console__row">
                        <button onClick={() => void confirm(session.id)} disabled={busy || flaggedCount === 0}>
                          Bestätigen ({flaggedCount})
                        </button>
                        <button onClick={() => void aiCheck(session.id)} disabled={busy}>
                          KI-Check (automatisch)
                        </button>
                      </div>
                      <p className="admin-console__hint">
                        Verwarnung gilt real (echte Chat-Sperre) nur für dich selbst — bei anderen Spielernamen wird
                        sie protokolliert und die Benachrichtigung als Text hinterlegt, aber nicht wirklich
                        zugestellt, solange es keinen echten Server gibt.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SupportTab(): React.JSX.Element {
  const { data: moderation } = useModeration();
  const invalidate = useInvalidateModeration();
  const [category, setCategory] = useState<SupportTicketCategory>("bug");
  const [relatedEntryId, setRelatedEntryId] = useState("");
  const [message, setMessage] = useState("");

  async function create(): Promise<void> {
    if (!message.trim()) return;
    await window.galaxy.moderation.createSupportTicket(category, relatedEntryId || null, message.trim());
    setMessage("");
    setRelatedEntryId("");
    invalidate();
  }

  async function resolve(id: string): Promise<void> {
    await window.galaxy.moderation.resolveSupportTicket(id);
    invalidate();
  }

  const tickets = moderation?.supportTickets ?? [];
  const auditLog = moderation?.auditLog ?? [];

  return (
    <div className="admin-console__tab-content">
      <div className="admin-console__section">
        <span className="admin-console__section-label">Neues Ticket</span>
        <p className="admin-console__hint">
          Für alles rund um den Launcher selbst — z. B. „Verwarnung 2 war ein Fehler, bitte nochmal prüfen" oder ein
          gefundener Bug. Bleibt lokal in diesem Log, damit nichts vergessen wird.
        </p>
        <div className="admin-console__row">
          <select value={category} onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}>
            {(Object.keys(TICKET_CATEGORY_LABELS) as SupportTicketCategory[]).map((c) => (
              <option key={c} value={c}>
                {TICKET_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          {category === "warnAppeal" && (
            <select value={relatedEntryId} onChange={(e) => setRelatedEntryId(e.target.value)}>
              <option value="">Log-Eintrag wählen (optional)…</option>
              {auditLog
                .filter((e) => e.type === "warn")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.description.slice(0, 50)}
                  </option>
                ))}
            </select>
          )}
        </div>
        <div className="admin-console__row">
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Beschreibung…" />
          <button onClick={() => void create()} disabled={!message.trim()}>
            Ticket erstellen
          </button>
        </div>
      </div>

      {tickets.length === 0 && <p className="admin-console__hint">Keine Tickets.</p>}
      <div className="admin-console__log-list">
        {tickets.map((ticket) => (
          <div
            className={`admin-console__log-entry ${ticket.status === "resolved" ? "admin-console__log-entry--undone" : ""}`}
            key={ticket.id}
          >
            <div className="admin-console__log-type">{TICKET_CATEGORY_LABELS[ticket.category]}</div>
            <div className="admin-console__log-description">{ticket.message}</div>
            <div className="admin-console__log-time">{new Date(ticket.createdAt).toLocaleString("de-DE")}</div>
            {ticket.status === "open" ? (
              <button onClick={() => void resolve(ticket.id)}>Erledigt</button>
            ) : (
              <span className="admin-console__undone-badge">Erledigt</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsBar(): React.JSX.Element {
  const { data: moderation } = useModeration();
  const reports = moderation?.reports ?? [];
  const pending = reports.filter((r) => r.status === "pending_review").length;
  const chatBanActive = moderation?.chatBanUntil && new Date(moderation.chatBanUntil) > new Date();

  return (
    <div className="admin-console__stats">
      <div className="admin-console__stat">
        <span className="admin-console__stat-value">{reports.length}</span>
        <span className="admin-console__stat-label">Reports</span>
      </div>
      <div className="admin-console__stat">
        <span className="admin-console__stat-value">{pending}</span>
        <span className="admin-console__stat-label">Offen</span>
      </div>
      <div className="admin-console__stat">
        <span className="admin-console__stat-value">{moderation?.warningCount ?? 0}</span>
        <span className="admin-console__stat-label">Verwarnungen</span>
      </div>
      <div className={`admin-console__stat ${chatBanActive ? "admin-console__stat--warn" : ""}`}>
        <span className="admin-console__stat-value">{chatBanActive ? "Gesperrt" : "Frei"}</span>
        <span className="admin-console__stat-label">Chat-Status</span>
      </div>
    </div>
  );
}

export function AdminConsoleView(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>("reports");

  return (
    <div className="admin-console">
      <h2>Admin-Konsole</h2>
      <p className="admin-console__hint">KI-gestützte Chat-Moderation, Spieler-Verwaltung und ein Log für alles.</p>
      <StatsBar />
      <div className="admin-console__tabs">
        <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>
          Reports
        </button>
        <button className={tab === "chatReview" ? "active" : ""} onClick={() => setTab("chatReview")}>
          Chat-Prüfung
        </button>
        <button className={tab === "players" ? "active" : ""} onClick={() => setTab("players")}>
          Spieler
        </button>
        <button className={tab === "log" ? "active" : ""} onClick={() => setTab("log")}>
          Log
        </button>
        <button className={tab === "manage" ? "active" : ""} onClick={() => setTab("manage")}>
          Verwaltung
        </button>
        <button className={tab === "support" ? "active" : ""} onClick={() => setTab("support")}>
          Support
        </button>
      </div>
      {tab === "reports" && <ReportsTab />}
      {tab === "chatReview" && <ChatReviewTab />}
      {tab === "players" && <PlayersTab />}
      {tab === "log" && <LogTab />}
      {tab === "manage" && <ManageTab />}
      {tab === "support" && <SupportTab />}
    </div>
  );
}
