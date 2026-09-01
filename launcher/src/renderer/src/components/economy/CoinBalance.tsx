import { useEconomy } from "../../api/useEconomy";
import "./CoinBalance.css";

export function CoinBalance(): React.JSX.Element {
  const { data } = useEconomy();

  return (
    <div className="coin-balance">
      <span className="coin-balance__icon">◈</span>
      <span>{data ? data.coins.toLocaleString("de-DE") : "…"}</span>
    </div>
  );
}
