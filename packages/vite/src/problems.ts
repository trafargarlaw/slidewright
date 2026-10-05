import { relative } from "node:path";
import { styleText } from "node:util";
import type { Deck, Diagnostic } from "@slidewright/core";

/**
 * The layouts of `@slidewright/react`, which the plugin's page renders decks
 * with. A test keeps this list in step with the package.
 */
export const LAYOUTS: readonly string[] = [
  "default",
  "center",
  "cover",
  "section",
  "statement",
  "fact",
  "quote",
  "full",
  "two-cols",
  "image",
  "image-left",
  "image-right",
];

/**
 * The deck's diagnostics, plus a warning for each slide whose layout the page
 * doesn't have, in line order.
 */
export function findProblems(deck: Deck, source: string): Diagnostic[] {
  const lines = source.split(/\r?\n/);
  const problems = [...deck.diagnostics];

  for (const slide of deck.slides) {
    if (LAYOUTS.includes(slide.layout)) continue;
    // The `layout:` line of the slide's frontmatter, when it has one.
    const { start, end } = slide.frontmatterRange ?? slide.range;
    let line = start;
    for (let i = start; i <= end; i++) {
      if (/^layout[ \t]*:/.test(lines[i - 1] ?? "")) {
        line = i;
        break;
      }
    }
    problems.push({
      severity: "warning",
      message: `Unknown layout "${slide.layout}": the slide shows with the default layout. The layouts are ${LAYOUTS.join(", ")}.`,
      line,
      slide: slide.index,
    });
  }
  return problems.sort((a, b) => a.line - b.line);
}

/** `slides.md:12: warning: message`, with the path relative to `cwd`. */
export function formatProblem(
  file: string,
  { severity, message, line }: Diagnostic,
  cwd = process.cwd(),
): string {
  const label =
    severity === "error"
      ? styleText("red", "error")
      : styleText("yellow", "warning");
  return `${relative(cwd, file) || file}:${line}: ${label}: ${message}`;
}
