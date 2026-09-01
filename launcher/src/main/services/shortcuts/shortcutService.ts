import { app } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export async function createDesktopShortcut(instanceId: string, instanceName: string): Promise<{ path: string }> {
  if (process.platform !== "linux") {
    throw new Error("Desktop-Verknüpfungen werden auf diesem Betriebssystem noch nicht unterstützt.");
  }

  const desktopDir = join(homedir(), "Desktop");
  await mkdir(desktopDir, { recursive: true });

  const safeName = instanceName.replace(/["\\]/g, "");
  const execLine = app.isPackaged
    ? `"${process.execPath}" --instance=${instanceId}`
    : `"${process.execPath}" "${app.getAppPath()}" --instance=${instanceId}`;

  const filePath = join(desktopDir, `galaxy-${instanceId}.desktop`);
  const content = `[Desktop Entry]
Type=Application
Name=${safeName} — Galaxy Launcher
Comment=Startet die Galaxy-Launcher-Instanz "${safeName}"
Exec=${execLine}
Icon=applications-games
Terminal=false
Categories=Game;
`;
  await writeFile(filePath, content, { mode: 0o755 });
  return { path: filePath };
}
