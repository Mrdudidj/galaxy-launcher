import { FunctionAnimation, type PlayerAnimation } from "skinview3d";

// Procedural emote animations built directly on skinview3d's own player rig —
// no external assets, so there's nothing to license. Each factory returns a
// fresh PlayerAnimation instance (animations carry mutable internal state, so
// they can't be shared across concurrently-mounted viewers).
const EMOTE_ANIMATIONS: Record<string, () => PlayerAnimation> = {
  "emote-star-wave": () =>
    new FunctionAnimation((player, progress) => {
      const t = progress * 4;
      player.skin.rightArm.rotation.x = 180 + Math.sin(t) * 0.3;
      player.skin.rightArm.rotation.z = Math.sin(t * 2) * 0.4;
      player.skin.head.rotation.y = Math.sin(t * 0.7) * 0.2;
      player.rotation.y = Math.sin(progress * 0.6) * 0.15;
    }),

  "emote-galaxy-dance": () =>
    new FunctionAnimation((player, progress) => {
      const t = progress * 5;
      player.rotation.y = Math.sin(t * 0.5) * 0.5;
      player.skin.leftArm.rotation.z = Math.sin(t) * 0.6 - 0.3;
      player.skin.rightArm.rotation.z = -(Math.sin(t + Math.PI) * 0.6 - 0.3);
      player.skin.leftLeg.rotation.x = Math.sin(t) * 0.4;
      player.skin.rightLeg.rotation.x = -Math.sin(t) * 0.4;
      player.position.y = Math.abs(Math.sin(t * 2)) * 0.05;
    }),

  "emote-nova-cheer": () =>
    new FunctionAnimation((player, progress) => {
      const t = progress * 6;
      const raise = Math.min(1, progress * 3);
      player.skin.leftArm.rotation.x = 180 * raise;
      player.skin.rightArm.rotation.x = 180 * raise;
      player.skin.leftArm.rotation.z = -0.3;
      player.skin.rightArm.rotation.z = 0.3;
      player.position.y = Math.abs(Math.sin(t)) * 0.08 * raise;
    }),

  "emote-zero-g-flip": () =>
    new FunctionAnimation((player, progress) => {
      player.rotation.x = progress * Math.PI;
      player.position.y = Math.abs(Math.sin(progress * Math.PI)) * 0.3;
    }),

  "emote-vip-supernova": () =>
    new FunctionAnimation((player, progress) => {
      const t = progress * 4;
      player.rotation.y = progress * 1.2;
      player.skin.leftArm.rotation.x = 170;
      player.skin.rightArm.rotation.x = 170;
      player.skin.head.rotation.x = -0.15;
      player.position.y = Math.abs(Math.sin(t * 1.5)) * 0.1;
    })
};

export function getEmoteAnimation(itemId: string): PlayerAnimation | null {
  return EMOTE_ANIMATIONS[itemId]?.() ?? null;
}

export function hasEmoteAnimation(itemId: string): boolean {
  return itemId in EMOTE_ANIMATIONS;
}
