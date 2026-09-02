package net.galaxylauncher.cosmetics.hud;

import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElement;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.resources.Identifier;

import java.util.ArrayDeque;
import java.util.Deque;

// Clicks-per-second, the standard non-cheat HUD stat every serious PvP
// client ships — a display, not a gameplay effect. Edge-detects
// Options.keyAttack.isDown() (left-click/"attack") directly in
// extractRenderState, which runs every render frame — checking on the fixed
// 20/s tick cadence instead would risk missing or miscounting presses from
// fast clickers, since render frames are typically far more frequent than
// ticks. No Mixin needed: Minecraft doesn't expose a dedicated
// "attack pressed" event, but polling for a rising edge on already-public
// key state works just as well and matches how every other HUD element in
// this mod already avoids needing one.
public final class CpsCounter implements HudElement {
	private static final Identifier ID = Identifier.fromNamespaceAndPath("galaxy-cosmetics", "cps_counter");
	private static final long WINDOW_MS = 1000;

	private static boolean wasDown = false;
	private static final Deque<Long> clickTimestamps = new ArrayDeque<>();

	private CpsCounter() {}

	public static void register() {
		HudElementRegistry.addLast(ID, new CpsCounter());
	}

	private static int currentCps() {
		boolean isDown = Minecraft.getInstance().options.keyAttack.isDown();
		if (isDown && !wasDown) {
			clickTimestamps.addLast(System.currentTimeMillis());
		}
		wasDown = isDown;

		long now = System.currentTimeMillis();
		while (!clickTimestamps.isEmpty() && now - clickTimestamps.peekFirst() > WINDOW_MS) {
			clickTimestamps.pollFirst();
		}
		return clickTimestamps.size();
	}

	@Override
	public void extractRenderState(GuiGraphicsExtractor context, DeltaTracker deltaTracker) {
		Minecraft client = Minecraft.getInstance();
		context.text(client.font, currentCps() + " CPS", 4, 16, 0xFFFFFF);
	}
}
