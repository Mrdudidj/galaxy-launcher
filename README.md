# Galaxy Launcher

Ein Minecraft-Launcher mit echter Kosmetik, Shop, Mod-Suche, Spotify- und Discord-Integration — kostenlos und quelloffen für Windows und Linux.

🌐 Webseite: https://mrdudidj.github.io/galaxy-launcher/
📦 Downloads: [Releases](https://github.com/Mrdudidj/galaxy-launcher/releases/latest)

## Features

- **Kosmetik & Skins** — Hüte, Outfits, Leuchtfarben und handanimierte Emotes, live sichtbar am Charakter
- **Shop & Spind** — Kosmetik sammeln und ausrüsten, mit echter Vorschau
- **Mod-Suche** — Mods direkt von Modrinth suchen und installieren, inklusive Abhängigkeiten
- **Spotify-Integration** — Now-Playing-Fenster mit echter Play/Pause/Skip-Steuerung (MPRIS unter Linux, SMTC unter Windows)
- **Discord-Status** — zeigt automatisch, was du gerade spielst
- **PvP & SMP** — CPS-Counter und Tastenanzeige direkt im Spiel
- **Admin-Konsole** — KI-gestützte Chat-Moderation mit vollständigem, rückgängig machbarem Audit-Log

## Installation

### Windows

Installer aus den [Releases](https://github.com/Mrdudidj/galaxy-launcher/releases/latest) herunterladen und ausführen.

### Linux

**AppImage:**

```bash
curl -sL $(curl -s https://api.github.com/repos/Mrdudidj/galaxy-launcher/releases/latest | grep "browser_download_url.*AppImage" | cut -d '"' -f 4) -o GalaxyLauncher.AppImage
chmod +x GalaxyLauncher.AppImage
./GalaxyLauncher.AppImage
```

**.deb (Ubuntu/Debian):**

```bash
curl -sL $(curl -s https://api.github.com/repos/Mrdudidj/galaxy-launcher/releases/latest | grep "browser_download_url.*deb" | cut -d '"' -f 4) -o galaxy-launcher.deb
sudo dpkg -i galaxy-launcher.deb
```

## Entwicklung

Monorepo (pnpm workspaces): `launcher/` (Electron + React + TypeScript), `mod/` (Fabric-Mod für die In-Game-Kosmetik), `windows-helper/` (C#-Helfer für Spotify unter Windows), `website/` (statische Landingpage).

```bash
pnpm install
pnpm --filter launcher dev
```

## Lizenz & Kontakt

Siehe [Impressum](https://mrdudidj.github.io/galaxy-launcher/impressum.html) und [Datenschutz](https://mrdudidj.github.io/galaxy-launcher/datenschutz.html). Bugs und Ideen gerne als [Issue](https://github.com/Mrdudidj/galaxy-launcher/issues).
