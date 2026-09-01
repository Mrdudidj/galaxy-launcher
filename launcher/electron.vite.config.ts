import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);

// Several recent @xmcl/* releases (Voxelum's minecraft-launcher-core-node) were
// published with their raw workspace "main" field ("./index.ts") instead of the
// built dist that publishConfig was supposed to swap in — bundlers can't resolve
// them via the normal package.json main lookup at all. Resolve via package.json's
// own (unambiguous) location instead, then point straight at the dist build that
// is actually present in the published tarball.
function resolveBrokenMainEntry(pkg: string, distFile: string): string {
  return resolve(dirname(require.resolve(`${pkg}/package.json`)), distFile);
}

const brokenPackageAliases = {
  "@xmcl/unzip": resolveBrokenMainEntry("@xmcl/unzip", "dist/index.mjs")
};

// electron-vite's externalizeDepsPlugin doesn't reliably externalize `electron`
// with the current rolldown-based Vite, which bundles the npm `electron` stub
// (its Node-side binary-path resolver) in place of Electron's real built-in
// module. Force it via rollupOptions.external as a guaranteed backstop.
const nodeBuiltinExternal = [
  "electron",
  /^node:/,
  "fs",
  "path",
  "os",
  "child_process",
  "url",
  "crypto"
];

export default defineConfig({
  main: {
    resolve: {
      alias: brokenPackageAliases
    },
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/main/index.ts"),
        external: nodeBuiltinExternal
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/preload/index.ts"),
        external: nodeBuiltinExternal,
        // Electron's sandboxed preload loader executes preload scripts through
        // its own runner (not Node's ESM loader) and only understands CJS
        // `require`/`module.exports` — it throws "Cannot use import statement
        // outside a module" on ESM output, even with package.json type:module.
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs"
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/renderer/index.html")
      }
    },
    plugins: [react()]
  }
});
