package net.galaxylauncher.cosmetics.render;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;
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

// A worn back accessory, not a floating companion — unlike PetRenderLayer this
// follows the player's body rotation (translateAndRotate on root, same as the
// pet), but sits close against the back rather than trailing behind, and gets
// a slow idle flutter instead of a bob. Root-relative model space, standard
// entity root = feet, Y grows downward (matches PetRenderLayer's own
// convention) — shoulder height on the vanilla player model is roughly 24
// units up from the feet (12 legs + 12 body), so the pivot sits there. Like
// the pet, there's no vanilla geometry to anchor a "wings" attachment point
// against, so this is a first-pass estimate, not verified in an actual
// running game — may need a real in-game look and a follow-up tweak.
public class WingRenderLayer extends RenderLayer<AvatarRenderState, PlayerModel> {
	private static final Identifier WINGS_TEXTURE =
		Identifier.fromNamespaceAndPath("galaxy-cosmetics", "textures/wings/nova-wings.png");
	private static final float PIVOT_Y = 24.0F;
	private static final float FLUTTER_SPEED = 0.08F;
	private static final float FLUTTER_AMPLITUDE = 0.12F;

	private final ModelPart leftWing;
	private final ModelPart rightWing;

	public WingRenderLayer(final RenderLayerParent<AvatarRenderState, PlayerModel> renderer) {
		super(renderer);
		MeshDefinition mesh = new MeshDefinition();
		var root = mesh.getRoot();

		// Each wing is one flat panel, thin on X, tall on Y, long on Z (reaches
		// backward from the shoulder) — the PartPose rotation angles it outward
		// and slightly back for a spread silhouette instead of a flat slab
		// sticking straight out.
		root.addOrReplaceChild(
			"left_wing",
			CubeListBuilder.create().texOffs(0, 0).addBox(-1F, -3.5F, -5F, 2F, 7F, 5F),
			PartPose.offsetAndRotation(4.5F, 0F, 0F, 0F, -0.5F, 0.15F)
		);
		root.addOrReplaceChild(
			"right_wing",
			CubeListBuilder.create().texOffs(0, 0).addBox(-1F, -3.5F, -5F, 2F, 7F, 5F),
			PartPose.offsetAndRotation(-4.5F, 0F, 0F, 0F, 0.5F, -0.15F)
		);

		ModelPart baked = LayerDefinition.create(mesh, 16, 16).bakeRoot();
		this.leftWing = baked.getChild("left_wing");
		this.rightWing = baked.getChild("right_wing");
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
		if (CosmeticsConfigLoader.current().equippedWingsId() == null || state.isInvisible) return;

		poseStack.pushPose();
		this.getParentModel().root().translateAndRotate(poseStack);
		poseStack.translate(0, -PIVOT_Y / 16.0, 0);

		float flutter = (float) Math.sin(state.ageInTicks * FLUTTER_SPEED) * FLUTTER_AMPLITUDE;
		poseStack.pushPose();
		poseStack.mulPose(Axis.ZP.rotation(flutter));
		submitNodeCollector.submitModelPart(
			this.leftWing, poseStack, RenderTypes.entitySolid(WINGS_TEXTURE), lightCoords, OverlayTexture.NO_OVERLAY, null
		);
		poseStack.popPose();

		poseStack.pushPose();
		poseStack.mulPose(Axis.ZP.rotation(-flutter));
		submitNodeCollector.submitModelPart(
			this.rightWing, poseStack, RenderTypes.entitySolid(WINGS_TEXTURE), lightCoords, OverlayTexture.NO_OVERLAY, null
		);
		poseStack.popPose();

		poseStack.popPose();
	}
}
