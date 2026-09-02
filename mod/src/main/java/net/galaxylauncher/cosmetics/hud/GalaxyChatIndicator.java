package net.galaxylauncher.cosmetics.hud;

import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElement;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.galaxylauncher.cosmetics.chat.GalaxyChatState;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.resources.Identifier;

// Sits just above where the chat box normally is, so it reads as "this is
// what you're currently typing into" rather than a generic corner HUD stat —
// only actually drawn while Galaxy-Chat is on.
public final class GalaxyChatIndicator implements HudElement {
	private static final Identifier ID = Identifier.fromNamespaceAndPath("galaxy-cosmetics", "galaxy_chat_indicator");
	private static final int COLOR = 0xD946EF;

	private GalaxyChatIndicator() {}

	public static void register() {
		HudElementRegistry.addLast(ID, new GalaxyChatIndicator());
	}

	@Override
	public void extractRenderState(GuiGraphicsExtractor context, DeltaTracker deltaTracker) {
		if (!GalaxyChatState.isActive()) return;
		Minecraft client = Minecraft.getInstance();
		context.text(client.font, "◆ GALAXY-CHAT AKTIV", 4, client.getWindow().getGuiScaledHeight() - 56, COLOR);
	}
}
