package net.galaxylauncher.cosmetics.chat;

import com.mojang.brigadier.context.CommandContext;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.ClientCommands;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.galaxylauncher.cosmetics.config.CosmeticsConfigLoader;
import net.minecraft.network.chat.Component;

// A pure client-side command (no server round-trip needed — the actual
// gating is ClientSendMessageEvents.ALLOW_CHAT in GalaxyChatInterceptor).
// Works in singleplayer worlds too, unlike a server-registered command.
public final class GalaxyChatCommand {
	private GalaxyChatCommand() {}

	public static void register() {
		ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) ->
			dispatcher.register(
				ClientCommands.literal("galaxy")
					.then(ClientCommands.literal("chat")
						.executes(GalaxyChatCommand::toggle)
						.then(ClientCommands.literal("report").executes(GalaxyChatCommand::report))
					)
			)
		);
	}

	private static int toggle(final CommandContext<FabricClientCommandSource> context) {
		if (!GalaxyChatState.isActive()) {
			Instant banUntil = parseBanUntil();
			if (banUntil != null && banUntil.isAfter(Instant.now())) {
				context.getSource().sendError(Component.literal(
					"Du bist bis " + banUntil + " vom Galaxy-Chat gesperrt."
				));
				return 0;
			}
		}

		GalaxyChatState.toggle();
		context.getSource().sendFeedback(
			GalaxyChatState.isActive()
				? Component.literal(
					"Galaxy-Chat aktiviert. Nachrichten gehen an alle Galaxy-Launcher-Spieler — "
						+ "sobald der Server dafür läuft; bis dahin bleiben sie lokal."
				)
				: Component.literal("Galaxy-Chat deaktiviert — du schreibst wieder im normalen Chat.")
		);
		return 1;
	}

	private static int report(final CommandContext<FabricClientCommandSource> context) {
		String name = context.getSource().getPlayer().getGameProfile().name();
		boolean flagged = GalaxyChatOutbox.flagLatestAsReported(name);
		context.getSource().sendFeedback(
			flagged
				? Component.literal("Nachricht gemeldet — wird im Admin-Bereich geprüft.")
				: Component.literal("Keine kürzliche Galaxy-Chat-Nachricht zum Melden gefunden.")
		);
		return 1;
	}

	private static Instant parseBanUntil() {
		String raw = CosmeticsConfigLoader.current().chatBanUntil();
		if (raw == null) return null;
		try {
			return Instant.parse(raw);
		} catch (DateTimeParseException e) {
			return null;
		}
	}
}
