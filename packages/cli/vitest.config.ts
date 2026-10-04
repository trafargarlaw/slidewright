import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Test against workspace sources, so tests don't need a prior build.
  ssr: {
    resolve: {
      conditions: ["@slidewright/source", ...defaultServerConditions],
    },
  },
  test: {
    environment: "node",
    testTimeout: 30_000,
  },
});
