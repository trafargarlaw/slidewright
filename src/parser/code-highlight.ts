import type { HighlightStep } from '../types'

/**
 * Parse highlight meta from code blocks, e.g. {1|3-5|all}
 */
export function parseHighlightMeta(meta: string): HighlightStep[] {
  const match = meta.match(/\{([^}]+)\}/)
  if (!match) return []

  const raw = match[1]
  return raw.split('|').map((part) => {
    const trimmed = part.trim()
    if (trimmed === 'all') {
      return { lines: 'all' as const }
    }

    const lines: number[] = []
    for (const range of trimmed.split(',')) {
      const dashMatch = range.trim().match(/^(\d+)-(\d+)$/)
      if (dashMatch) {
        const start = parseInt(dashMatch[1], 10)
        const end = parseInt(dashMatch[2], 10)
        for (let i = start; i <= end; i++) {
          lines.push(i)
        }
      } else {
        const num = parseInt(range.trim(), 10)
        if (!isNaN(num)) {
          lines.push(num)
        }
      }
    }
    return { lines }
  })
}

/**
 * Split markdown into step segments by <!-- step --> markers.
 * The first segment (before any marker) is always visible (step 0).
 */
export function parseSteps(
  markdown: string,
): { content: string; isInitial: boolean }[] {
  const parts = markdown.split(/<!--\s*step(?:\s+\d+)?\s*-->/)
  return parts
    .map((content, i) => ({
      content: content.trim(),
      isInitial: i === 0,
    }))
    .filter((s) => s.content.length > 0)
}

/**
 * Count code highlight steps in a markdown string.
 * Returns a map from source line to click info, and total internal clicks.
 * Only tracks code blocks with highlight meta (not list items).
 */
export function computeCodeClicks(markdown: string): {
  totalSteps: number
  lineToClick: Map<number, number>
  lineToStepCount: Map<number, number>
} {
  const lineToClick = new Map<number, number>()
  const lineToStepCount = new Map<number, number>()
  let nextClick = 1

  const lines = markdown.split('\n')
  let inCodeBlock = false
  let codeBlockStartLine = 0
  let codeMeta = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    if (line.match(/^```/)) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockStartLine = lineNum
        const metaMatch = line.match(/\{([^}]+)\}/)
        codeMeta = metaMatch ? metaMatch[1] : ''
      } else {
        if (codeMeta) {
          const stepCount = codeMeta.split('|').length
          lineToClick.set(codeBlockStartLine, nextClick)
          lineToStepCount.set(codeBlockStartLine, stepCount)
          nextClick += stepCount
        }
        inCodeBlock = false
        codeMeta = ''
      }
    }
  }

  return { totalSteps: nextClick - 1, lineToClick, lineToStepCount }
}

/**
 * Compute total maxClicks for a slide's markdown content.
 * Accounts for step markers and code highlight steps.
 */
export function computeTotalSlideClicks(markdown: string): number {
  const segments = parseSteps(markdown)
  let maxClick = 0

  for (const seg of segments) {
    const { totalSteps } = computeCodeClicks(seg.content)

    if (seg.isInitial) {
      // Step 0: first code highlight is the initial state (free), rest need clicks
      maxClick += Math.max(0, totalSteps - 1)
    } else {
      // Step N: 1 click to appear, first code highlight coincides with appear
      if (totalSteps > 0) {
        maxClick += totalSteps // appear + (totalSteps - 1) extra = totalSteps
      } else {
        maxClick += 1 // just appear
      }
    }
  }

  return maxClick
}

// Keep old name as alias for backward compat
export const computeClickMap = computeCodeClicks
