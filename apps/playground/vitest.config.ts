import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

// Test against workspace sources, so tests don't need a prior build. Tests run
// in Node, which resolves with the SSR conditions.
const SOURCE_CONDITION = "@slidewright/source";

export default defineConfig({
  resolve: {
    conditions: [SOURCE_CONDITION, ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: [SOURCE_CONDITION, ...defaultServerConditions],
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
