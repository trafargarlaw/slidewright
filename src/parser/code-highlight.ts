import type { HighlightStep } from '../types'

/**
 * Parse highlight meta from code blocks, e.g. {1|3-5|all}
 * Returns an array of highlight steps.
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
 * Compute click assignments for a slide's markdown content.
 * Returns total click count and a map from source line number to click index.
 */
export function computeClickMap(markdown: string): {
  totalClicks: number
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
    } else if (!inCodeBlock && line.match(/^\s*[-*+]\s/)) {
      lineToClick.set(lineNum, nextClick)
      lineToStepCount.set(lineNum, 1)
      nextClick++
    }
  }

  return { totalClicks: nextClick - 1, lineToClick, lineToStepCount }
}
