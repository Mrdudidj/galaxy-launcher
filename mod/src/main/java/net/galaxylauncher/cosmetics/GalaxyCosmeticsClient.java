package net.galaxylauncher.cosmetics;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.galaxylauncher.cosmetics.chat.GalaxyChatCommand;
import net.galaxylauncher.cosmetics.chat.GalaxyChatInterceptor;
import net.galaxylauncher.cosmetics.config.CosmeticsConfigLoader;
import net.galaxylauncher.cosmetics.fullbright.FullbrightFeature;
import net.galaxylauncher.cosmetics.hud.CpsCounter;
import net.galaxylauncher.cosmetics.hud.FpsOverlay;
import net.galaxylauncher.cosmetics.hud.GalaxyChatIndicator;
import net.galaxylauncher.cosmetics.hud.KeystrokeOverlay;
import net.galaxylauncher.cosmetics.render.CosmeticsRenderLayers;
import net.galaxylauncher.cosmetics.render.EmotePlaybackController;
import net.galaxylauncher.cosmetics.render.GlowAuraTicker;
import net.galaxylauncher.cosmetics.render.PetParticleTicker;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;

public class GalaxyCosmeticsClient implements ClientModInitializer {
	private static final KeyMapping RELOAD_KEY =
		new KeyMapping("key.galaxy-cosmetics.reload", InputConstants.KEY_F10, KeyMapping.Category.MISC);

	@Override
	public void onInitializeClient() {
		FullbrightFeature.register();
		FpsOverlay.register();
		CpsCounter.register();
		KeystrokeOverlay.register();
		GlowAuraTicker.register();
		PetParticleTicker.register();
		GalaxyChatCommand.register();
		GalaxyChatInterceptor.register();
		GalaxyChatIndicator.register();
		CosmeticsRenderLayers.register();
		EmotePlaybackController.register();

		KeyMappingHelper.registerKeyMapping(RELOAD_KEY);
		ClientTickEvents.END_CLIENT_TICK.register(GalaxyCosmeticsClient::onEndTick);

		CosmeticsConfigLoader.reload();
	}

	private static void onEndTick(Minecraft client) {
		while (RELOAD_KEY.consumeClick()) {
			CosmeticsConfigLoader.reload();
		}
	}
}
