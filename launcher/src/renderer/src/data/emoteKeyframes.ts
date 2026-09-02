// Pose data for every emote, authored once here and mirrored byte-for-byte into
// mod/src/main/resources/galaxy-emotes.json for the companion mod. Angles are
// degrees (converted to radians exactly once, in the interpreter — see
// emoteAnimations.ts) specifically so this never regresses into the old bug where
// raw degree-looking numbers (180, 170) were fed straight into Three.js's
// radians-only rotation fields. Bone names match the real field names on both
// the skinview3d rig and Minecraft's own HumanoidModel, so no name-mapping table
// is needed either.
//
// Each keyframe list is sorted by t (0..1); first and last keyframes are authored
// identical (mod 360 per axis) so playback loops/holds without a visible snap —
// emote-cold-shoulder is a deliberate exception, since "turn away and stay turned"
// is the point of that gesture.
export interface EmoteBonePose {
  head?: [number, number, number];
  body?: [number, number, number];
  rightArm?: [number, number, number];
  leftArm?: [number, number, number];
  rightLeg?: [number, number, number];
  leftLeg?: [number, number, number];
}

export interface EmoteKeyframe {
  t: number;
  pose: EmoteBonePose;
  /** Whole-body turn, degrees. Preview-only — see emoteAnimations.ts. */
  playerYaw?: number;
  /** Whole-body forward flip, degrees. Preview-only. */
  playerPitch?: number;
  /** Whole-body vertical bob. Preview-only. */
  playerBobY?: number;
}

export interface EmoteDefinition {
  /** Real seconds per full 0..1 sweep when looped in the preview. */
  cycleSeconds: number;
  keyframes: EmoteKeyframe[];
}

export const EMOTE_KEYFRAMES: Record<string, EmoteDefinition> = {
  "emote-star-wave": {
    cycleSeconds: 1.4,
    keyframes: [
      { t: 0.0, pose: { rightArm: [-150, 0, 0] } },
      { t: 0.25, pose: { rightArm: [-150, 0, -25] } },
      { t: 0.5, pose: { rightArm: [-150, 0, 0] } },
      { t: 0.75, pose: { rightArm: [-150, 0, 25] } },
      { t: 1.0, pose: { rightArm: [-150, 0, 0] } }
    ]
  },
  "emote-galaxy-dance": {
    cycleSeconds: 2.0,
    keyframes: [
      { t: 0.0, pose: { leftArm: [0, 0, -20], rightArm: [0, 0, 20], leftLeg: [15, 0, 0], rightLeg: [-15, 0, 0] }, playerYaw: -15 },
      { t: 0.5, pose: { leftArm: [0, 0, 20], rightArm: [0, 0, -20], leftLeg: [-15, 0, 0], rightLeg: [15, 0, 0] }, playerYaw: 15 },
      { t: 1.0, pose: { leftArm: [0, 0, -20], rightArm: [0, 0, 20], leftLeg: [15, 0, 0], rightLeg: [-15, 0, 0] }, playerYaw: -15 }
    ]
  },
  "emote-nova-cheer": {
    cycleSeconds: 1.8,
    keyframes: [
      { t: 0.0, pose: { leftArm: [0, 0, -10], rightArm: [0, 0, 10] } },
      { t: 0.3, pose: { leftArm: [-160, 0, -35], rightArm: [-160, 0, 35] } },
      { t: 0.5, pose: { leftArm: [-150, 0, -35], rightArm: [-150, 0, 35] } },
      { t: 0.7, pose: { leftArm: [-160, 0, -35], rightArm: [-160, 0, 35] } },
      { t: 1.0, pose: { leftArm: [0, 0, -10], rightArm: [0, 0, 10] } }
    ]
  },
  "emote-zero-g-flip": {
    cycleSeconds: 2.0,
    keyframes: [
      { t: 0.0, pose: { rightArm: [-30, 0, 10], leftArm: [-30, 0, -10] }, playerPitch: 0 },
      { t: 0.5, pose: { rightArm: [-210, 0, 10], leftArm: [-210, 0, -10] }, playerPitch: 180, playerBobY: 0.3 },
      { t: 1.0, pose: { rightArm: [-390, 0, 10], leftArm: [-390, 0, -10] }, playerPitch: 360 }
    ]
  },
  "emote-vip-supernova": {
    cycleSeconds: 2.2,
    keyframes: [
      { t: 0.0, pose: { leftArm: [-10, 0, -5], rightArm: [-10, 0, 5], head: [-5, 0, 0] } },
      { t: 0.4, pose: { leftArm: [-175, 0, -15], rightArm: [-175, 0, 15], head: [-15, 0, 0] }, playerYaw: 10 },
      { t: 0.6, pose: { leftArm: [-175, 0, -15], rightArm: [-175, 0, 15], head: [-15, 0, 0] }, playerYaw: -10 },
      { t: 1.0, pose: { leftArm: [-10, 0, -5], rightArm: [-10, 0, 5], head: [-5, 0, 0] } }
    ]
  },
  "emote-star-mockery": {
    cycleSeconds: 1.6,
    keyframes: [
      { t: 0.0, pose: { rightArm: [-90, 0, 15], head: [10, 15, 0] } },
      { t: 0.25, pose: { rightArm: [-100, 0, 10], head: [15, -15, 0] } },
      { t: 0.5, pose: { rightArm: [-90, 0, 15], head: [10, 15, 0] } },
      { t: 0.75, pose: { rightArm: [-100, 0, 10], head: [15, -15, 0] } },
      { t: 1.0, pose: { rightArm: [-90, 0, 15], head: [10, 15, 0] } }
    ]
  },
  "emote-cold-shoulder": {
    cycleSeconds: 2.5,
    keyframes: [
      { t: 0.0, pose: { rightArm: [0, 0, 10], head: [0, 0, 0] }, playerYaw: 0 },
      { t: 0.4, pose: { rightArm: [-40, 0, 30], head: [0, 40, 0] }, playerYaw: 130 },
      { t: 1.0, pose: { rightArm: [0, 0, 10], head: [0, 0, 0] }, playerYaw: 130 }
    ]
  },
  "emote-noodle-arms": {
    cycleSeconds: 1.2,
    keyframes: [
      { t: 0.0, pose: { leftArm: [10, 0, -15], rightArm: [-10, 0, 15] } },
      { t: 0.15, pose: { leftArm: [-20, 0, 20], rightArm: [20, 0, -20] } },
      { t: 0.3, pose: { leftArm: [10, 0, -25], rightArm: [-10, 0, 25] } },
      { t: 0.45, pose: { leftArm: [-15, 0, 15], rightArm: [15, 0, -15] } },
      { t: 0.6, pose: { leftArm: [10, 0, -20], rightArm: [-10, 0, 20] } },
      { t: 0.75, pose: { leftArm: [-20, 0, 25], rightArm: [20, 0, -25] } },
      { t: 1.0, pose: { leftArm: [10, 0, -15], rightArm: [-10, 0, 15] } }
    ]
  },
  "emote-astro-stumble": {
    cycleSeconds: 2.2,
    keyframes: [
      { t: 0.0, pose: { body: [0, 0, 0], leftLeg: [0, 0, 0], rightLeg: [0, 0, 0] } },
      { t: 0.2, pose: { body: [15, 0, -20], leftArm: [-60, 0, -40], rightLeg: [-30, 0, 0] }, playerYaw: -10 },
      { t: 0.45, pose: { body: [25, 0, 15], rightArm: [-80, 0, 30], leftLeg: [-20, 0, 0] }, playerYaw: 15 },
      { t: 0.7, pose: { body: [5, 0, -5], leftArm: [-30, 0, -10], rightArm: [-30, 0, 10] }, playerYaw: -5 },
      { t: 1.0, pose: { body: [0, 0, 0], leftLeg: [0, 0, 0], rightLeg: [0, 0, 0] } }
    ]
  },
  "emote-warm-greeting": {
    cycleSeconds: 2.4,
    keyframes: [
      { t: 0.0, pose: { leftArm: [0, 0, -10], rightArm: [0, 0, 10], body: [0, 0, 0] } },
      { t: 0.3, pose: { leftArm: [-140, 0, -20], rightArm: [-140, 0, 20], body: [0, 0, 0] } },
      { t: 0.45, pose: { leftArm: [-140, 0, -35], rightArm: [-140, 0, 35], body: [0, 0, 0] } },
      { t: 0.6, pose: { leftArm: [-140, 0, -20], rightArm: [-140, 0, 20], body: [0, 0, 0] } },
      { t: 0.8, pose: { leftArm: [-20, 0, -10], rightArm: [-20, 0, 10], body: [25, 0, 0], head: [15, 0, 0] } },
      { t: 1.0, pose: { leftArm: [0, 0, -10], rightArm: [0, 0, 10], body: [0, 0, 0] } }
    ]
  },
  "emote-applause": {
    cycleSeconds: 1.0,
    keyframes: [
      { t: 0.0, pose: { leftArm: [-90, 0, -25], rightArm: [-90, 0, 25] } },
      { t: 0.15, pose: { leftArm: [-90, 0, -5], rightArm: [-90, 0, 5] } },
      { t: 0.3, pose: { leftArm: [-90, 0, -25], rightArm: [-90, 0, 25] } },
      { t: 0.45, pose: { leftArm: [-90, 0, -5], rightArm: [-90, 0, 5] } },
      { t: 0.6, pose: { leftArm: [-90, 0, -25], rightArm: [-90, 0, 25] } },
      { t: 0.75, pose: { leftArm: [-90, 0, -5], rightArm: [-90, 0, 5] } },
      { t: 1.0, pose: { leftArm: [-90, 0, -25], rightArm: [-90, 0, 25] } }
    ]
  }
};
