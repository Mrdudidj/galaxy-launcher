package net.galaxylauncher.cosmetics.chat;

import com.google.gson.Gson;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import net.fabricmc.loader.api.FabricLoader;

// A small rolling local log of messages actually sent through /galaxy chat —
// what the launcher's admin console reads from to build a real, reviewable
// report instead of inventing sample data (see moderationStore.ts). One-way,
// file-based, same shape as galaxycosmetics.json going the other direction —
// there's no live channel between the mod (a separate JVM) and the launcher
// (Electron/Node) while playing, so this is the same kind of "write it, the
// other side reads it later" handoff already used everywhere else here.
public final class GalaxyChatOutbox {
	private static final Gson GSON = new Gson();
	private static final int MAX_ENTRIES = 50;
	private static final Path PATH = FabricLoader.getInstance().getConfigDir().resolve("galaxychat-outbox.json");

	public record Entry(String timestamp, String playerName, String message, boolean reported) {}

	private record OutboxFile(List<Entry> messages) {}

	private GalaxyChatOutbox() {}

	public static synchronized void append(final String playerName, final String message) {
		List<Entry> entries = readAll();
		entries.add(new Entry(Instant.now().toString(), playerName, message, false));
		while (entries.size() > MAX_ENTRIES) {
			entries.remove(0);
		}
		write(entries);
	}

	// Flags the most recent message sent by this player as reported — there's
	// no one else's message to point at yet (no real multiplayer chat), but
	// the flagging mechanism itself is the same one a future "report someone
	// else's message" would use.
	public static synchronized boolean flagLatestAsReported(final String playerName) {
		List<Entry> entries = readAll();
		for (int i = entries.size() - 1; i >= 0; i--) {
			Entry entry = entries.get(i);
			if (entry.playerName().equals(playerName)) {
				entries.set(i, new Entry(entry.timestamp(), entry.playerName(), entry.message(), true));
				write(entries);
				return true;
			}
		}
		return false;
	}

	private static List<Entry> readAll() {
		try {
			String raw = Files.readString(PATH, StandardCharsets.UTF_8);
			OutboxFile parsed = GSON.fromJson(raw, OutboxFile.class);
			return parsed != null && parsed.messages() != null ? new ArrayList<>(parsed.messages()) : new ArrayList<>();
		} catch (IOException | RuntimeException e) {
			return new ArrayList<>();
		}
	}

	private static void write(final List<Entry> entries) {
		try {
			Files.createDirectories(PATH.getParent());
			Files.writeString(PATH, GSON.toJson(new OutboxFile(entries)), StandardCharsets.UTF_8);
		} catch (IOException e) {
			// Best-effort local log — losing an entry here isn't worth crashing the client over.
		}
	}
}
