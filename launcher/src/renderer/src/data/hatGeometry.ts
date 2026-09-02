// Mirrors the shapes built in HatRenderLayer.java for the launcher's own 3D
// preview — same silhouettes, re-derived for skinview3d's head-centered local
// origin (Minecraft's own model space pivots the head at the neck instead, so
// these aren't the same raw numbers, just the same resulting shape). Colors
// match each hat's existing colorFrom/colorTo in shopCatalog.ts.
export interface HatBox {
  center: [number, number, number];
  size: [number, number, number];
  color: string;
}

export const HAT_GEOMETRY: Record<string, HatBox[]> = {
  "hat-nebula-crown": [
    { center: [0, 4.75, 0], size: [9, 1.5, 9], color: "#d946ef" },
    { center: [3.2, 6.7, 3.2], size: [1.8, 2.8, 1.8], color: "#22d3ee" },
    { center: [3.2, 6.7, -3.2], size: [1.8, 2.8, 1.8], color: "#22d3ee" },
    { center: [-3.2, 6.7, 3.2], size: [1.8, 2.8, 1.8], color: "#22d3ee" },
    { center: [-3.2, 6.7, -3.2], size: [1.8, 2.8, 1.8], color: "#22d3ee" }
  ],
  "hat-vip-diadem": [{ center: [0, 3.3, 0], size: [9.2, 1.1, 9.2], color: "#fbbf24" }],
  "hat-starmap-hood": [
    { center: [0, 5, -0.5], size: [8.4, 2, 8], color: "#3730a3" },
    { center: [-4.3, 1, 1], size: [1.5, 6, 7], color: "#3730a3" },
    { center: [4.3, 1, 1], size: [1.5, 6, 7], color: "#3730a3" }
  ],
  "hat-comet-helmet": [
    { center: [0, 3.0, 0], size: [9.5, 8, 9.5], color: "#22d3ee" },
    { center: [0, 2, -6.5], size: [2, 2, 4], color: "#0ea5e9" }
  ],
  "hat-astro-visor": [{ center: [0, 1.8, 4.3], size: [9, 1.6, 1.2], color: "#22d3ee" }]
};
