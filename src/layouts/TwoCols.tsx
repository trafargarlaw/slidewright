import { useMemo } from 'react'
import styled from 'styled-components'
import { SlideContent } from '../components/SlideContent'
import { computeClickMap } from '../parser/code-highlight'

interface TwoColsLayoutProps {
  markdown: string
}

export function TwoColsLayout({ markdown }: TwoColsLayoutProps) {
  const [left, right] = splitColumns(markdown)
  const leftClicks = useMemo(() => computeClickMap(left).totalClicks, [left])

  return (
    <Container>
      <Column>
        <SlideContent markdown={left} clickOffset={0} />
      </Column>
      <Column>
        <SlideContent markdown={right} clickOffset={leftClicks} />
      </Column>
    </Container>
  )
}

function splitColumns(markdown: string): [string, string] {
  const marker = '::right::'
  const idx = markdown.indexOf(marker)
  if (idx === -1) return [markdown, '']
  return [markdown.slice(0, idx).trim(), markdown.slice(idx + marker.length).trim()]
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  padding: ${({ theme }) => theme.slide.padding};
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.xl};
  align-items: center;
`

const Column = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
`
