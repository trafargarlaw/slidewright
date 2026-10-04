import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Test against workspace sources, so tests don't need a prior build.
    conditions: ["@slidewright/source", ...defaultServerConditions],
  },
  test: {
    environment: "node",
  },
});
