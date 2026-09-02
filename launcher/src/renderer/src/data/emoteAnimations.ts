import { FunctionAnimation, type PlayerAnimation, type PlayerObject } from "skinview3d";
import { EMOTE_KEYFRAMES, type EmoteBonePose, type EmoteDefinition, type EmoteKeyframe } from "./emoteKeyframes";

const DEG = Math.PI / 180;
const BONES: (keyof EmoteBonePose)[] = ["head", "body", "rightArm", "leftArm", "rightLeg", "leftLeg"];

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

// Keyframes are sorted by t; find the pair the given t falls between (or the
// last one twice, for t >= the final keyframe — holds the final pose).
function findBracket(keyframes: EmoteKeyframe[], t: number): [EmoteKeyframe, EmoteKeyframe] {
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (t >= keyframes[i]!.t && t <= keyframes[i + 1]!.t) return [keyframes[i]!, keyframes[i + 1]!];
  }
  const last = keyframes[keyframes.length - 1]!;
  return [last, last];
}

// Linear interpolation only — this codebase doesn't use easing curves anywhere
// else either, and nothing here needs more than that.
function applyKeyframes(player: PlayerObject, t: number, def: EmoteDefinition): void {
  const [a, b] = findBracket(def.keyframes, t);
  const span = b.t - a.t;
  const u = span > 0 ? (t - a.t) / span : 0;

  for (const bone of BONES) {
    const poseA = a.pose[bone];
    const poseB = b.pose[bone];
    if (!poseA && !poseB) continue;
    const from = poseA ?? [0, 0, 0];
    const to = poseB ?? [0, 0, 0];
    player.skin[bone].rotation.set(
      lerp(from[0], to[0], u) * DEG,
      lerp(from[1], to[1], u) * DEG,
      lerp(from[2], to[2], u) * DEG
    );
  }

  player.rotation.y = lerp(a.playerYaw ?? 0, b.playerYaw ?? 0, u) * DEG;
  player.rotation.x = lerp(a.playerPitch ?? 0, b.playerPitch ?? 0, u) * DEG;
  player.position.y = lerp(a.playerBobY ?? 0, b.playerBobY ?? 0, u);
}

function createKeyframeAnimation(def: EmoteDefinition): PlayerAnimation {
  return new FunctionAnimation((player, progress) => {
    // `progress` is real elapsed seconds (skinview3d advances it via
    // THREE.Clock().getDelta()) and grows without bound — wrap it into a
    // repeating 0..1 sweep at this emote's own pace for a continuous preview
    // loop. The old per-emote sine formulas got looping "for free" from
    // Math.sin's own periodicity; a keyframe/lerp approach needs it explicit.
    const t = (progress / def.cycleSeconds) % 1;
    applyKeyframes(player, t, def);
  });
}

export function getEmoteAnimation(itemId: string): PlayerAnimation | null {
  const def = EMOTE_KEYFRAMES[itemId];
  return def ? createKeyframeAnimation(def) : null;
}

export function hasEmoteAnimation(itemId: string): boolean {
  return itemId in EMOTE_KEYFRAMES;
}
