// Mirrors the companion built in the mod's PetRenderLayer.java for the
// launcher's own preview. Worked out empirically in a scratch Three.js harness
// (not derived from any vanilla model geometry the way hats were — a floating
// companion has no "attach point" to measure against) — the first attempt sat
// right on top of the arm/shoulder and had to be pushed further out and up to
// read as a separate floating object rather than clipping into the body.
export interface PetDefinition {
  offset: [number, number, number];
  scale: number;
  /** File names under assets/textures/pets/ — see textureAssets.ts. */
  planetTexture: string;
  ringTexture: string;
}

export const PET_GEOMETRY: Record<string, PetDefinition> = {
  "pet-galaxy-companion": {
    // Low near the ground, trailing behind (negative Z is behind the player —
    // confirmed empirically, not assumed: a positive-Z guess put it in front).
    offset: [0, -14, -7],
    scale: 1.0,
    planetTexture: "galaxy-companion-planet.png",
    ringTexture: "galaxy-companion-ring.png"
  }
};
