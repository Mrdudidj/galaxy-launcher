package net.galaxylauncher.cosmetics.render;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.galaxylauncher.cosmetics.config.CosmeticsConfigLoader;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;

// Tracks whether the local player's equipped emote is currently playing and,
// if so, how far into it — HatRenderLayer-style feature layers can only add
// geometry alongside the existing pose, not override the base model's own
// joint angles, so actually posing the arms/legs for an emote needs a Mixin
// (see HumanoidModelMixin) that reads playing()/progress() from here.
public final class EmotePlaybackController {
	private static final int DURATION_TICKS = 40;
	private static final KeyMapping PLAY_KEY =
		new KeyMapping("key.galaxy-cosmetics.play_emote", InputConstants.KEY_F11, KeyMapping.Category.MISC);

	private static long startTick = -1;
	private static long tickCounter = 0;

	private EmotePlaybackController() {}

	public static void register() {
		KeyMappingHelper.registerKeyMapping(PLAY_KEY);
		ClientTickEvents.END_CLIENT_TICK.register(EmotePlaybackController::onEndTick);
	}

	private static void onEndTick(Minecraft client) {
		tickCounter++;
		while (PLAY_KEY.consumeClick()) {
			if (CosmeticsConfigLoader.current().equippedEmoteId() != null) {
				startTick = tickCounter;
			}
		}
	}

	public static boolean isPlaying() {
		return startTick >= 0 && tickCounter - startTick < DURATION_TICKS;
	}

	// 0 at the first tick of playback, 1 at the last — HumanoidModelMixin uses
	// this to shape the motion, not a raw tick count, so DURATION_TICKS can
	// change later without every emote's math needing to change with it.
	// Ticks only (no render-partial-tick smoothing) — the pose updates once
	// per game tick rather than every frame, a visible but acceptable
	// simplification for a first version.
	public static float progress() {
		return Math.min(1.0F, (float) (tickCounter - startTick) / DURATION_TICKS);
	}
}
