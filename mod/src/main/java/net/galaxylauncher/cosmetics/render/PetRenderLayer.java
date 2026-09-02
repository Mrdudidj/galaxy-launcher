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
import net.minecraft.util.Mth;

// The Logo-Begleiter — a small blocky planet-and-ring floating just above the
// ground, trailing behind the player (not attached to any bone —
// translateToHead is deliberately not called here, unlike HatRenderLayer, so
// it doesn't move with head turns/emotes; negative Z is "behind" the player,
// confirmed empirically in the TS preview harness, not assumed). Position is
// a first-pass estimate (root-relative model space, standard entity root =
// feet, Y grows downward) worked out from the well-known 32-unit player model
// convention, not verified in an actual running game — unlike the hats,
// there's no vanilla geometry to anchor it against, so this is the one piece
// of this feature that may need a real in-game look and a follow-up tweak.
public class PetRenderLayer extends RenderLayer<AvatarRenderState, PlayerModel> {
	private static final Identifier PLANET_TEXTURE =
		Identifier.fromNamespaceAndPath("galaxy-cosmetics", "textures/pets/galaxy-companion-planet.png");
	private static final Identifier RING_TEXTURE =
		Identifier.fromNamespaceAndPath("galaxy-cosmetics", "textures/pets/galaxy-companion-ring.png");
	private static final float OFFSET_X = 0.0F;
	private static final float OFFSET_Y = -1.5F;
	private static final float OFFSET_Z = -7.0F;
	private static final float BOB_AMPLITUDE = 0.6F;
	private static final float BOB_SPEED = 0.07F;

	private final ModelPart planet;
	private final ModelPart ring;

	public PetRenderLayer(final RenderLayerParent<AvatarRenderState, PlayerModel> renderer) {
		super(renderer);
		MeshDefinition mesh = new MeshDefinition();
		var root = mesh.getRoot();

		// Blocky stacked-box sphere approximation (Minecraft has no round
		// primitive) — a narrow top/bottom tier and a wide middle tier.
		root.addOrReplaceChild(
			"planet",
			CubeListBuilder.create()
				.texOffs(0, 0)
				.addBox(-2.5F, -2.5F, -2.5F, 5F, 5F, 5F)
				.addBox(-3.5F, -0.5F, -3.5F, 7F, 1F, 7F),
			PartPose.offset(0, 0, 0)
		);
		// A flat tilted ring through the middle.
		root.addOrReplaceChild(
			"ring",
			CubeListBuilder.create().texOffs(0, 12).addBox(-5.5F, -0.4F, -5.5F, 11F, 0.8F, 11F),
			PartPose.offsetAndRotation(0, 0, 0, 0.35F, 0, 0.2F)
		);

		ModelPart baked = LayerDefinition.create(mesh, 16, 16).bakeRoot();
		this.planet = baked.getChild("planet");
		this.ring = baked.getChild("ring");
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
		if (CosmeticsConfigLoader.current().equippedPetId() == null || state.isInvisible) return;

		poseStack.pushPose();
		this.getParentModel().root().translateAndRotate(poseStack);
		// Y grows downward here, so subtracting bob (always >= 0) lifts the pet
		// off the ground on the upswing instead of pushing it further into it.
		float bob = Math.abs(Mth.sin(state.ageInTicks * BOB_SPEED)) * BOB_AMPLITUDE;
		poseStack.translate((OFFSET_X) / 16.0, (OFFSET_Y - bob) / 16.0, (OFFSET_Z) / 16.0);
		poseStack.mulPose(Axis.YP.rotation(state.ageInTicks * 0.03F));

		submitNodeCollector.submitModelPart(
			this.planet, poseStack, RenderTypes.entitySolid(PLANET_TEXTURE), lightCoords, OverlayTexture.NO_OVERLAY, null
		);
		submitNodeCollector.submitModelPart(
			this.ring, poseStack, RenderTypes.entitySolid(RING_TEXTURE), lightCoords, OverlayTexture.NO_OVERLAY, null
		);
		poseStack.popPose();
	}
}
