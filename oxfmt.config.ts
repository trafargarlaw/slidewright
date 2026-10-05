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
    "examples/chapters/**/*.md",
    "apps/docs/decks/**",
  ],
  // The same goes for the decks in the code blocks of the docs: formatted as
  // Markdown, the frontmatter of a slide gets a blank line that turns it
  // into text.
  overrides: [
    { files: ["**/*.md"], options: { embeddedLanguageFormatting: "off" } },
  ],
});
