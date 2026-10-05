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
 * doesn't have, and for each diagram when the project has no Mermaid to draw
 * it with. In line order.
 */
export function findProblems(
  deck: Deck,
  source: string,
  { mermaid = true }: { mermaid?: boolean } = {},
): Diagnostic[] {
  const lines = source.split(/\r?\n/);
  const problems = [...deck.diagnostics];

  for (const line of mermaid ? [] : findDiagrams(lines)) {
    problems.push({
      severity: "warning",
      message:
        "This `mermaid` block shows as code: the project doesn't have Mermaid to draw the diagram. Add it with `npm install mermaid`.",
      line,
      slide: deck.slides.find(
        ({ range }) => range.start <= line && line <= range.end,
      )?.index,
    });
  }

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

/** The lines where a `mermaid` code block starts. */
function findDiagrams(lines: readonly string[]): number[] {
  const found: number[] = [];
  let open: { mark: string; length: number } | undefined;
  lines.forEach((text, index) => {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
    if (!fence) return;
    const marks = fence[1]!;
    const info = fence[2]!.trim();
    if (!open) {
      open = { mark: marks[0]!, length: marks.length };
      if (/^mermaid(?:\s|$)/i.test(info)) found.push(index + 1);
    } else if (
      marks[0] === open.mark &&
      marks.length >= open.length &&
      info === ""
    ) {
      open = undefined;
    }
  });
  return found;
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
