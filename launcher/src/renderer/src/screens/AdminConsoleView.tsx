import { useEffect, useState } from "react";
import type { AuditActionType, ChatOutboxEntry } from "../../../shared/moderation";
import { useInvalidateModeration, useModeration } from "../api/useModeration";
import { useEconomy, useInvalidateEconomy, useShopCatalog } from "../api/useEconomy";
import "./AdminConsoleView.css";

type Tab = "reports" | "players" | "log";

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

  const reports = moderation?.reports ?? [];

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

      <div className="admin-console__reports-list">
        {reports.length === 0 && <p className="admin-console__hint">Keine Reports.</p>}
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

  async function undo(id: string): Promise<void> {
    await window.galaxy.moderation.undoAuditEntry(id);
    invalidate();
  }

  const entries = moderation?.auditLog ?? [];

  return (
    <div className="admin-console__tab-content">
      {entries.length === 0 && <p className="admin-console__hint">Noch keine Aktionen protokolliert.</p>}
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

export function AdminConsoleView(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>("reports");

  return (
    <div className="admin-console">
      <h2>Admin-Konsole</h2>
      <p className="admin-console__hint">KI-gestützte Chat-Moderation, Spieler-Verwaltung und ein Log für alles.</p>
      <div className="admin-console__tabs">
        <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>
          Reports
        </button>
        <button className={tab === "players" ? "active" : ""} onClick={() => setTab("players")}>
          Spieler
        </button>
        <button className={tab === "log" ? "active" : ""} onClick={() => setTab("log")}>
          Log
        </button>
      </div>
      {tab === "reports" && <ReportsTab />}
      {tab === "players" && <PlayersTab />}
      {tab === "log" && <LogTab />}
    </div>
  );
}
