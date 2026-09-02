package net.galaxylauncher.cosmetics.render;

import net.minecraft.client.model.HumanoidModel;

// Loose ports of the shop's 5 procedural emote animations (see the launcher's
// own emoteAnimations.ts) onto Minecraft's joint system — same rough motion
// shape per emote, not a literal numeric port: skinview3d's rig (Three.js,
// degrees-flavored rest pose around 180) and ModelPart's xRot/yRot/zRot
// (radians, vanilla's own walk-cycle rest pose) don't share a coordinate
// convention to port 1:1.
public final class EmotePoses {
	private EmotePoses() {}

	public static void apply(String emoteId, HumanoidModel<?> model, float progress) {
		float t = progress * (float) (Math.PI * 2);
		switch (emoteId) {
			case "emote-star-wave" -> {
				model.rightArm.xRot = -(float) Math.PI + (float) Math.sin(t) * 0.3F;
				model.rightArm.zRot = (float) Math.sin(t * 2) * 0.4F;
				model.head.yRot += (float) Math.sin(t * 0.7) * 0.2F;
			}
			case "emote-galaxy-dance" -> {
				model.leftArm.zRot = (float) Math.sin(t) * 0.6F - 0.3F;
				model.rightArm.zRot = -((float) Math.sin(t + Math.PI) * 0.6F - 0.3F);
				model.leftLeg.xRot = (float) Math.sin(t) * 0.4F;
				model.rightLeg.xRot = -(float) Math.sin(t) * 0.4F;
			}
			case "emote-nova-cheer" -> {
				float raise = Math.min(1.0F, progress * 3.0F);
				model.leftArm.xRot = -(float) Math.PI * raise;
				model.rightArm.xRot = -(float) Math.PI * raise;
				model.leftArm.zRot = 0.3F;
				model.rightArm.zRot = -0.3F;
			}
			case "emote-zero-g-flip" -> {
				model.rightArm.xRot = (float) Math.sin(t) * (float) Math.PI;
				model.leftArm.xRot = (float) Math.sin(t + Math.PI) * (float) Math.PI;
			}
			case "emote-vip-supernova" -> {
				model.leftArm.xRot = -2.9F;
				model.rightArm.xRot = -2.9F;
				model.head.xRot += -0.15F;
			}
			default -> {
				// Unknown/future emote id — no pose override, base walk/idle pose stands.
			}
		}
	}
}
