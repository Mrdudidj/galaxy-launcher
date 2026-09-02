---
name: run-desktop
description: Build, run, and drive the Galaxy Launcher Electron app. Use when asked to start the launcher, take a screenshot of it, build it, or interact with its UI.
---

Galaxy Launcher is an Electron + React + TypeScript desktop app. For agent/automated use, drive it via the Playwright REPL at `.claude/skills/run-desktop/driver.mjs` under xvfb.

All paths are relative to `launcher/` (this package's root within the pnpm workspace).

## Prerequisites

None beyond the workspace's own `pnpm install` — this machine (Kali) already had the Chromium/Electron shared libs and `Xvfb` preinstalled. If a fresh machine is missing them, the error will name the missing `.so` files; install via:

```bash
sudo apt-get install -y xvfb libnss3 libgbm1 libasound2t64 libgtk-3-0 \
  libxss1 libxkbcommon0 libatk-bridge2.0-0 libcups2 libdrm2
```

## Build

```bash
cd "/home/jonathan/Dokumente/Galaxy Launcher"
pnpm --filter launcher build   # electron-vite build -> launcher/out/{main,preload,renderer}
```

## Run (agent path)

```bash
cd "/home/jonathan/Dokumente/Galaxy Launcher/launcher"
xvfb-run -a node .claude/skills/run-desktop/driver.mjs
```

Wrap in tmux for interactive use:

```bash
tmux new-session -d -s galaxy -x 200 -y 50
tmux send-keys -t galaxy 'cd "/home/jonathan/Dokumente/Galaxy Launcher/launcher" && xvfb-run -a node .claude/skills/run-desktop/driver.mjs' Enter
timeout 20 bash -c 'until tmux capture-pane -t galaxy -p | grep -q "driver>"; do sleep 0.2; done'
tmux send-keys -t galaxy 'launch' Enter
timeout 30 bash -c 'until tmux capture-pane -t galaxy -p | grep -q "launched\."; do sleep 0.3; done'
tmux send-keys -t galaxy 'ss landing' Enter
tmux capture-pane -t galaxy -p
```

Screenshots land in `/tmp/shots/` (override: `SCREENSHOT_DIR`).

### Commands

| command | what it does |
|---|---|
| `launch` | launch the app, wait for the first window |
| `ss [name]` | screenshot -> `/tmp/shots/<name>.png` |
| `click <css-sel>` | click element (via DOM, not coords) |
| `click-text <text>` | click button/link containing text |
| `type <text>` / `press <key>` | keyboard input |
| `wait <css-sel>` | wait for element, 10s timeout |
| `eval <js>` | evaluate in the page, print JSON |
| `text [css-sel]` | print innerText |
| `windows` | list all windows |
| `quit` | close app, exit |

## Run (human path)

```bash
cd "/home/jonathan/Dokumente/Galaxy Launcher"
pnpm --filter launcher dev   # opens a real window via electron-vite dev; Ctrl-C to quit
```

## Gotchas

- **electron-vite's `externalizeDepsPlugin()` doesn't reliably externalize `electron`** with the rolldown-based Vite version resolved into this project (electron-vite ^5 + vite ^8). Without an explicit backstop, the build bundles the *npm `electron` package's own* Node-side binary-path-resolver stub in place of Electron's real built-in module, and the app throws `Electron failed to install correctly` on launch with no window ever created. Fixed by listing `"electron"` explicitly in `rollupOptions.external` in `electron.vite.config.ts` for both `main` and `preload`. If you bump these tool versions and this class of error resurfaces, check `launcher/out/main/index.js` for a `getElectronPath` function — if it's there, `electron` got bundled again.
- **Preload scripts must be CommonJS, even though `package.json` has `"type": "module"`.** Electron's sandboxed preload loader (`sandbox: true`, which this app uses deliberately for security) runs preload scripts through its own script runner, not Node's ESM loader — ESM `import`/`export` syntax throws `SyntaxError: Cannot use import statement outside a module` at preload load time, which silently leaves `window.galaxy` undefined in the renderer (no renderer-side error — check `webContents.on('preload-error', ...)` in main, or the driver's `eval typeof window.galaxy`). Fixed via `output: { format: "cjs", entryFileNames: "[name].cjs" }` on the preload's `rollupOptions` — main process output stays ESM (`.js`) since Electron's main-process bootstrap *does* honor `package.json` `type: module` there.
- **From `launcher/`, the electron binary path is `node_modules/electron/dist/electron`**, not `../node_modules/...` — pnpm symlinks `electron` into each workspace package's own `node_modules`, so don't walk up a directory.
- GPU warnings (`vaInitialize failed`, `MESA-INTEL: ... Vulkan support is incomplete`) under Xvfb are harmless software-rendering fallback noise, not failures.
- **WebGL itself was completely unavailable under Xvfb until the driver's launch `args` added SwiftShader switches** (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`) — this is a real functional gap, not just noise: confirmed via `canvas.getContext("webgl")` returning `null` before, `"WebKit WebGL"` after. Any screen using the skinview3d character preview (`SkinViewer3D.tsx`) silently degrades to its flat-2D `.skin-viewer-fallback` `<img>` when this happens, with no console error — a screenshot can look "successful" while actually showing the degraded fallback, not the real 3D render. If screenshots ever show a tiny/garbled character preview again, re-check `canvas.getContext("webgl")` before assuming it's a layout or timing bug.
- The emoji icons (📰) render as empty glyph boxes under Xvfb's minimal font set — a headless-environment font-coverage artifact, not an app bug. Worth revisiting with SVG/icon-font icons for the real design pass regardless, so they render identically on every user's system font set.
- **Several `@xmcl/*` packages (Voxelum's minecraft-launcher-core-node, used for Minecraft auth/downloading/launching) were published broken.** Two distinct upstream bugs, both from their `workspace:*` → real-version rewrite not applying correctly at publish time:
  - Some packages declare a dependency on a sibling `@xmcl/*` package as the literal string `"^*"` or even `"workspace:^*"` (never rewritten). `@xmcl/installer@6.3.x` does this for `@xmcl/file-transfer`, and it resolves to a real published version that doesn't actually export what the installer code needs (`ConcurrencyDispatcher`) — every published `@xmcl/file-transfer` version was checked; none has it. **Fix: don't use `@xmcl/installer` 6.3.x at all — pin `@xmcl/installer@6.1.2`** (and `@xmcl/core@2.15.1` to match, since installer pins a specific core version and having two `@xmcl/core` instances around causes its own resolution problems — see next point), which predates this breakage and has consistent, real version pins throughout. This is also why `downloadVersion.ts` uses 6.1.2's older `installTask()`/`@xmcl/task` API rather than 6.3.x's newer manifest/workflow API described in that package's own README — the newer API is unusable as published right now.
  - Separately, `@xmcl/core` (any recent version) declares `"@xmcl/unzip": "^*"` the same broken way, and even after overriding it to a real version (`pnpm-workspace.yaml`'s `overrides`), the currently-published `@xmcl/unzip@2.2.0` itself has a broken `"main": "./index.ts"` field (should be `./dist/index.js` per its own `publishConfig`, which apparently didn't apply on publish) — so it can't be bundled even once the version resolves correctly. Fixed with a `resolve.alias` in `electron.vite.config.ts` (see `brokenPackageAliases`) that locates the package via `require.resolve('@xmcl/unzip/package.json')` (unambiguous — doesn't go through the broken `main` field) and points straight at `dist/index.mjs`.
  - **If you upgrade any `@xmcl/*` package, re-verify this whole chain**: check `pnpm why @xmcl/core` and `pnpm why @xmcl/unzip` each show exactly one deduped instance, and that a fresh `pnpm --filter launcher build` doesn't throw `MISSING_EXPORT` or `Rolldown failed to resolve import` for any `@xmcl/*` package.
- **Real network downloads (version download via `installTask`) can fail transiently on a cold cache** — observed intermittent failures partway through the ~200MB/5000-file vanilla asset download in this sandboxed environment, with no error surfaced to the main-process console (only to the renderer, via the rejected `downloads:startVanilla` IPC promise). The UI's `DownloadButton` already handles this (shows "Fehler — erneut versuchen"; clicking again resumes/retries and has reliably completed with all files intact in testing). Treat this as expected real-world flakiness a launcher must tolerate, not a bug to chase — but if failures become the common case rather than occasional, check whether it's environment-specific (e.g. this sandbox's outbound networking) before assuming the download code is at fault.

## Troubleshooting

- **`window.galaxy` is `undefined` in the renderer with no console error:** almost certainly the preload-CJS gotcha above. Rebuild and check `launcher/out/preload/index.cjs` exists and uses `require(...)`, not `import`.
- **Launch produces zero windows, no error, `firstWindow()` times out:** almost certainly the electron-externalization gotcha above. Check `launcher/out/main/index.js` for `getElectronPath`.
- **Stale Xvfb locks:** `rm -f /tmp/.X*-lock; pkill Xvfb`
