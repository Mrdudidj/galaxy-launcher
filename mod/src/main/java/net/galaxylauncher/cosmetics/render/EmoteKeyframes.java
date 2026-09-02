package net.galaxylauncher.cosmetics.render;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.jspecify.annotations.Nullable;

// Bundled at mod/src/main/resources/galaxy-emotes.json, authored together with
// (and numerically identical to) the launcher's own emoteKeyframes.ts — the two
// hand-written per-language implementations this replaced could silently drift
// from each other, which is exactly what this data-driven approach avoids: one
// set of numbers, copied once, interpreted by a small generic player on each side.
public final class EmoteKeyframes {
	private static final Map<String, EmoteDefinition> DEFINITIONS = load();

	private EmoteKeyframes() {}

	public static @Nullable EmoteDefinition get(String emoteId) {
		return DEFINITIONS.get(emoteId);
	}

	private static Map<String, EmoteDefinition> load() {
		try (InputStream stream = EmoteKeyframes.class.getResourceAsStream("/galaxy-emotes.json")) {
			if (stream == null) return Map.of();
			try (InputStreamReader reader = new InputStreamReader(stream, StandardCharsets.UTF_8)) {
				Type type = new TypeToken<Map<String, EmoteDefinition>>() {}.getType();
				Map<String, EmoteDefinition> parsed = new Gson().fromJson(reader, type);
				return parsed != null ? parsed : Map.of();
			}
		} catch (IOException | RuntimeException e) {
			return Map.of();
		}
	}
}
