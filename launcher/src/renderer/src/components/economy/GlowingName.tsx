import "./GlowingName.css";

export function GlowingName({ name, glowColor }: { name: string; glowColor: string | null }): React.JSX.Element {
  if (!glowColor) return <>{name}</>;
  return (
    <span className="glowing-name" style={{ "--glow-color": glowColor } as React.CSSProperties}>
      {name}
    </span>
  );
}
