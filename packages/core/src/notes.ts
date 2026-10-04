import { markCodeLines, trimBlankLines } from "./lines";

const STEP_MARKER = /^[ \t]*\[step\][ \t]*$/;

/**
 * Splits speaker notes at `[step]` lines into one part per step: the text
 * before the first marker is for step 0, the text after the first marker for
 * step 1, and so on. Markers in fenced code are kept as text.
 *
 * Notes without markers are one part; empty notes have none. The number of
 * parts doesn't have to match the slide's steps.
 */
export function splitNotes(notes: string): string[] {
  if (!notes.trim()) return [];
  const lines = notes.split(/\r?\n/);
  const inCode = markCodeLines(lines);
  const parts: string[][] = [[]];
  lines.forEach((line, i) => {
    if (!inCode[i] && STEP_MARKER.test(line)) parts.push([]);
    else parts.at(-1)!.push(line);
  });
  return parts.map((part) => trimBlankLines(part).join("\n"));
}
