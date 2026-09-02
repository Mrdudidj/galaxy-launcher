package net.galaxylauncher.cosmetics.hud;

import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElement;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.resources.Identifier;

public final class FpsOverlay implements HudElement {
	private static final Identifier ID = Identifier.fromNamespaceAndPath("galaxy-cosmetics", "fps_overlay");

	private FpsOverlay() {}

	public static void register() {
		HudElementRegistry.addLast(ID, new FpsOverlay());
	}

	@Override
	public void extractRenderState(GuiGraphicsExtractor context, DeltaTracker deltaTracker) {
		Minecraft client = Minecraft.getInstance();
		context.text(client.font, client.getFps() + " FPS", 4, 4, 0xFFFFFF);
	}
}
