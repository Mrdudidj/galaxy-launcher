// Real per-item silhouettes instead of a bare emoji — same inline-SVG pattern
// GalaxyLogo.tsx already uses. Only hats and outfits get a distinct shape
// (glow keeps a swatch look, emotes already have their own 3D hover-preview,
// which is the real content, not a placeholder).
const HAT_SHAPES: Record<string, string> = {
  "hat-nebula-crown": "M20,72 L20,52 L35,64 L50,32 L65,64 L80,52 L80,72 Z",
  "hat-vip-diadem": "M18,58 Q50,40 82,58 L82,66 Q50,50 18,66 Z",
  "hat-starmap-hood": "M50,22 C28,22 18,42 22,66 C30,58 38,54 50,54 C62,54 70,58 78,66 C82,42 72,22 50,22 Z",
  "hat-comet-helmet": "M50,24 A26,26 0 1 0 50.1,24 Z",
  "hat-astro-visor": "M16,46 Q50,34 84,46 L84,58 Q50,48 16,58 Z"
};

const COMET_TAIL = "M28,52 L8,60 L26,64 Z";

const OUTFIT_SHAPE =
  "M50,20 L62,30 L58,34 L58,80 L42,80 L42,34 L38,30 Z M30,36 L42,34 L42,46 L26,50 Z M70,36 L58,34 L58,46 L74,50 Z";

const WINGS_SHAPE =
  "M48,30 C34,26 16,32 10,48 C22,44 34,44 44,50 C34,52 24,58 18,68 C30,66 42,60 48,52 Z " +
  "M52,30 C66,26 84,32 90,48 C78,44 66,44 56,50 C66,52 76,58 82,68 C70,66 58,60 52,52 Z";

const PET_ID = "pet-galaxy-companion";
const WINGS_ID = "wings-nova";

export function CosmeticIcon({
  itemId,
  colorFrom,
  colorTo
}: {
  itemId: string;
  colorFrom: string;
  colorTo: string;
}): React.JSX.Element {
  const gradientId = `cosmetic-icon-${itemId}`;
  const hatShape = HAT_SHAPES[itemId];
  const isOutfit = itemId.startsWith("outfit-");
  const isPet = itemId === PET_ID;
  const isWings = itemId === WINGS_ID;

  return (
    <svg width="60%" height="60%" viewBox="0 0 100 100" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colorFrom} />
          <stop offset="100%" stopColor={colorTo} />
        </linearGradient>
      </defs>
      {hatShape && <path d={hatShape} fill={`url(#${gradientId})`} />}
      {itemId === "hat-comet-helmet" && <path d={COMET_TAIL} fill={`url(#${gradientId})`} opacity={0.7} />}
      {isOutfit && <path d={OUTFIT_SHAPE} fill={`url(#${gradientId})`} />}
      {isWings && <path d={WINGS_SHAPE} fill={`url(#${gradientId})`} />}
      {isPet && (
        <>
          <ellipse cx="50" cy="50" rx="34" ry="10" fill="none" stroke={`url(#${gradientId})`} strokeWidth="4" transform="rotate(-16 50 50)" />
          <circle cx="50" cy="46" r="20" fill={`url(#${gradientId})`} />
          <circle cx="70" cy="24" r="2" fill="white" opacity="0.85" />
          <circle cx="78" cy="36" r="1.3" fill="white" opacity="0.6" />
        </>
      )}
    </svg>
  );
}

export function hasCosmeticIcon(itemId: string): boolean {
  return itemId in HAT_SHAPES || itemId.startsWith("outfit-") || itemId === PET_ID || itemId === WINGS_ID;
}
