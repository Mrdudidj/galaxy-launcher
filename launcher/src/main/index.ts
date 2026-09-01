import { app, BrowserWindow, shell } from "electron";
import { setDefaultResultOrder } from "node:dns";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc/index.js";

// Some networks (containers/sandboxes in particular) advertise IPv6 routes that
// don't actually work, which makes dual-stack HTTP clients waste connection
// attempts on unreachable addresses before falling back to IPv4 — this showed up
// as intermittent ENETUNREACH/timeout failures downloading from Mojang's CDN.
// Prefer IPv4 results outright rather than relying on per-request fallback.
setDefaultResultOrder("ipv4first");

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0b0b16",
    icon: join(__dirname, "../../resources/icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("[main] PRELOAD ERROR", preloadPath, error);
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

void app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
