import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  // Every export renders or uses hooks, so mark the bundle as client code for
  // React Server Components frameworks.
  banner: '"use client";',
  copy: [{ from: "src/styles.css", to: "dist" }],
});
