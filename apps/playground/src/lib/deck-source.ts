import { parseDeck, type Deck, type Slide } from "@react-slides/core";

let last: { source: string; deck: Deck } | undefined;

/**
 * Parses the deck, reusing the previous result while the source is the same.
 * Editor callbacks read the live model text, which is newer than the last
 * render, so they parse it themselves.
 */
export function parseSource(source: string): Deck {
  if (last?.source !== source) last = { source, deck: parseDeck(source) };
  return last.deck;
}

const NOTES_OPEN = /^[ \t]*<!--[ \t]*notes\b/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Replaces a slide's speaker notes in the deck source. The slide's
 * `<!-- notes -->` comments are removed and `notes` is written as one comment
 * at the end of the slide. Empty `notes` removes them.
 */
export function setSlideNotes(
  source: string,
  slide: Slide,
  notes: string,
): string {
  const lines = source.split(/\r?\n/);
  const from = slide.range.start - 1;
  const to = Math.min(slide.range.end, lines.length);

  const kept: string[] = [];
  let fence: string | undefined;
  let removedAt = -1;

  for (let i = from; i < to; i++) {
    const line = lines[i]!;
    const marker = FENCE.exec(line)?.[1];
    if (fence) {
      if (marker?.[0] === fence[0] && marker.length >= fence.length) {
        fence = undefined;
      }
      kept.push(line);
      continue;
    }
    if (marker) {
      fence = marker;
      kept.push(line);
      continue;
    }
    if (!NOTES_OPEN.test(line)) {
      // Don't leave a double blank line where a comment was removed.
      if (!(kept.length === removedAt && !line.trim() && !kept.at(-1)?.trim())) {
        kept.push(line);
      }
      continue;
    }

    let end = i;
    while (end < to && !lines[end]!.includes("-->")) end++;
    const after =
      end < to ? lines[end]!.slice(lines[end]!.indexOf("-->") + 3) : "";
    if (after.trim()) kept.push(after);
    removedAt = kept.length;
    i = end;
  }

  // Keep the slide's blank lines before the next separator.
  let trailing = 0;
  while (to - trailing > from + 1 && !lines[to - trailing - 1]!.trim()) {
    trailing++;
  }
  while (kept.length > 1 && !kept.at(-1)!.trim()) kept.pop();

  const text = notes.trim();
  if (text) kept.push("", "<!-- notes", ...text.split("\n"), "-->");
  kept.push(...Array<string>(trailing).fill(""));

  return [...lines.slice(0, from), ...kept, ...lines.slice(to)].join("\n");
}
