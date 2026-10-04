import { formatLines, parseLines } from "./highlights";

/** How a line of a `diff` code block changed. */
export type LineChange = "added" | "removed";

const CHANGES: readonly LineChange[] = ["added", "removed"];

/**
 * Takes the `+` and `-` markers off the lines of a `diff` code block, and
 * records the lines they marked by 1-based line number.
 *
 * Unchanged lines can start with a space, as in `git diff` output. When every
 * unchanged line does, that space is a marker too and is taken off. Otherwise
 * unchanged lines are kept as written.
 */
export function stripDiffMarkers(code: string): {
  code: string;
  changes: Map<number, LineChange>;
} {
  const lines = code.split("\n");
  const changes = new Map<number, LineChange>();
  lines.forEach((line, index) => {
    if (line.startsWith("+")) changes.set(index + 1, "added");
    else if (line.startsWith("-")) changes.set(index + 1, "removed");
  });

  // Blank lines don't count: editors often trim a lone space.
  const spaced = lines.every(
    (line, index) =>
      line === "" || changes.has(index + 1) || line.startsWith(" "),
  );
  const stripped = lines.map((line, index) =>
    spaced || changes.has(index + 1) ? line.slice(1) : line,
  );
  return { code: stripped.join("\n"), changes };
}

/**
 * Serialises line changes into the `data-diff` attribute on compiled code
 * elements: `added:3-4|removed:2`.
 */
export function formatLineChanges(changes: Map<number, LineChange>): string {
  return CHANGES.flatMap((change) => {
    const lines = [...changes]
      .filter(([, value]) => value === change)
      .map(([line]) => line);
    return lines.length > 0 ? [`${change}:${formatLines(lines)}`] : [];
  }).join("|");
}

/** Reads the `data-diff` attribute of a compiled code element. */
export function parseLineChanges(value: string): Map<number, LineChange> {
  const changes = new Map<number, LineChange>();
  for (const part of value.split("|")) {
    const [change, spec = ""] = part.split(":", 2);
    if (!CHANGES.includes(change as LineChange)) continue;

    const lines = parseLines(spec);
    if (!Array.isArray(lines)) continue;
    for (const line of lines) changes.set(line, change as LineChange);
  }
  return changes;
}
