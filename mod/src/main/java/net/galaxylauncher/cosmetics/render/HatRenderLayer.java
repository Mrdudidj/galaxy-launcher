package net.galaxylauncher.cosmetics.render;

import com.mojang.blaze3d.vertex.PoseStack;
import java.util.List;
import java.util.Map;
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

// Five real hat shapes, one per shopCatalog.ts hat id — replaces the single
// placeholder gold box every hat used to share. Box coordinates were worked out
// empirically against the vanilla head box (addBox(-4,-8,-4, 8,8,8), pivot at
// the neck) to sit flush on top of / around the head, then mirrored into
// SkinViewer3D.tsx's Three.js geometry (head-centered origin there, so the same
// shape needed re-deriving in that coordinate system — the two aren't a 1:1
// unit match, only the resulting silhouette is meant to match). Every box in a
// given hat uses the same flat-color texture at texOffs(0,0) — since the color
// is uniform, which UV region within it gets sampled doesn't matter, so this
// sidesteps needing a real per-box UV atlas layout for what's simple flat-color
// cosmetic geometry, not detailed pixel art.
public class HatRenderLayer extends RenderLayer<AvatarRenderState, PlayerModel> {
	private static final String TEX_BASE = "textures/hats/";
	private final Map<String, List<HatPiece>> hats;

	private record HatPiece(ModelPart part, Identifier texture) {}

	public HatRenderLayer(final RenderLayerParent<AvatarRenderState, PlayerModel> renderer) {
		super(renderer);
		MeshDefinition mesh = new MeshDefinition();
		var root = mesh.getRoot();

		// Nebel-Krone: a low ring plus 4 pointed spikes.
		root.addOrReplaceChild("crown_ring", CubeListBuilder.create().texOffs(0, 0).addBox(-4.5F, -9.5F, -4.5F, 9F, 1.5F, 9F), PartPose.offset(0, 0, 0));
		root.addOrReplaceChild("crown_spike_1", CubeListBuilder.create().texOffs(0, 0).addBox(2.3F, -12.1F, 2.3F, 1.8F, 2.8F, 1.8F), PartPose.offset(0, 0, 0));
		root.addOrReplaceChild("crown_spike_2", CubeListBuilder.create().texOffs(0, 0).addBox(2.3F, -12.1F, -4.1F, 1.8F, 2.8F, 1.8F), PartPose.offset(0, 0, 0));
		root.addOrReplaceChild("crown_spike_3", CubeListBuilder.create().texOffs(0, 0).addBox(-4.1F, -12.1F, 2.3F, 1.8F, 2.8F, 1.8F), PartPose.offset(0, 0, 0));
		root.addOrReplaceChild("crown_spike_4", CubeListBuilder.create().texOffs(0, 0).addBox(-4.1F, -12.1F, -4.1F, 1.8F, 2.8F, 1.8F), PartPose.offset(0, 0, 0));

		// VIP-Diadem: a slim band worn lower, like a circlet.
		root.addOrReplaceChild("vip_diadem", CubeListBuilder.create().texOffs(0, 0).addBox(-4.6F, -7.85F, -4.6F, 9.2F, 1.1F, 9.2F), PartPose.offset(0, 0, 0));

		// Sternenkarten-Kapuze: a top panel plus two side flaps framing the face — a full
		// enclosing box was tried first and mostly hid itself inside the head's own geometry
		// (confirmed visually in the TS preview harness before settling on this shape).
		root.addOrReplaceChild("starmap_hood_top", CubeListBuilder.create().texOffs(0, 0).addBox(-4.2F, -10F, -4.5F, 8.4F, 2F, 8F), PartPose.offset(0, 0, 0));
		root.addOrReplaceChild("starmap_hood_left", CubeListBuilder.create().texOffs(0, 0).addBox(-5.05F, -8F, -2.5F, 1.5F, 6F, 7F), PartPose.offset(0, 0, 0));
		root.addOrReplaceChild("starmap_hood_right", CubeListBuilder.create().texOffs(0, 0).addBox(3.55F, -8F, -2.5F, 1.5F, 6F, 7F), PartPose.offset(0, 0, 0));

		// Kometen-Helm: a rounder full enclosure plus a small trailing "tail".
		root.addOrReplaceChild("comet_helmet", CubeListBuilder.create().texOffs(0, 0).addBox(-4.75F, -11F, -4.75F, 9.5F, 8F, 9.5F), PartPose.offset(0, 0, 0));
		root.addOrReplaceChild("comet_helmet_tail", CubeListBuilder.create().texOffs(0, 0).addBox(-1F, -7F, -8.5F, 2F, 2F, 4F), PartPose.offset(0, 0, 0));

		// Astro-Visier: one thin strip across the eye line, not a full helmet.
		root.addOrReplaceChild("astro_visor", CubeListBuilder.create().texOffs(0, 0).addBox(-4.5F, -6.6F, 3.7F, 9F, 1.6F, 1.2F), PartPose.offset(0, 0, 0));

		ModelPart baked = LayerDefinition.create(mesh, 16, 16).bakeRoot();

		this.hats = Map.of(
			"hat-nebula-crown", List.of(
				new HatPiece(baked.getChild("crown_ring"), tex("nebula-crown-ring.png")),
				new HatPiece(baked.getChild("crown_spike_1"), tex("nebula-crown-spike.png")),
				new HatPiece(baked.getChild("crown_spike_2"), tex("nebula-crown-spike.png")),
				new HatPiece(baked.getChild("crown_spike_3"), tex("nebula-crown-spike.png")),
				new HatPiece(baked.getChild("crown_spike_4"), tex("nebula-crown-spike.png"))
			),
			"hat-vip-diadem", List.of(new HatPiece(baked.getChild("vip_diadem"), tex("vip-diadem.png"))),
			"hat-starmap-hood", List.of(
				new HatPiece(baked.getChild("starmap_hood_top"), tex("starmap-hood.png")),
				new HatPiece(baked.getChild("starmap_hood_left"), tex("starmap-hood.png")),
				new HatPiece(baked.getChild("starmap_hood_right"), tex("starmap-hood.png"))
			),
			"hat-comet-helmet", List.of(
				new HatPiece(baked.getChild("comet_helmet"), tex("comet-helmet.png")),
				new HatPiece(baked.getChild("comet_helmet_tail"), tex("comet-helmet-tail.png"))
			),
			"hat-astro-visor", List.of(new HatPiece(baked.getChild("astro_visor"), tex("astro-visor.png")))
		);
	}

	private static Identifier tex(String fileName) {
		return Identifier.fromNamespaceAndPath("galaxy-cosmetics", TEX_BASE + fileName);
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
		String hatId = CosmeticsConfigLoader.current().hatId();
		if (hatId == null || state.isInvisible) return;
		List<HatPiece> pieces = hats.get(hatId);
		if (pieces == null) return;

		poseStack.pushPose();
		PlayerModel parentModel = this.getParentModel();
		parentModel.root().translateAndRotate(poseStack);
		parentModel.translateToHead(poseStack);
		for (HatPiece piece : pieces) {
			submitNodeCollector.submitModelPart(
				piece.part(), poseStack, RenderTypes.entitySolid(piece.texture()), lightCoords, OverlayTexture.NO_OVERLAY, null
			);
		}
		poseStack.popPose();
	}
}
