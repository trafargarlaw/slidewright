import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 80,
  // The playground predates the formatter and is due for a rewrite; it is
  // excluded until then so formatting churn doesn't bury real changes.
  // Decks are not plain Markdown: the formatter reads slide frontmatter as
  // headings. The agent skills come from skills-lock.json, and are kept as
  // their authors wrote them.
  ignorePatterns: [
    "apps/playground/**",
    ".agents/**",
    ".claude/**",
    "bun.lock",
    "**/slides.md",
    "apps/docs/decks/**",
  ],
});
