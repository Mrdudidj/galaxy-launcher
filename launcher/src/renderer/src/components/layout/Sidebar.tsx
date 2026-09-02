import { GalaxyLogo } from "../brand/GalaxyLogo";
import { useEconomy } from "../../api/useEconomy";
import { useViewStore, type AppView } from "../../state/viewStore";
import "./Sidebar.css";

const NAV_ITEMS: { view: AppView; label: string; glyph: string }[] = [
  { view: "home", label: "Home", glyph: "⌂" },
  { view: "shop", label: "Shop", glyph: "$" },
  { view: "locker", label: "Spind", glyph: "▤" },
  { view: "skinEditor", label: "Skin-Editor", glyph: "◐" },
  { view: "founders", label: "Gründer", glyph: "🪐" },
  { view: "settings", label: "Einstellungen", glyph: "⚙" }
];

export function Sidebar(): React.JSX.Element {
  const currentView = useViewStore((s) => s.currentView);
  const setView = useViewStore((s) => s.setView);
  const isInstancesOpen = useViewStore((s) => s.isInstancesOpen);
  const openInstances = useViewStore((s) => s.openInstances);
  const { data: economy } = useEconomy();
  const canModerate = economy?.rank === "owner" || economy?.rank === "admin";

  return (
    <nav className="sidebar">
      <div className="sidebar__brand">
        <GalaxyLogo size={26} />
      </div>
      <div className="sidebar__nav">
        <button
          className={`sidebar__item ${currentView === "home" ? "sidebar__item--active" : ""}`}
          onClick={() => setView("home")}
          title="Home"
        >
          <span className="sidebar__glyph">⌂</span>
        </button>
        <button
          className={`sidebar__item ${isInstancesOpen ? "sidebar__item--active" : ""}`}
          onClick={openInstances}
          title="Instanzen"
        >
          <span className="sidebar__glyph">⌘</span>
        </button>
        {NAV_ITEMS.filter((item) => item.view !== "home").map((item) => (
          <button
            key={item.view}
            className={`sidebar__item ${currentView === item.view ? "sidebar__item--active" : ""}`}
            onClick={() => setView(item.view)}
            title={item.label}
          >
            <span className="sidebar__glyph">{item.glyph}</span>
          </button>
        ))}
        {canModerate && (
          <button
            className={`sidebar__item ${currentView === "adminConsole" ? "sidebar__item--active" : ""}`}
            onClick={() => setView("adminConsole")}
            title="Admin-Konsole"
          >
            <span className="sidebar__glyph">🛡</span>
          </button>
        )}
      </div>
      <div className="sidebar__spacer" />
    </nav>
  );
}
