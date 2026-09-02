package net.galaxylauncher.cosmetics.render;

import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.geom.ModelPart;
import org.jspecify.annotations.Nullable;

// Generic keyframe interpolator, driven entirely by EmoteKeyframes' bundled data —
// replaces what used to be a per-emote switch of hand-tuned trig (see git history),
// which is what let the launcher's and this mod's poses drift out of sync in the
// first place. Linear interpolation only, matching the launcher's own interpreter
// in emoteAnimations.ts — nothing here needs easing curves.
public final class EmotePoses {
	private static final double DEG = Math.PI / 180.0;

	private EmotePoses() {}

	public static void apply(String emoteId, HumanoidModel<?> model, float progress) {
		EmoteDefinition def = EmoteKeyframes.get(emoteId);
		if (def == null || def.keyframes().isEmpty()) return;

		EmoteDefinition.EmoteKeyframe[] bracket = findBracket(def, progress);
		EmoteDefinition.EmoteKeyframe a = bracket[0];
		EmoteDefinition.EmoteKeyframe b = bracket[1];
		double span = b.t() - a.t();
		double u = span > 0 ? (progress - a.t()) / span : 0;

		applyBone(model.head, a.pose().head(), b.pose().head(), u);
		applyBone(model.body, a.pose().body(), b.pose().body(), u);
		applyBone(model.rightArm, a.pose().rightArm(), b.pose().rightArm(), u);
		applyBone(model.leftArm, a.pose().leftArm(), b.pose().leftArm(), u);
		applyBone(model.rightLeg, a.pose().rightLeg(), b.pose().rightLeg(), u);
		applyBone(model.leftLeg, a.pose().leftLeg(), b.pose().leftLeg(), u);
	}

	private static EmoteDefinition.EmoteKeyframe[] findBracket(EmoteDefinition def, float t) {
		var keyframes = def.keyframes();
		for (int i = 0; i < keyframes.size() - 1; i++) {
			EmoteDefinition.EmoteKeyframe current = keyframes.get(i);
			EmoteDefinition.EmoteKeyframe next = keyframes.get(i + 1);
			if (t >= current.t() && t <= next.t()) {
				return new EmoteDefinition.EmoteKeyframe[] {current, next};
			}
		}
		EmoteDefinition.EmoteKeyframe last = keyframes.get(keyframes.size() - 1);
		return new EmoteDefinition.EmoteKeyframe[] {last, last};
	}

	// A null pose on both sides of the bracket means this bone isn't animated by
	// this emote at all — leave whatever the base walk/idle setupAnim() already
	// computed alone rather than snapping it to rest.
	private static void applyBone(ModelPart part, double @Nullable [] from, double @Nullable [] to, double u) {
		if (from == null && to == null) return;
		double[] a = from != null ? from : new double[] {0, 0, 0};
		double[] b = to != null ? to : new double[] {0, 0, 0};
		part.xRot = (float) ((a[0] + (b[0] - a[0]) * u) * DEG);
		part.yRot = (float) ((a[1] + (b[1] - a[1]) * u) * DEG);
		part.zRot = (float) ((a[2] + (b[2] - a[2]) * u) * DEG);
	}
}
