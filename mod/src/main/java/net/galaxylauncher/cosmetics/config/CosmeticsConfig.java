package net.galaxylauncher.cosmetics.config;

import org.jspecify.annotations.Nullable;

// Mirrors the JSON the launcher writes to <gameDir>/config/galaxycosmetics.json
// right before it starts the game (see launcher/src/main/services/economy/cosmeticsExport.ts) —
// intentionally just the three fields the launcher's own export emits, nothing more.
public record CosmeticsConfig(@Nullable String glowColor, @Nullable String hatId, @Nullable String equippedEmoteId) {
	public static final CosmeticsConfig EMPTY = new CosmeticsConfig(null, null, null);
}
