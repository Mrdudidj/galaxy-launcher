package net.galaxylauncher.cosmetics.render;

import net.fabricmc.fabric.api.client.rendering.v1.LivingEntityRenderLayerRegistrationCallback;
import net.minecraft.client.renderer.entity.player.AvatarRenderer;

public final class CosmeticsRenderLayers {
	private CosmeticsRenderLayers() {}

	public static void register() {
		LivingEntityRenderLayerRegistrationCallback.EVENT.register((entityType, entityRenderer, registrationHelper, context) -> {
			if (entityRenderer instanceof AvatarRenderer<?> avatarRenderer) {
				registrationHelper.register(new HatRenderLayer(avatarRenderer));
			}
		});
	}
}
