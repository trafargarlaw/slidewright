import { useMemo } from 'react'
import styled from 'styled-components'
import { layouts } from '../layouts'
import { SlideContent } from './SlideContent'
import { ClickContext } from '../hooks/useClicks'
import { computeTotalSlideClicks } from '../parser/code-highlight'
import type { SlideInfo } from '../types'

interface SlideProps {
  slide: SlideInfo
  currentClick: number
}

export function Slide({ slide, currentClick }: SlideProps) {
  const layoutName = slide.frontmatter.layout || 'default'
  const Layout = layouts[layoutName] || layouts.default

  const totalClicks = useMemo(
    () => computeTotalSlideClicks(slide.content),
    [slide.content],
  )

  const clickContextValue = useMemo(
    () => ({ currentClick, totalClicks }),
    [currentClick, totalClicks],
  )

  // TwoCols handles its own content splitting and rendering
  if (layoutName === 'two-cols') {
    return (
      <SlideContainer>
        <ClickContext.Provider value={clickContextValue}>
          <Layout markdown={slide.content} />
        </ClickContext.Provider>
      </SlideContainer>
    )
  }

  return (
    <SlideContainer>
      <ClickContext.Provider value={clickContextValue}>
        <Layout image={slide.frontmatter.image}>
          <SlideContent markdown={slide.content} />
        </Layout>
      </ClickContext.Provider>
    </SlideContainer>
  )
}

/** Returns total click count for a slide's content */
export function getSlideClicks(content: string): number {
  return computeTotalSlideClicks(content)
}

const SlideContainer = styled.div`
  width: ${({ theme }) => theme.slide.width}px;
  height: ${({ theme }) => theme.slide.height}px;
  background: ${({ theme }) => theme.colors.slideBackground};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
`
