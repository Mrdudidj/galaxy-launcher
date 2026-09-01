import { createPortal } from "react-dom";
import { useNews } from "../../api/useNews";
import "./NewsPanel.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

export function NewsPanel({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { data: items, isLoading, isError } = useNews();

  // Rendered via a portal straight onto <body>: this panel is triggered from
  // inside the TopBar, whose `backdrop-filter` (for the glass-panel look)
  // establishes a new containing block for `position: fixed` descendants —
  // without the portal this panel is clipped to the 56px topbar instead of
  // covering the viewport.
  return createPortal(
    <div className="news-panel-overlay" onClick={onClose}>
      <div className="news-panel" onClick={(e) => e.stopPropagation()}>
        <div className="news-panel__header">
          <h3>News</h3>
          <button className="news-panel__close" onClick={onClose}>
            ✕
          </button>
        </div>

        {isLoading && <p className="news-panel__hint">Lade News…</p>}
        {isError && <p className="news-panel__hint">News konnten nicht geladen werden.</p>}

        <div className="news-panel__list">
          {items?.map((item) => (
            <article className="news-panel__item" key={item.id}>
              <div className="news-panel__item-date">{formatDate(item.publishedAt)}</div>
              <h4 className="news-panel__item-title">{item.title}</h4>
              <p className="news-panel__item-body">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
