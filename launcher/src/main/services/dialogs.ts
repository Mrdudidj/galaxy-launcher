import { dialog, type BrowserWindow } from "electron";

export async function pickFiles(window: BrowserWindow, extensions: string[]): Promise<string[]> {
  const result = await dialog.showOpenDialog(window, {
    properties: ["openFile", "multiSelections"],
    filters: [{ name: extensions.join("/").toUpperCase(), extensions }]
  });
  return result.canceled ? [] : result.filePaths;
}

export async function pickSaveLocation(
  window: BrowserWindow,
  defaultName: string,
  extensions: string[]
): Promise<string | null> {
  const result = await dialog.showSaveDialog(window, {
    defaultPath: defaultName,
    filters: [{ name: extensions.join("/").toUpperCase(), extensions }]
  });
  return result.canceled || !result.filePath ? null : result.filePath;
}
