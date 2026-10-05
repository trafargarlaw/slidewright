export interface SearchReplaceResult {
  /** The source with the changes made. */
  text: string;
  /** Changes made. */
  applied: number;
  /** Changes left out, because their SEARCH text isn't in the source. */
  skipped: number;
}

const BLOCK =
  /<<<<<<< SEARCH\n([\s\S]*?)\n?=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;

/**
 * Applies the SEARCH/REPLACE blocks of an AI edit to the source, in order.
 * An empty SEARCH replaces the whole source.
 */
export function applySearchReplace(
  original: string,
  response: string,
): SearchReplaceResult {
  // Strip wrapping code fences (with optional language tag like ```diff, ```markdown)
  const cleaned = response
    .replace(/^```[^\n]*\n?/, "")
    .replace(/\n?```\s*$/, "");

  let text = original;
  let applied = 0;
  let skipped = 0;
  for (const [, search = "", replace = ""] of cleaned.matchAll(BLOCK)) {
    if (search === "") {
      text = replace;
      applied++;
      continue;
    }
    const index = text.indexOf(search);
    if (index === -1) {
      skipped++;
      continue;
    }
    text = text.slice(0, index) + replace + text.slice(index + search.length);
    applied++;
  }
  return { text, applied, skipped };
}
