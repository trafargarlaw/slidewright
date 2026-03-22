export interface SlideInfo {
  index: number
  frontmatter: Record<string, any>
  content: string
  note?: string
  title?: string
  level?: number
}

export interface SlidesData {
  slides: SlideInfo[]
  raw: string
  config: Record<string, any>
}

export interface HighlightStep {
  lines: number[] | 'all'
}

export interface ClickMap {
  totalClicks: number
  lineToClick: Map<number, number>
  lineToStepCount: Map<number, number>
}
