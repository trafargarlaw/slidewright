import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: "esm",
    platform: "node",
    fixedExtension: false,
    dts: { tsconfig: "tsconfig.build.json" },
  },
  {
    // The page script, served to the browser by the plugin. Not in dist:
    // Vite's dependency scanner skips build output folders, and without the
    // scan, Vite serves React and other CommonJS dependencies unconverted.
    entry: ["src/app.ts"],
    outDir: "client",
    format: "esm",
    platform: "browser",
    dts: false,
    external: [/^virtual:/],
  },
]);
