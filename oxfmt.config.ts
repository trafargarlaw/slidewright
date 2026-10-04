import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  // The playground predates the formatter and is due for a rewrite; it is
  // excluded until then so formatting churn doesn't bury real changes.
  ignorePatterns: ["apps/playground/**", "bun.lock"],
});
