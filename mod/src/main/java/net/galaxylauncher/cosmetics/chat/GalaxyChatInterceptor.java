package net.galaxylauncher.cosmetics.chat;

import net.fabricmc.fabric.api.client.message.v1.ClientSendMessageEvents;
import net.minecraft.ChatFormatting;
import net.minecraft.client.Minecraft;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.network.chat.Component;

// Blocks a chat message from ever reaching the real world/server chat while
// Galaxy-Chat is active, and echoes it locally instead — sendSystemMessage()
// is a genuine client-only print (nothing is sent over the network), so this
// doesn't pretend the message reached anyone. Once a real relay server
// exists, this is where an actual send call replaces the local echo. Also
// appends to GalaxyChatOutbox so the admin console can review real sent text.
public final class GalaxyChatInterceptor {
	private GalaxyChatInterceptor() {}

	public static void register() {
		ClientSendMessageEvents.ALLOW_CHAT.register(GalaxyChatInterceptor::onSendChat);
	}

	private static boolean onSendChat(final String message) {
		if (!GalaxyChatState.isActive()) return true;

		LocalPlayer player = Minecraft.getInstance().player;
		if (player == null) return true;

		String name = player.getGameProfile().name();
		GalaxyChatOutbox.append(name, message);
		player.sendSystemMessage(Component.literal("[Galaxy] " + name + ": " + message).withStyle(ChatFormatting.LIGHT_PURPLE));
		return false;
	}
}
