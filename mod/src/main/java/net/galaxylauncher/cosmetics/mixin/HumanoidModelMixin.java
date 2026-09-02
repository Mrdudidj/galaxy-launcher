package net.galaxylauncher.cosmetics.mixin;

import net.galaxylauncher.cosmetics.config.CosmeticsConfigLoader;
import net.galaxylauncher.cosmetics.render.EmotePlaybackController;
import net.galaxylauncher.cosmetics.render.EmotePoses;
import net.minecraft.client.Minecraft;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.renderer.entity.state.AvatarRenderState;
import net.minecraft.client.renderer.entity.state.HumanoidRenderState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

// RenderLayer (see HatRenderLayer) can only add geometry alongside the base
// model's existing pose, not change the pose itself — playing an emote means
// overriding the arm/leg/head ModelPart angles setupAnim() just computed, so
// it needs an actual Mixin, unlike the hat/glow effects.
@Mixin(HumanoidModel.class)
public abstract class HumanoidModelMixin<T extends HumanoidRenderState> {
	@Inject(method = "setupAnim", at = @At("TAIL"))
	private void galaxyCosmetics$onSetupAnimTail(final T state, final CallbackInfo ci) {
		if (!(state instanceof AvatarRenderState avatarState)) return;
		if (!EmotePlaybackController.isPlaying()) return;
		if (!isLocalPlayer(avatarState)) return;

		String emoteId = CosmeticsConfigLoader.current().equippedEmoteId();
		if (emoteId == null) return;

		@SuppressWarnings("unchecked")
		HumanoidModel<T> self = (HumanoidModel<T>) (Object) this;
		EmotePoses.apply(emoteId, self, EmotePlaybackController.progress());
	}

	private static boolean isLocalPlayer(final AvatarRenderState state) {
		LocalPlayer player = Minecraft.getInstance().player;
		return player != null && player.getId() == state.id;
	}
}
