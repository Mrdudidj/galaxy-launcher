import type { Rank } from "../../../../shared/economy";
import "./RankBadge.css";

const RANK_LABELS: Partial<Record<Rank, { label: string; glyph: string }>> = {
  owner: { label: "Owner", glyph: "♛" },
  vip: { label: "VIP", glyph: "★" }
};

export function RankBadge({ rank }: { rank: Rank | undefined }): React.JSX.Element | null {
  if (!rank || rank === "member") return null;
  const info = RANK_LABELS[rank];
  if (!info) return null;

  return (
    <span className={`rank-badge rank-badge--${rank}`}>
      {info.glyph} {info.label}
    </span>
  );
}
