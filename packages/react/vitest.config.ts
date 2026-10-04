import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Test against workspace sources, so tests don't need a prior build.
    conditions: ["@slidewright/source", ...defaultClientConditions],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
  },
});
