package net.galaxylauncher.cosmetics.render;

import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.galaxylauncher.cosmetics.config.CosmeticsConfigLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.particles.DustParticleOptions;

// A small ring of colored dust particles around the local player — the
// in-game equivalent of the launcher's own glow effect, which today is a soft
// CSS box-glow around the skin preview, not a mesh shader. A particle aura is
// the more faithful (and Mixin-free) port of that, not a downgrade.
public final class GlowAuraTicker {
	private static int tickCounter = 0;

	private GlowAuraTicker() {}

	public static void register() {
		ClientTickEvents.END_CLIENT_TICK.register(GlowAuraTicker::onEndTick);
	}

	private static void onEndTick(Minecraft client) {
		String glowColor = CosmeticsConfigLoader.current().glowColor();
		if (glowColor == null) return;

		LocalPlayer player = client.player;
		ClientLevel level = client.level;
		if (player == null || level == null) return;

		tickCounter++;
		if (tickCounter % 4 != 0) return;

		int rgb = parseColor(glowColor);
		if (rgb < 0) return;

		DustParticleOptions options = new DustParticleOptions(rgb, 1.0F);
		double radius = 0.55;
		for (int i = 0; i < 3; i++) {
			double angle = (level.getGameTime() * 0.1 + i * (Math.PI * 2 / 3)) % (Math.PI * 2);
			double x = player.getX() + Math.cos(angle) * radius;
			double z = player.getZ() + Math.sin(angle) * radius;
			double y = player.getY() + 0.1 + player.getRandom().nextDouble() * (player.getBbHeight() - 0.2);
			level.addParticle(options, x, y, z, 0.0, 0.0, 0.0);
		}
	}

	private static int parseColor(String hex) {
		try {
			String cleaned = hex.startsWith("#") ? hex.substring(1) : hex;
			return Integer.parseInt(cleaned, 16);
		} catch (NumberFormatException e) {
			return -1;
		}
	}
}
