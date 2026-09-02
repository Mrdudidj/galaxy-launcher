export function GalaxyLogo({ size = 40 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Galaxy Launcher">
      <defs>
        <linearGradient id="galaxy-logo-planet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="galaxy-logo-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <ellipse
        cx="50"
        cy="54"
        rx="43"
        ry="12"
        fill="none"
        stroke="url(#galaxy-logo-ring)"
        strokeWidth="9"
        transform="rotate(-16 50 54)"
      />
      <circle cx="49" cy="48" r="25" fill="url(#galaxy-logo-planet)" />
      <circle cx="40" cy="39" r="6.5" fill="#ffffff" opacity="0.14" />
      <circle cx="82" cy="24" r="3.2" fill="#ffffff" opacity="0.85" />
      <circle cx="90" cy="40" r="2.1" fill="#ffffff" opacity="0.6" />
      <circle cx="76" cy="14" r="2.1" fill="#ffffff" opacity="0.5" />
    </svg>
  );
}
