package net.galaxylauncher.cosmetics.config;

import org.jspecify.annotations.Nullable;

// Mirrors the JSON the launcher writes to <gameDir>/config/galaxycosmetics.json
// right before it starts the game (see launcher/src/main/services/economy/cosmeticsExport.ts) —
// intentionally just the fields the launcher's own export emits, nothing more.
public record CosmeticsConfig(
	@Nullable String glowColor,
	@Nullable String hatId,
	@Nullable String equippedEmoteId,
	@Nullable String equippedPetId,
	// ISO-8601 instant (e.g. "2026-09-03T12:00:00Z"), or null if not chat-banned.
	@Nullable String chatBanUntil
) {
	public static final CosmeticsConfig EMPTY = new CosmeticsConfig(null, null, null, null, null);
}
