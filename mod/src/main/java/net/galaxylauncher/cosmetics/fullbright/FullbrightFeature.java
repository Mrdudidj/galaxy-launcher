package net.galaxylauncher.cosmetics.fullbright;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.OptionInstance;

public final class FullbrightFeature {
	private static final KeyMapping TOGGLE_KEY =
		new KeyMapping("key.galaxy-cosmetics.fullbright", InputConstants.KEY_F9, KeyMapping.Category.MISC);

	private static boolean enabled = false;
	private static double previousGamma = 1.0;

	private FullbrightFeature() {}

	public static void register() {
		KeyMappingHelper.registerKeyMapping(TOGGLE_KEY);
		ClientTickEvents.END_CLIENT_TICK.register(FullbrightFeature::onEndTick);
	}

	private static void onEndTick(Minecraft client) {
		while (TOGGLE_KEY.consumeClick()) {
			toggle(client);
		}
	}

	private static void toggle(Minecraft client) {
		enabled = !enabled;
		OptionInstance<Double> gamma = client.options.gamma();
		if (enabled) {
			previousGamma = gamma.get();
			gamma.set(16.0);
		} else {
			gamma.set(previousGamma);
		}
	}
}
