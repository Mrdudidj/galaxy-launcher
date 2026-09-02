package net.galaxylauncher.cosmetics.render;

import java.util.List;
import org.jspecify.annotations.Nullable;

// Mirrors the launcher's own launcher/src/renderer/src/data/emoteKeyframes.ts
// (this side just ignores the preview-only playerYaw/playerPitch/playerBobY
// fields that file also carries — a Mixin into HumanoidModel.setupAnim() only
// ever sees the model's own bones, never the whole entity transform).
public record EmoteDefinition(List<EmoteKeyframe> keyframes) {
	public record EmoteKeyframe(double t, EmoteBonePose pose) {}

	public record EmoteBonePose(
		@Nullable double[] head,
		@Nullable double[] body,
		@Nullable double[] rightArm,
		@Nullable double[] leftArm,
		@Nullable double[] rightLeg,
		@Nullable double[] leftLeg
	) {}
}
