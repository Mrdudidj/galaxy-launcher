import { useState } from "react";
import { useEconomy } from "../../api/useEconomy";
import { CoinBalance } from "../economy/CoinBalance";
import { GlowingName } from "../economy/GlowingName";
import { RankBadge } from "../economy/RankBadge";
import { NewsPanel } from "../news/NewsPanel";
import { useAuthStore } from "../../state/authStore";
import "./TopBar.css";

export function TopBar(): React.JSX.Element {
  const [showNews, setShowNews] = useState(false);
  const playerName = useAuthStore((s) => s.playerName);
  const isDevBypass = useAuthStore((s) => s.isDevBypass);
  const logout = useAuthStore((s) => s.logout);
  const { data: economy } = useEconomy();

  return (
    <header className="topbar">
      <div className="topbar__title">Galaxy Launcher</div>
      <div className="topbar__actions">
        <CoinBalance />
        <button className="topbar__news" title="News" onClick={() => setShowNews(true)}>
          📰
        </button>
        <RankBadge rank={economy?.rank} />
        <button className="topbar__account" onClick={logout} title="Abmelden">
          <span className="topbar__account-name">
            <GlowingName name={playerName ?? ""} glowColor={economy?.nameGlowColor ?? null} />
            {isDevBypass && <span className="topbar__account-dev"> (Dev)</span>}
          </span>
        </button>
      </div>

      {showNews && <NewsPanel onClose={() => setShowNews(false)} />}
    </header>
  );
}
