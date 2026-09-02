# Galaxy Cosmetics

Companion Fabric mod for [Galaxy Launcher](https://github.com/Mrdudidj/galaxy-launcher). Renders the launcher's shop cosmetics (glow aura, hats, emotes) in-game for the local player, plus a fullbright toggle and an FPS overlay.

Reads `<instance>/.minecraft/config/galaxycosmetics.json`, written by the launcher right before it starts the game — see the launcher's own `cosmeticsExport.ts` for the writing side. This mod never talks to the network on its own.

## Building

```bash
./gradlew build
```
Output jar lands in `build/libs/`. The launcher copies its own prebuilt copy from `launcher/resources/mods/galaxy-cosmetics.jar` into each Fabric instance automatically — rebuild and copy that file over when this mod changes.

## Setup for development

See the [Fabric Documentation](https://docs.fabricmc.net/develop/getting-started/creating-a-project#setting-up) page for your IDE.
