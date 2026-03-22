import { useMemo } from 'react'
import styled from 'styled-components'
import { Slide, getSlideClicks } from './Slide'
import { Navigation } from './Navigation'
import { useNavigation } from '../hooks/useNavigation'
import type { SlideInfo } from '../types'

interface DeckProps {
  slides: SlideInfo[]
}

export function Deck({ slides }: DeckProps) {
  const clicksPerSlide = useMemo(
    () => slides.map((s) => getSlideClicks(s.content)),
    [slides],
  )

  const {
    slideIndex,
    currentClick,
    totalSlides,
    maxClicks,
    next,
    prev,
  } = useNavigation(slides.length, clicksPerSlide)

  const currentSlide = slides[slideIndex]

  if (!currentSlide) {
    return <Empty>No slides found</Empty>
  }

  return (
    <DeckContainer>
      <SlideArea>
        <Slide
          key={slideIndex}
          slide={currentSlide}
          currentClick={currentClick}
        />
      </SlideArea>

      <Navigation
        slideIndex={slideIndex}
        totalSlides={totalSlides}
        currentClick={currentClick}
        maxClicks={maxClicks}
        onNext={next}
        onPrev={prev}
      />
    </DeckContainer>
  )
}

const DeckContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`

const SlideArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Empty = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.5em;
  text-align: center;
`
