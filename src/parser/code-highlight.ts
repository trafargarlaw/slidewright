import type { HighlightStep } from "../types";

/**
 * Parse highlight meta from code blocks.
 * Auto: {1|3-5|all}  Explicit: {1@1|3-5@2|all@3}
 */
export function parseHighlightMeta(meta: string): HighlightStep[] {
  const match = meta.match(/\{([^}]+)\}/);
  if (!match) return [];

  const raw = match[1];
  return raw.split("|").map((part) => {
    const trimmed = part.trim();
    const clickMatch = trimmed.match(/@(\d+)$/);
    const click = clickMatch ? parseInt(clickMatch[1], 10) : undefined;
    const linesPart = clickMatch
      ? trimmed.slice(0, -clickMatch[0].length).trim()
      : trimmed;

    if (linesPart === "all") {
      return { lines: "all" as const, click };
    }

    const lines: number[] = [];
    for (const range of linesPart.split(",")) {
      const dashMatch = range.trim().match(/^(\d+)-(\d+)$/);
      if (dashMatch) {
        const start = parseInt(dashMatch[1], 10);
        const end = parseInt(dashMatch[2], 10);
        for (let i = start; i <= end; i++) {
          lines.push(i);
        }
      } else {
        const num = parseInt(range.trim(), 10);
        if (!isNaN(num)) {
          lines.push(num);
        }
      }
    }
    return { lines, click };
  });
}

/**
 * Split markdown into step segments by <!-- step --> markers.
 * Supports explicit click numbers: <!-- step 2 -->
 */
export function parseSteps(
  markdown: string,
): { content: string; isInitial: boolean; click?: number }[] {
  const markerRegex = /<!--\s*step(?:\s+(\d+))?\s*-->/g;
  const markers: { index: number; length: number; click?: number }[] = [];
  let m;
  while ((m = markerRegex.exec(markdown)) !== null) {
    markers.push({
      index: m.index,
      length: m[0].length,
      click: m[1] ? parseInt(m[1], 10) : undefined,
    });
  }

  if (markers.length === 0) {
    const content = markdown.trim();
    return content.length > 0 ? [{ content, isInitial: true }] : [];
  }

  const results: { content: string; isInitial: boolean; click?: number }[] = [];

  const beforeFirst = markdown.slice(0, markers[0].index).trim();
  if (beforeFirst.length > 0) {
    results.push({ content: beforeFirst, isInitial: true });
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : markdown.length;
    const content = markdown.slice(start, end).trim();
    if (content.length > 0) {
      results.push({
        content,
        isInitial: false,
        click: markers[i].click,
      });
    }
  }

  return results;
}

/**
 * Count code highlight steps in a markdown string (for auto mode).
 * Skips code blocks that use explicit @N click annotations.
 */
export function computeCodeClicks(markdown: string): {
  totalSteps: number;
  lineToClick: Map<number, number>;
  lineToStepCount: Map<number, number>;
} {
  const lineToClick = new Map<number, number>();
  const lineToStepCount = new Map<number, number>();
  let nextClick = 1;

  const lines = markdown.split("\n");
  let inCodeBlock = false;
  let codeBlockStartLine = 0;
  let codeMeta = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStartLine = lineNum;
        const metaMatch = line.match(/\{([^}]+)\}/);
        codeMeta = metaMatch ? metaMatch[1] : "";
      } else {
        // Only count auto steps (skip blocks with @N annotations)
        if (codeMeta && !codeMeta.includes("@")) {
          const stepCount = codeMeta.split("|").length;
          lineToClick.set(codeBlockStartLine, nextClick);
          lineToStepCount.set(codeBlockStartLine, stepCount);
          nextClick += stepCount;
        }
        inCodeBlock = false;
        codeMeta = "";
      }
    }
  }

  return { totalSteps: nextClick - 1, lineToClick, lineToStepCount };
}

/**
 * Find the maximum explicit click number in markdown.
 * Scans <!-- step N -->, code @N annotations, and <mark at="N">.
 */
export function findMaxExplicitClick(markdown: string): number {
  let max = 0;
  let m;

  // Step markers: <!-- step N -->
  const stepRegex = /<!--\s*step\s+(\d+)\s*-->/g;
  while ((m = stepRegex.exec(markdown)) !== null) {
    max = Math.max(max, parseInt(m[1], 10));
  }

  // Code metas: @N
  let inCodeBlock = false;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        const metaMatch = line.match(/\{([^}]+)\}/);
        if (metaMatch) {
          for (const part of metaMatch[1].split("|")) {
            const clickMatch = part.match(/@(\d+)/);
            if (clickMatch)
              max = Math.max(max, parseInt(clickMatch[1], 10));
          }
        }
      }
      inCodeBlock = !inCodeBlock;
    }
  }

  // Marks: <mark at="N"> (outside code blocks)
  inCodeBlock = false;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const markRegex = /<mark\s[^>]*\bat\s*=\s*["']?(\d+)["']?/gi;
    while ((m = markRegex.exec(line)) !== null) {
      max = Math.max(max, parseInt(m[1], 10));
    }
  }

  return max;
}

/**
 * Compute total clicks for a slide.
 * Priority: frontmatter clicks > max explicit > auto-computed.
 */
export function computeTotalSlideClicks(
  markdown: string,
  frontmatterClicks?: number,
): number {
  if (frontmatterClicks != null) return frontmatterClicks;

  const maxExplicit = findMaxExplicitClick(markdown);

  // Auto computation (only for segments without explicit clicks)
  const segments = parseSteps(markdown);
  let autoTotal = 0;

  for (const seg of segments) {
    if (!seg.isInitial && seg.click != null) continue; // skip explicit segments

    const { totalSteps } = computeCodeClicks(seg.content);

    if (seg.isInitial) {
      autoTotal += Math.max(0, totalSteps - 1);
    } else {
      if (totalSteps > 0) {
        autoTotal += totalSteps;
      } else {
        autoTotal += 1;
      }
    }
  }

  return Math.max(autoTotal, maxExplicit);
}
