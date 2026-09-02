package net.galaxylauncher.cosmetics.config;

import com.google.gson.Gson;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import net.fabricmc.loader.api.FabricLoader;

public final class CosmeticsConfigLoader {
	private static final Gson GSON = new Gson();
	private static final Path CONFIG_PATH = FabricLoader.getInstance().getConfigDir().resolve("galaxycosmetics.json");

	private static volatile CosmeticsConfig current = CosmeticsConfig.EMPTY;

	private CosmeticsConfigLoader() {}

	public static CosmeticsConfig current() {
		return current;
	}

	// The launcher only ever writes this file right before launch, so a missing
	// file (vanilla/non-Fabric instance, or launched outside Galaxy Launcher
	// entirely) just means no cosmetics are equipped — not an error.
	public static void reload() {
		try {
			String raw = Files.readString(CONFIG_PATH);
			CosmeticsConfig parsed = GSON.fromJson(raw, CosmeticsConfig.class);
			current = parsed != null ? parsed : CosmeticsConfig.EMPTY;
		} catch (IOException | RuntimeException e) {
			current = CosmeticsConfig.EMPTY;
		}
	}
}
