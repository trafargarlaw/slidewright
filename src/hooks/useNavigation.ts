import { useCallback, useEffect, useState } from 'react'

function readHash(): { slide: number; click: number } {
  const hash = window.location.hash.replace('#', '')
  const [slideStr, clickStr] = hash.split('?click=')
  const slide = Math.max(0, parseInt(slideStr, 10) || 0)
  const click = Math.max(0, parseInt(clickStr, 10) || 0)
  return { slide, click }
}

function writeHash(slide: number, click: number) {
  const hash = click > 0 ? `#${slide}?click=${click}` : `#${slide}`
  window.history.replaceState(null, '', hash)
}

export function useNavigation(totalSlides: number, clicksPerSlide: number[]) {
  const [slideIndex, setSlideIndex] = useState(() => readHash().slide)
  const [currentClick, setCurrentClick] = useState(() => readHash().click)

  const maxClicks = clicksPerSlide[slideIndex] || 0

  const goToSlide = useCallback((index: number, click = 0) => {
    const clamped = Math.max(0, Math.min(index, totalSlides - 1))
    setSlideIndex(clamped)
    setCurrentClick(Math.max(0, click))
    writeHash(clamped, Math.max(0, click))
  }, [totalSlides])

  const next = useCallback(() => {
    if (currentClick < maxClicks) {
      const nextClick = currentClick + 1
      setCurrentClick(nextClick)
      writeHash(slideIndex, nextClick)
    } else if (slideIndex < totalSlides - 1) {
      const nextSlide = slideIndex + 1
      setSlideIndex(nextSlide)
      setCurrentClick(0)
      writeHash(nextSlide, 0)
    }
  }, [currentClick, maxClicks, slideIndex, totalSlides])

  const prev = useCallback(() => {
    if (currentClick > 0) {
      const prevClick = currentClick - 1
      setCurrentClick(prevClick)
      writeHash(slideIndex, prevClick)
    } else if (slideIndex > 0) {
      const prevSlide = slideIndex - 1
      const prevMaxClicks = clicksPerSlide[prevSlide] || 0
      setSlideIndex(prevSlide)
      setCurrentClick(prevMaxClicks)
      writeHash(prevSlide, prevMaxClicks)
    }
  }, [currentClick, slideIndex, clicksPerSlide])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        prev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [next, prev])

  useEffect(() => {
    function handleHash() {
      const { slide, click } = readHash()
      setSlideIndex(slide)
      setCurrentClick(click)
    }

    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  return {
    slideIndex,
    currentClick,
    totalSlides,
    maxClicks,
    next,
    prev,
    goToSlide,
  }
}
