package net.galaxylauncher.cosmetics.render;

import com.mojang.blaze3d.vertex.PoseStack;
import net.galaxylauncher.cosmetics.config.CosmeticsConfigLoader;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.CubeListBuilder;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.model.player.PlayerModel;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.entity.RenderLayerParent;
import net.minecraft.client.renderer.entity.layers.RenderLayer;
import net.minecraft.client.renderer.entity.state.AvatarRenderState;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.Identifier;

// No hat cosmetic has any visual design yet, in the launcher's own preview or
// here — this is a simple placeholder box (vanilla gold-block texture) sized
// and positioned to sit on the head, not a finished piece of model art.
public class HatRenderLayer extends RenderLayer<AvatarRenderState, PlayerModel> {
	private static final Identifier TEXTURE = Identifier.fromNamespaceAndPath("minecraft", "textures/block/gold_block.png");
	private final ModelPart hat;

	public HatRenderLayer(final RenderLayerParent<AvatarRenderState, PlayerModel> renderer) {
		super(renderer);
		MeshDefinition mesh = new MeshDefinition();
		mesh.getRoot()
			.addOrReplaceChild(
				"hat",
				CubeListBuilder.create().texOffs(0, 0).addBox(-3.5F, -3.0F, -3.5F, 7.0F, 3.0F, 7.0F),
				PartPose.offset(0.0F, 0.0F, 0.0F)
			);
		this.hat = LayerDefinition.create(mesh, 16, 16).bakeRoot().getChild("hat");
	}

	@Override
	public void submit(
		final PoseStack poseStack,
		final SubmitNodeCollector submitNodeCollector,
		final int lightCoords,
		final AvatarRenderState state,
		final float yRot,
		final float xRot
	) {
		if (CosmeticsConfigLoader.current().hatId() == null || state.isInvisible) return;

		poseStack.pushPose();
		PlayerModel parentModel = this.getParentModel();
		parentModel.root().translateAndRotate(poseStack);
		parentModel.translateToHead(poseStack);
		submitNodeCollector.submitModelPart(
			this.hat, poseStack, RenderTypes.entitySolid(TEXTURE), lightCoords, OverlayTexture.NO_OVERLAY, null
		);
		poseStack.popPose();
	}
}
