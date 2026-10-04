import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: "esm",
    platform: "node",
    fixedExtension: false,
    dts: true,
  },
  {
    // The page script, served to the browser by the plugin.
    entry: ["src/app.ts"],
    format: "esm",
    platform: "browser",
    dts: false,
    external: [/^virtual:/],
  },
]);
