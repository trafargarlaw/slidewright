import type { HighlightRange } from "./types";

/** A highlight range as written by the author, before steps are assigned. */
export interface HighlightSpec {
  lines: number[] | "all";
  /** Explicit step from `@N`, if given. */
  step?: number;
}

export interface CodeMeta {
  /** Raw contents of the `{...}` highlight block, e.g. `1|3-5|all`. */
  highlight?: string;
  /** First line number when line numbers are on. */
  lineNumbers?: number;
  title?: string;
}

const META_TOKEN = /([A-Za-z][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;

/**
 * Parses a code fence's meta string:
 *
 * ```text
 * ts {1|3-5|all} lines title="app.ts"
 *    └ highlight  └ line numbers (or lines=10 to start at 10)
 * ```
 */
export function parseCodeMeta(meta: string | null | undefined): CodeMeta {
  const result: CodeMeta = {};
  if (!meta) return result;

  const rest = meta.replace(/\{([^}]*)\}/, (_, inner: string) => {
    if (inner.trim()) result.highlight = inner.trim();
    return " ";
  });

  for (const match of rest.matchAll(META_TOKEN)) {
    const key = match[1]!;
    const value = match[2] ?? match[3] ?? match[4];

    if (key === "lines") {
      const start = value === undefined ? 1 : Number.parseInt(value, 10);
      if (Number.isInteger(start)) result.lineNumbers = start;
    } else if (key === "title" && value !== undefined) {
      result.title = value;
    }
  }
  return result;
}

/** Parses `1|3-5|all` or `1@2|3-5@4` into ranges. Invalid parts are skipped. */
export function parseHighlightSpec(spec: string): HighlightSpec[] {
  const ranges: HighlightSpec[] = [];

  for (const part of spec.split("|")) {
    const match = /^\s*([^@]*?)\s*(?:@\s*(\d+))?\s*$/.exec(part);
    if (!match) continue;

    const lines = parseLines(match[1]!);
    if (!lines) continue;

    const range: HighlightSpec = { lines };
    if (match[2] !== undefined) range.step = Number(match[2]);
    ranges.push(range);
  }
  return ranges;
}

/**
 * Serialises resolved ranges into the `data-highlights` attribute on compiled
 * code elements: `0:1|1:3-5|2:all`.
 */
export function formatHighlights(ranges: HighlightRange[]): string {
  return ranges
    .map(({ step, lines }) => `${step}:${formatLines(lines)}`)
    .join("|");
}

/** Reads the `data-highlights` attribute of a compiled code element. */
export function parseHighlights(value: string): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  for (const part of value.split("|")) {
    const separator = part.indexOf(":");
    if (separator === -1) continue;

    const step = Number(part.slice(0, separator));
    const lines = parseLines(part.slice(separator + 1));
    if (Number.isInteger(step) && lines) ranges.push({ step, lines });
  }
  return ranges;
}

/**
 * Lines to emphasise at a given step: `"all"`, a set of 1-based line numbers,
 * or `null` when no range is active yet (render every line normally).
 */
export function getHighlightedLines(
  ranges: HighlightRange[],
  step: number,
): Set<number> | "all" | null {
  let active: HighlightRange | undefined;
  for (const range of ranges) {
    if (range.step <= step && (!active || range.step >= active.step)) {
      active = range;
    }
  }
  if (!active) return null;
  return active.lines === "all" ? "all" : new Set(active.lines);
}

function parseLines(text: string): number[] | "all" | undefined {
  const trimmed = text.trim();
  if (trimmed === "all" || trimmed === "*") return "all";

  const lines: number[] = [];
  for (const piece of trimmed.split(",")) {
    const range = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(piece);
    if (!range) return undefined;

    const start = Number(range[1]);
    const end = range[2] === undefined ? start : Number(range[2]);
    for (
      let line = Math.min(start, end);
      line <= Math.max(start, end);
      line++
    ) {
      lines.push(line);
    }
  }
  return lines.length > 0 ? lines : undefined;
}

function formatLines(lines: number[] | "all"): string {
  if (lines === "all") return "all";

  const sorted = [...new Set(lines)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]!;
    let end = start;
    while (sorted[i + 1] === end + 1) end = sorted[++i]!;
    parts.push(start === end ? `${start}` : `${start}-${end}`);
  }
  return parts.join(",");
}
