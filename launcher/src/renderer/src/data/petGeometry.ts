// Mirrors the companion built in the mod's PetRenderLayer.java for the
// launcher's own preview. Worked out empirically in a scratch Three.js harness
// (not derived from any vanilla model geometry the way hats were — a floating
// companion has no "attach point" to measure against) — the first attempt sat
// right on top of the arm/shoulder and had to be pushed further out and up to
// read as a separate floating object rather than clipping into the body.
export interface PetDefinition {
  offset: [number, number, number];
  scale: number;
  // Flat colors, not a texture map: unlike the box-shaped hats (whose UVs
  // match Minecraft's per-face pixel-art convention), this is a smooth
  // SphereGeometry/TorusGeometry — wrapping a 16x16 hand-painted texture
  // around a sphere pinches badly at the poles and just looks like noise.
  // A flat gradient-ish color reads far better on curved geometry.
  planetColor: string;
  ringColor: string;
}

export const PET_GEOMETRY: Record<string, PetDefinition> = {
  "pet-galaxy-companion": {
    // Low near the ground, trailing behind (negative Z is behind the player —
    // confirmed empirically, not assumed: a positive-Z guess put it in front).
    offset: [0, -14, -7],
    scale: 1.0,
    planetColor: "#7c3aed",
    ringColor: "#22d3ee"
  }
};
