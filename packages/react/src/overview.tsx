import type { Slide } from "@react-slides/core";
import { memo, useEffect, useRef, type CSSProperties, type Ref } from "react";
import type { DirectiveComponents } from "./context";
import { useElementSize } from "./element-size";
import type { Layout } from "./layouts";
import { RenderedSlide, type CompiledEntry } from "./slide";

interface OverviewProps {
  slides: readonly Slide[];
  getSlide: (index: number) => CompiledEntry;
  layouts: Readonly<Record<string, Layout>>;
  components: DirectiveComponents;
  canvasWidth: number;
  columns: number;
  /** The slide the deck is on. */
  current: number;
  /** The slide picked with the keyboard. It has focus. */
  selected: number;
  onChoose: (slide: number) => void;
  ref?: Ref<HTMLElement>;
}

// Moving the selection only re-renders the buttons, not every slide.
const Thumbnail = memo(RenderedSlide);

/** Every slide of the deck, fully revealed, in a grid. */
export function Overview({
  slides,
  getSlide,
  layouts,
  components,
  canvasWidth,
  columns,
  current,
  selected,
  onChoose,
  ref,
}: OverviewProps) {
  // Thumbnails are the same size, so measuring the first one scales them all.
  const [frameRef, frameSize] = useElementSize();
  const scale = frameSize ? frameSize.width / canvasWidth : null;

  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const buttons = listRef.current?.querySelectorAll<HTMLElement>(
      ":scope > li > button",
    );
    buttons?.[selected]?.focus();
  }, [selected]);

  return (
    <nav
      ref={ref}
      data-deck-overview=""
      aria-label="Slide overview"
      style={{ "--deck-overview-columns": columns } as CSSProperties}
    >
      <ol ref={listRef}>
        {slides.map((slide) => {
          const entry = getSlide(slide.index);
          const isCurrent = slide.index === current;
          const number = slide.index + 1;
          return (
            <li
              key={slide.index}
              data-deck-thumbnail=""
              data-current={isCurrent ? "" : undefined}
            >
              <button
                type="button"
                aria-label={
                  slide.title
                    ? `Slide ${number}: ${slide.title}`
                    : `Slide ${number}`
                }
                aria-current={isCurrent ? "true" : undefined}
                tabIndex={slide.index === selected ? 0 : -1}
                onClick={() => onChoose(slide.index)}
              />
              <div
                ref={slide.index === 0 ? frameRef : undefined}
                data-deck-thumbnail-frame=""
                inert
              >
                <div
                  data-deck-canvas=""
                  data-measured={scale === null ? undefined : ""}
                  style={{ "--deck-scale": scale ?? 1 } as CSSProperties}
                >
                  <Thumbnail
                    slide={slide}
                    entry={entry}
                    step={entry.steps}
                    layouts={layouts}
                    components={components}
                    label={`Slide ${number}`}
                  />
                </div>
              </div>
              <span data-deck-thumbnail-number="" aria-hidden="true">
                {number}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
