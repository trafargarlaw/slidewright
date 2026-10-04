import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { styled, useTheme } from "styled-components";
import { Slide, getSlideClicks } from "./Slide";
import { Navigation } from "./Navigation";
import { useNavigation } from "../hooks/useNavigation";
import type { SlideInfo } from "../types";

interface DeckProps {
  slides: SlideInfo[];
  /** When provided, the deck syncs to this slide on cursor interaction */
  cursorNav?: { slideIndex: number; seq: number };
  /** Reports the currently displayed slide index */
  onSlideChange?: (index: number) => void;
}

export function Deck({ slides, cursorNav, onSlideChange }: DeckProps) {
  const { slide: slideDimensions } = useTheme();
  const slideAreaRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const el = slideAreaRef.current;
    if (!el) return;
    const padding = 24; // px breathing room around the slide
    const availW = el.clientWidth - padding * 2;
    const availH = el.clientHeight - padding * 2;
    const s = Math.min(availW / slideDimensions.width, availH / slideDimensions.height, 1);
    setScale(Math.max(s, 0.1));
  }, [slideDimensions]);

  useEffect(() => {
    const el = slideAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    updateScale();
    return () => ro.disconnect();
  }, [updateScale]);

  const clicksPerSlide = useMemo(
    () => slides.map((s) => getSlideClicks(s.content, s.frontmatter.clicks)),
    [slides],
  );

  const {
    slideIndex,
    currentClick,
    totalSlides,
    maxClicks,
    next,
    prev,
    goToSlide,
  } = useNavigation(slides.length, clicksPerSlide);

  // Sync preview to editor cursor — only when seq changes (new click/edit in editor)
  // and only if the cursor's slide differs from what the preview is showing
  const prevSeqRef = useRef(-1);
  useEffect(() => {
    if (cursorNav != null && cursorNav.seq !== prevSeqRef.current) {
      prevSeqRef.current = cursorNav.seq;
      if (cursorNav.slideIndex !== slideIndex) {
        goToSlide(cursorNav.slideIndex);
      }
    }
  }, [cursorNav, slideIndex, goToSlide]);

  // Report displayed slide to parent
  useEffect(() => {
    onSlideChange?.(slideIndex);
  }, [slideIndex, onSlideChange]);

  const currentSlide = slides[slideIndex];

  if (!currentSlide) {
    return <Empty>No slides found</Empty>;
  }

  return (
    <DeckContainer>
      <SlideArea ref={slideAreaRef} className="slidev-slides">
        <SlideScaler style={{ transform: `scale(${scale})` }}>
          <Slide
            key={slideIndex}
            slide={currentSlide}
            currentClick={currentClick}
          />
        </SlideScaler>
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
  );
}

const DeckContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const SlideArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const SlideScaler = styled.div`
  transform-origin: center center;
  flex-shrink: 0;
`;

const Empty = styled.div`
  color: rgba(0, 0, 0, 0.3);
  font-size: 1.5em;
  text-align: center;
`;
