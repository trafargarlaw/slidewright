import type { SlideInfo, SlidesData } from "../types";

/**
 * Browser-compatible Slidev markdown parser.
 * Splits markdown by `---` separators, extracts YAML frontmatter per slide.
 */
export function parseSlides(markdown: string): SlidesData {
  // Split by --- on its own line
  const blocks = markdown.split(/^---$/m);

  const slides: SlideInfo[] = [];
  let i = 0;

  // Skip empty first block (before first ---)
  if (blocks[i]?.trim() === "") i++;

  while (i < blocks.length) {
    const block = blocks[i];

    if (isFrontmatter(block)) {
      const frontmatter = parseSimpleYaml(block);
      i++;
      const rawContent = i < blocks.length ? blocks[i].trim() : "";
      const { content, note } = extractNote(rawContent);
      i++;
      slides.push({
        index: slides.length,
        frontmatter,
        content,
        note,
        title: frontmatter.title || "",
        level: frontmatter.level || 0,
      });
    } else {
      const { content, note } = extractNote(block.trim());
      slides.push({
        index: slides.length,
        frontmatter: {},
        content,
        note,
        title: "",
        level: 0,
      });
      i++;
    }
  }

  // Filter out empty slides (can happen with trailing ---)
  const filtered = slides.filter(
    (s) => s.content || Object.keys(s.frontmatter).length > 0,
  );
  filtered.forEach((s, idx) => {
    s.index = idx;
  });

  const config = filtered[0]?.frontmatter || {};

  return {
    slides: filtered,
    raw: markdown,
    config,
  };
}

/**
 * Returns 1-based line numbers where each slide's section starts in the source.
 * Used to map cursor position → slide index.
 */
export function getSlideStartLines(markdown: string): number[] {
  const lines = markdown.split("\n");
  const starts: number[] = [1]; // Slide 0 always starts at line 1
  let i = 0;

  // Handle first slide's frontmatter (file starts with ---)
  if (lines[0]?.trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i]?.trim() !== "---") i++;
    i++; // skip closing ---
  }

  while (i < lines.length) {
    if (lines[i]?.trim() === "---") {
      starts.push(i + 1); // 1-based
      i++;

      // Check if what follows is frontmatter (all lines are key: value until next ---)
      const blockStart = i;
      let j = i;
      while (j < lines.length && lines[j]?.trim() !== "---") j++;

      const blockLines = lines
        .slice(blockStart, j)
        .filter((l) => l.trim() !== "");
      const isFm =
        blockLines.length > 0 &&
        blockLines.every((l) => /^\w[\w-]*\s*:/.test(l.trim()));

      if (isFm && j < lines.length) {
        i = j + 1; // skip past the closing ---
      }
      // otherwise i already points to content
    } else {
      i++;
    }
  }

  return starts;
}

/** Extract a <!-- notes ... --> block from the end of slide content */
function extractNote(raw: string): { content: string; note: string } {
  const noteMarker = raw.lastIndexOf("<!-- notes");
  if (noteMarker === -1) return { content: raw.trim(), note: "" };

  const closeIdx = raw.indexOf("-->", noteMarker);
  if (closeIdx === -1) return { content: raw.trim(), note: "" };

  // Only match if nothing substantial comes after -->
  if (raw.slice(closeIdx + 3).trim() !== "") return { content: raw.trim(), note: "" };

  const noteContent = raw.slice(noteMarker + "<!-- notes".length, closeIdx).trim();
  const content = raw.slice(0, noteMarker).trim();

  return { content, note: noteContent };
}

/**
 * Update or insert a presenter note for a given slide in the raw markdown.
 * Returns the updated markdown string.
 */
export function updateSlideNote(
  markdown: string,
  slideIndex: number,
  note: string,
): string {
  const lines = markdown.split("\n");
  const starts = getSlideStartLines(markdown);

  if (slideIndex < 0 || slideIndex >= starts.length) return markdown;

  const rangeStart = starts[slideIndex] - 1; // 0-based
  const rawRangeEnd =
    slideIndex + 1 < starts.length
      ? starts[slideIndex + 1] - 2
      : lines.length - 1;

  // Find last non-empty line in range
  let lastNonEmpty = rawRangeEnd;
  while (lastNonEmpty > rangeStart && lines[lastNonEmpty].trim() === "") {
    lastNonEmpty--;
  }

  // Check for existing note block at the end
  let noteStart = -1;
  let noteEnd = -1;

  if (/^\s*-->\s*$/.test(lines[lastNonEmpty])) {
    noteEnd = lastNonEmpty;
    for (let k = lastNonEmpty - 1; k >= rangeStart; k--) {
      if (/^\s*<!--\s*notes\b/.test(lines[k])) {
        noteStart = k;
        break;
      }
    }
  }

  const trimmedNote = note.trim();

  if (noteStart !== -1 && noteEnd !== -1) {
    // Include preceding blank line in removal
    const removeFrom =
      noteStart > rangeStart && lines[noteStart - 1].trim() === ""
        ? noteStart - 1
        : noteStart;
    const removeCount = noteEnd - removeFrom + 1;

    if (trimmedNote) {
      lines.splice(
        removeFrom,
        removeCount,
        "",
        "<!-- notes",
        ...trimmedNote.split("\n"),
        "-->",
      );
    } else {
      lines.splice(removeFrom, removeCount);
    }
  } else if (trimmedNote) {
    lines.splice(
      lastNonEmpty + 1,
      0,
      "",
      "<!-- notes",
      ...trimmedNote.split("\n"),
      "-->",
    );
  }

  return lines.join("\n");
}

/** Check if a block looks like YAML frontmatter (all non-empty lines are key: value) */
function isFrontmatter(block: string): boolean {
  const lines = block
    .trim()
    .split("\n")
    .filter((l) => l.trim() !== "");
  if (lines.length === 0) return false;
  return lines.every((line) => /^\w[\w-]*\s*:/.test(line.trim()));
}

/** Parse simple YAML key-value pairs (no nesting, no arrays) */
function parseSimpleYaml(block: string): Record<string, any> {
  const result: Record<string, any> = {};

  for (const line of block.trim().split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value: any = line.slice(colonIdx + 1).trim();

    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Type coercion
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (value !== "" && !isNaN(Number(value))) value = Number(value);

    result[key] = value;
  }

  return result;
}
