// Mirrors WingRenderLayer.java for the launcher's own preview — attached to
// the body (skin.body), not the head, so it follows body rotation without
// swinging around when the character looks left/right, matching the mod
// side's root-relative (not head-relative) attachment. Coordinates are in
// skinview3d's body-local space (body box spans roughly y:-6..+6, x:±4,
// z:-2(back)..+2(front)) — re-derived for this coordinate system, not a 1:1
// unit match with the Java side, same as hatGeometry.ts already notes for hats.
export interface WingBox {
  center: [number, number, number];
  size: [number, number, number];
  /** Radians — spreads the panel outward from the back. */
  rotationY: number;
  /** File name under assets/textures/wings/ — see textureAssets.ts. */
  texture: string;
}

export interface WingDefinition {
  left: WingBox;
  right: WingBox;
}

export const WING_GEOMETRY: Record<string, WingDefinition> = {
  "wings-nova": {
    left: { center: [4.5, 0.5, -3], size: [1, 6, 4.5], rotationY: -0.5, texture: "nova-wings.png" },
    right: { center: [-4.5, 0.5, -3], size: [1, 6, 4.5], rotationY: 0.5, texture: "nova-wings.png" }
  }
};
