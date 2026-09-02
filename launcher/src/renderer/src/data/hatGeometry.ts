// Mirrors the shapes built in HatRenderLayer.java for the launcher's own 3D
// preview — same silhouettes, re-derived for skinview3d's head-centered local
// origin (Minecraft's own model space pivots the head at the neck instead, so
// these aren't the same raw numbers, just the same resulting shape). Each
// box's `texture` filename matches HatRenderLayer.java's own per-piece
// texture assignment exactly, so the launcher preview and real in-game
// rendering show the same hand-painted material, not a flat placeholder color.
export interface HatBox {
  center: [number, number, number];
  size: [number, number, number];
  /** File name under assets/textures/hats/ — see textureAssets.ts. */
  texture: string;
}

export const HAT_GEOMETRY: Record<string, HatBox[]> = {
  "hat-nebula-crown": [
    { center: [0, 4.75, 0], size: [9, 1.5, 9], texture: "nebula-crown-ring.png" },
    { center: [3.2, 6.7, 3.2], size: [1.8, 2.8, 1.8], texture: "nebula-crown-spike.png" },
    { center: [3.2, 6.7, -3.2], size: [1.8, 2.8, 1.8], texture: "nebula-crown-spike.png" },
    { center: [-3.2, 6.7, 3.2], size: [1.8, 2.8, 1.8], texture: "nebula-crown-spike.png" },
    { center: [-3.2, 6.7, -3.2], size: [1.8, 2.8, 1.8], texture: "nebula-crown-spike.png" }
  ],
  "hat-vip-diadem": [{ center: [0, 3.3, 0], size: [9.2, 1.1, 9.2], texture: "vip-diadem.png" }],
  "hat-starmap-hood": [
    { center: [0, 5, -0.5], size: [8.4, 2, 8], texture: "starmap-hood.png" },
    { center: [-4.3, 1, 1], size: [1.5, 6, 7], texture: "starmap-hood.png" },
    { center: [4.3, 1, 1], size: [1.5, 6, 7], texture: "starmap-hood.png" }
  ],
  "hat-comet-helmet": [
    { center: [0, 3.0, 0], size: [9.5, 8, 9.5], texture: "comet-helmet.png" },
    { center: [0, 2, -6.5], size: [2, 2, 4], texture: "comet-helmet-tail.png" }
  ],
  "hat-astro-visor": [{ center: [0, 1.8, 4.3], size: [9, 1.6, 1.2], texture: "astro-visor.png" }]
};
