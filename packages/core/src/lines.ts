const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/;

/**
 * Marks every line that belongs to a fenced code block, including the fence
 * lines themselves.
 *
 * A fence that is never closed protects nothing: in a live editor the user is
 * often halfway through typing one, and swallowing the rest of the deck into a
 * single slide would make the preview jump around.
 */
export function markCodeLines(lines: string[]): boolean[] {
  const inCode = Array.from<boolean>({ length: lines.length }).fill(false);
  const ignoredOpeners = new Set<number>();

  let start = 0;
  scan: while (true) {
    let fence: { char: string; length: number; line: number } | null = null;

    for (let i = start; i < lines.length; i++) {
      const line = lines[i]!;

      if (fence) {
        inCode[i] = true;
        const close = FENCE_CLOSE.exec(line);
        if (
          close &&
          close[1]![0] === fence.char &&
          close[1]!.length >= fence.length
        ) {
          fence = null;
        }
        continue;
      }

      const open = FENCE_OPEN.exec(line);
      if (!open || ignoredOpeners.has(i)) continue;

      const marker = open[1]!;
      // Backtick fences can't contain backticks in their info string.
      if (marker[0] === "`" && line.slice(open[0].length).includes("`")) {
        continue;
      }
      fence = { char: marker[0]!, length: marker.length, line: i };
      inCode[i] = true;
    }

    if (!fence) break scan;

    // Unclosed fence: undo it and rescan from its opening line.
    ignoredOpeners.add(fence.line);
    for (let i = fence.line; i < lines.length; i++) inCode[i] = false;
    start = fence.line;
  }

  return inCode;
}

/** Lines without the blank lines at the start and end. */
export function trimBlankLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && isBlankLine(lines[start]!)) start++;
  while (end > start && isBlankLine(lines[end - 1]!)) end--;
  return lines.slice(start, end);
}

export function isBlankLine(line: string): boolean {
  return line.trim() === "";
}

/**
 * The opening lines of the closed fenced code blocks marked by
 * `markCodeLines`, with their 0-based line index and info string.
 */
export function findFences(
  lines: string[],
  inCode: boolean[],
): { line: number; info: string }[] {
  const fences: { line: number; info: string }[] = [];
  let open: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!inCode[i]) {
      open = null;
    } else if (open === null) {
      const marker = FENCE_OPEN.exec(line)!;
      open = marker[1]!;
      fences.push({ line: i, info: line.slice(marker[0].length).trim() });
    } else {
      const close = FENCE_CLOSE.exec(line);
      if (
        close &&
        close[1]![0] === open[0] &&
        close[1]!.length >= open.length
      ) {
        open = null;
      }
    }
  }
  return fences;
}
