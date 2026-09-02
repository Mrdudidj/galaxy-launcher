package net.galaxylauncher.cosmetics.render;

import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.galaxylauncher.cosmetics.config.CosmeticsConfigLoader;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.particles.DustParticleOptions;

// Sparkle trail around the Logo-Begleiter, same proven approach as
// GlowAuraTicker (real DustParticleOptions via level.addParticle, not a
// shader) — cycles between the brand's violet/cyan/magenta rather than one
// fixed color, so the rarest cosmetic actually reads as more alive than a
// static mesh. Orbits a fixed point near the player rather than the exact
// rendered pet position — GlowAuraTicker's own aura makes the same
// simplification (not rotated to match the player's facing), and getting the
// pet's precise offset right needs a real in-game look anyway (see
// PetRenderLayer's own comment).
public final class PetParticleTicker {
	private static final int[] COLORS = {0x7c3aed, 0x22d3ee, 0xd946ef};
	private static int tickCounter = 0;

	private PetParticleTicker() {}

	public static void register() {
		ClientTickEvents.END_CLIENT_TICK.register(PetParticleTicker::onEndTick);
	}

	private static void onEndTick(Minecraft client) {
		if (CosmeticsConfigLoader.current().equippedPetId() == null) return;

		LocalPlayer player = client.player;
		ClientLevel level = client.level;
		if (player == null || level == null) return;

		tickCounter++;
		if (tickCounter % 5 != 0) return;

		double centerX = player.getX();
		double centerY = player.getY() + player.getBbHeight() + 0.3;
		double centerZ = player.getZ();
		double radius = 0.5;

		for (int i = 0; i < 2; i++) {
			double angle = (level.getGameTime() * 0.12 + i * Math.PI) % (Math.PI * 2);
			double x = centerX + Math.cos(angle) * radius;
			double z = centerZ + Math.sin(angle) * radius;
			double y = centerY + Math.sin(level.getGameTime() * 0.1) * 0.2;
			int color = COLORS[(int) ((level.getGameTime() / 10) % COLORS.length)];
			level.addParticle(new DustParticleOptions(color, 1.0F), x, y, z, 0.0, 0.01, 0.0);
		}
	}
}
