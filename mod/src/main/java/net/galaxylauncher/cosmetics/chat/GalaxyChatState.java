package net.galaxylauncher.cosmetics.chat;

// Whether the local player is currently typing into "Galaxy chat" instead of
// the normal world/server chat. In-memory only, same minimal style as
// EmotePlaybackController's own state — resets to off on every game restart,
// which is correct: there's no session to resume across restarts yet anyway.
public final class GalaxyChatState {
	private static boolean active = false;

	private GalaxyChatState() {}

	public static boolean isActive() {
		return active;
	}

	public static void toggle() {
		active = !active;
	}
}
