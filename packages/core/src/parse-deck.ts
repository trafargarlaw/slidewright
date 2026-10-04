import { parseDocument } from "yaml";
import { DEFAULT_CONFIG, isPlainObject, resolveConfig } from "./config";
import { markCodeLines } from "./lines";
import type { Deck, DeckConfig, Diagnostic, Slide } from "./types";

const SEPARATOR = /^---[ \t]*$/;
const FRONTMATTER_START = /^[A-Za-z_$][\w$-]*[ \t]*:(?:[ \t]|$)/;
const NOTES_OPEN = /^[ \t]*<!--[ \t]*notes\b/;
const HEADING = /^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;

/** Headmatter keys that configure the deck rather than the first slide. */
const DECK_KEYS = new Set([
  "theme",
  "colorScheme",
  "aspectRatio",
  "canvasWidth",
  "defaults",
]);

/** Lines between two separators: `from` inclusive, `to` exclusive, 0-based. */
interface Chunk {
  from: number;
  to: number;
  openedBySeparator: boolean;
  closedBySeparator: boolean;
}

interface Draft {
  separator?: number;
  frontmatter?: Chunk;
  body: Chunk;
}

/**
 * Parses a Markdown deck into its config and slides.
 *
 * Never throws: problems such as invalid frontmatter are reported in
 * `diagnostics` and the rest of the deck still parses, so a live preview can
 * keep rendering while the user types.
 */
export function parseDeck(source: string): Deck {
  const lines = source.split(/\r?\n/);
  const inCode = markCodeLines(lines);
  const diagnostics: Diagnostic[] = [];

  const drafts = splitSlides(lines, inCode);
  const startsWithSeparator =
    drafts[0]?.separator !== undefined &&
    lines.slice(0, drafts[0].separator).every(isBlankLine);
  const headmatterChunk = startsWithSeparator
    ? drafts[0]?.frontmatter
    : undefined;

  let config: DeckConfig = { ...DEFAULT_CONFIG, defaults: {} };
  let headmatter: Record<string, unknown> = {};
  if (headmatterChunk) {
    headmatter = readFrontmatter(lines, headmatterChunk, 0, diagnostics);
    config = resolveConfig(headmatter, headmatterChunk.from + 1, diagnostics);
  }

  const slides = drafts.map((draft, index): Slide => {
    let own: Record<string, unknown>;
    if (draft.frontmatter === headmatterChunk && headmatterChunk) {
      own = Object.fromEntries(
        Object.entries(headmatter).filter(([key]) => !DECK_KEYS.has(key)),
      );
    } else if (draft.frontmatter) {
      own = readFrontmatter(lines, draft.frontmatter, index, diagnostics);
    } else {
      own = {};
    }

    const frontmatter = { ...config.defaults, ...own };
    const { content, notes } = extractNotes(
      lines,
      inCode,
      draft.body,
      index,
      diagnostics,
    );

    let layout = "default";
    if (typeof frontmatter.layout === "string" && frontmatter.layout.trim()) {
      layout = frontmatter.layout.trim();
    } else if (frontmatter.layout !== undefined) {
      diagnostics.push({
        severity: "warning",
        message: "`layout` must be a non-empty string.",
        line: (draft.frontmatter?.from ?? draft.body.from) + 1,
        slide: index,
      });
    }

    const slide: Slide = {
      index,
      frontmatter,
      layout,
      content,
      notes,
      range: {
        start: (draft.separator ?? draft.body.from) + 1,
        end: Math.max(draft.body.to, (draft.separator ?? 0) + 1),
      },
    };

    const title =
      typeof frontmatter.title === "string"
        ? frontmatter.title
        : findHeading(lines, inCode, draft.body);
    if (title) slide.title = title;

    if (draft.frontmatter) {
      slide.frontmatterRange = {
        start: draft.frontmatter.from + 1,
        end: draft.frontmatter.to,
      };
    }
    return slide;
  });

  return { config, slides, diagnostics };
}

/**
 * Returns the index of the slide that contains a 1-based source line, or `-1`
 * when the deck has no slides. Lines after the last slide map to the last one.
 */
export function getSlideAtLine(deck: Deck, line: number): number {
  const { slides } = deck;
  let low = 0;
  let high = slides.length - 1;
  let found = slides.length > 0 ? 0 : -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (slides[mid]!.range.start <= line) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

function splitSlides(lines: string[], inCode: boolean[]): Draft[] {
  const separators: number[] = [];
  lines.forEach((line, i) => {
    if (!inCode[i] && SEPARATOR.test(line)) separators.push(i);
  });

  const bounds = [-1, ...separators, lines.length];
  const chunks: Chunk[] = [];
  for (let j = 0; j < bounds.length - 1; j++) {
    chunks.push({
      from: bounds[j]! + 1,
      to: bounds[j + 1]!,
      openedBySeparator: j > 0,
      closedBySeparator: j < bounds.length - 2,
    });
  }

  const drafts: Draft[] = [];
  // Content before the first separator is only a slide if it isn't blank.
  let j = isBlankChunk(lines, chunks[0]!) ? 1 : 0;

  while (j < chunks.length) {
    const chunk = chunks[j]!;
    const separator = chunk.openedBySeparator ? chunk.from - 1 : undefined;

    if (
      chunk.openedBySeparator &&
      chunk.closedBySeparator &&
      looksLikeFrontmatter(lines, chunk)
    ) {
      drafts.push({ separator, frontmatter: chunk, body: chunks[j + 1]! });
      j += 2;
    } else {
      drafts.push({ separator, body: chunk });
      j += 1;
    }
  }

  // A trailing `---` shouldn't create an empty slide.
  while (drafts.length > 0) {
    const last = drafts[drafts.length - 1]!;
    if (last.frontmatter || !isBlankChunk(lines, last.body)) break;
    drafts.pop();
  }

  return drafts;
}

/**
 * Frontmatter must start on the line right after a separator, with a
 * `key:` pair. A slide whose first line merely looks like `Word: text` can opt
 * out by leaving a blank line after the separator.
 */
function looksLikeFrontmatter(lines: string[], chunk: Chunk): boolean {
  const first = lines[chunk.from];
  return first !== undefined && FRONTMATTER_START.test(first);
}

function readFrontmatter(
  lines: string[],
  chunk: Chunk,
  slide: number,
  diagnostics: Diagnostic[],
): Record<string, unknown> {
  const doc = parseDocument(lines.slice(chunk.from, chunk.to).join("\n"));

  const error = doc.errors[0];
  if (error) {
    const offset = error.linePos?.[0].line ?? 1;
    diagnostics.push({
      severity: "error",
      message: `Invalid frontmatter: ${error.message.split("\n")[0]} If this is slide content, leave a blank line after \`---\`.`,
      line: chunk.from + offset,
      slide,
    });
    return {};
  }

  const value: unknown = doc.toJS();
  if (value == null) return {};
  if (!isPlainObject(value)) {
    diagnostics.push({
      severity: "error",
      message: "Frontmatter must be a mapping of `key: value` pairs.",
      line: chunk.from + 1,
      slide,
    });
    return {};
  }
  return value;
}

/**
 * Removes `<!-- notes ... -->` comments from a slide body and returns them as
 * speaker notes. Comments inside fenced code are left alone.
 */
function extractNotes(
  lines: string[],
  inCode: boolean[],
  body: Chunk,
  slide: number,
  diagnostics: Diagnostic[],
): { content: string; notes: string } {
  const kept: string[] = [];
  const notes: string[] = [];

  for (let i = body.from; i < body.to; i++) {
    const line = lines[i]!;
    const open = inCode[i] ? null : NOTES_OPEN.exec(line);
    if (!open) {
      kept.push(line);
      continue;
    }

    const collected: string[] = [];
    let rest = line.slice(open[0].length);
    let closed = false;

    for (let k = i; k < body.to; k++) {
      if (k > i) rest = lines[k]!;
      const end = rest.indexOf("-->");
      if (end !== -1) {
        collected.push(rest.slice(0, end));
        const after = rest.slice(end + 3);
        if (after.trim()) kept.push(after);
        closed = true;
        i = k;
        break;
      }
      collected.push(rest);
    }

    if (!closed) {
      diagnostics.push({
        severity: "warning",
        message: "Speaker notes are never closed with `-->`.",
        line: i + 1,
        slide,
      });
      i = body.to;
    }

    const text = trimBlankLines(dedent(collected)).join("\n");
    if (text) notes.push(text);
  }

  return {
    content: trimBlankLines(kept).join("\n"),
    notes: notes.join("\n\n"),
  };
}

function findHeading(
  lines: string[],
  inCode: boolean[],
  body: Chunk,
): string | undefined {
  for (let i = body.from; i < body.to; i++) {
    if (inCode[i]) continue;
    const match = HEADING.exec(lines[i]!);
    if (match) return stripInlineMarkdown(match[1]!);
  }
  return undefined;
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/(\*\*|__|\*|_|~~|`)(.+?)\1/g, "$2")
    .trim();
}

function dedent(lines: string[]): string[] {
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => /^[ \t]*/.exec(line)![0].length);
  const indent = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(indent).trimEnd());
}

function trimBlankLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && isBlankLine(lines[start]!)) start++;
  while (end > start && isBlankLine(lines[end - 1]!)) end--;
  return lines.slice(start, end);
}

function isBlankLine(line: string): boolean {
  return line.trim() === "";
}

function isBlankChunk(lines: string[], chunk: Chunk): boolean {
  for (let i = chunk.from; i < chunk.to; i++) {
    if (!isBlankLine(lines[i]!)) return false;
  }
  return true;
}
