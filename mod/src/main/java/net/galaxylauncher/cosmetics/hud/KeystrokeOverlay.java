package net.galaxylauncher.cosmetics.hud;

import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElement;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.resources.Identifier;

// WASD + left/right mouse button, lit up while held — the standard non-cheat
// "keystrokes" HUD every PvP-recording client ships, useful for practice
// sessions and clips. Bottom-right corner, clear of the hotbar (bottom-
// center) and GalaxyChatIndicator (bottom-left, only shown while Galaxy-Chat
// is active). Reads already-public KeyMapping.isDown() each frame — same
// no-Mixin-needed reasoning as CpsCounter.
public final class KeystrokeOverlay implements HudElement {
	private static final Identifier ID = Identifier.fromNamespaceAndPath("galaxy-cosmetics", "keystroke_overlay");

	private static final int BOX = 18;
	private static final int GAP = 2;
	private static final int MARGIN = 10;
	private static final int COLOR_IDLE = 0x80202030;
	private static final int COLOR_ACTIVE = 0xFF8B5CF6;
	private static final int COLOR_BORDER = 0x40FFFFFF;

	private KeystrokeOverlay() {}

	public static void register() {
		HudElementRegistry.addLast(ID, new KeystrokeOverlay());
	}

	private static void drawKey(GuiGraphicsExtractor context, int x, int y, String label, boolean active) {
		context.fill(x, y, x + BOX, y + BOX, active ? COLOR_ACTIVE : COLOR_IDLE);
		context.fill(x, y, x + BOX, y + 1, COLOR_BORDER);
		context.fill(x, y + BOX - 1, x + BOX, y + BOX, COLOR_BORDER);
		context.fill(x, y, x + 1, y + BOX, COLOR_BORDER);
		context.fill(x + BOX - 1, y, x + BOX, y + BOX, COLOR_BORDER);
		context.centeredText(Minecraft.getInstance().font, label, x + BOX / 2, y + (BOX - 8) / 2, 0xFFFFFFFF);
	}

	@Override
	public void extractRenderState(GuiGraphicsExtractor context, DeltaTracker deltaTracker) {
		Minecraft client = Minecraft.getInstance();
		var opts = client.options;

		int screenWidth = client.getWindow().getGuiScaledWidth();
		int screenHeight = client.getWindow().getGuiScaledHeight();

		int totalWidth = BOX * 3 + GAP * 2;
		int totalHeight = BOX * 3 + GAP * 2;
		int baseX = screenWidth - totalWidth - MARGIN;
		int baseY = screenHeight - totalHeight - MARGIN;

		int col0 = baseX;
		int col1 = baseX + BOX + GAP;
		int col2 = baseX + (BOX + GAP) * 2;
		int row0 = baseY;
		int row1 = baseY + BOX + GAP;
		int row2 = baseY + (BOX + GAP) * 2;

		drawKey(context, col1, row0, "W", opts.keyUp.isDown());
		drawKey(context, col0, row1, "A", opts.keyLeft.isDown());
		drawKey(context, col1, row1, "S", opts.keyDown.isDown());
		drawKey(context, col2, row1, "D", opts.keyRight.isDown());
		drawKey(context, col0, row2, "L", opts.keyAttack.isDown());
		drawKey(context, col2, row2, "R", opts.keyUse.isDown());
	}
}
