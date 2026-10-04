import {
  createCompiler,
  parseDeck,
  type ColorScheme,
  type CompileOptions,
  type Deck as ParsedDeck,
} from "@react-slides/core";
import type { Root } from "hast";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from "react";
import type { DirectiveComponents } from "./context";
import { builtinLayouts, type Layout } from "./layouts";
import { LruCache } from "./lru";
import {
  clampPosition,
  getKeyAction,
  move,
  type DeckPosition,
  type NavigationAction,
} from "./navigation";
import { SlideError, SlideErrorBoundary, SlideView } from "./slide";

export interface DeckProps {
  /**
   * The deck source. The deck re-renders as it changes and keeps the current
   * slide and step.
   */
  markdown: string;
  /** Current position, for a controlled deck. Use with `onPositionChange`. */
  position?: DeckPosition;
  /** Starting position for an uncontrolled deck. */
  defaultPosition?: DeckPosition;
  /** Called with the new position whenever the audience navigates. */
  onPositionChange?: (position: DeckPosition) => void;
  /** Extra layouts by name. A layout with a built-in name replaces it. */
  layouts?: Readonly<Record<string, Layout>>;
  /** Components for `:::name` and `::name` directives, by name. */
  components?: DirectiveComponents;
  /**
   * Sanitising and remark/rehype plugins. Keep the object stable between
   * renders: a new object rebuilds the compiler.
   */
  compileOptions?: CompileOptions;
  /** Overrides `colorScheme` from the headmatter. */
  colorScheme?: ColorScheme;
  /**
   * Keyboard navigation. `"focus"` (default) handles keys while the deck has
   * focus, so several decks can share a page. `"global"` handles keys
   * anywhere on the page. `false` turns it off.
   */
  keyboard?: "focus" | "global" | false;
  /** Show previous/next buttons, a slide counter and progress. Default `true`. */
  controls?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<DeckHandle>;
}

/** Imperative controls, available through `ref`. */
export interface DeckHandle {
  next(): void;
  prev(): void;
  /** Goes to a slide (0-based) and step, clamped to the deck. */
  goTo(slide: number, step?: number): void;
  focus(): void;
}

const START: DeckPosition = { slide: 0, step: 0 };
const NO_COMPONENTS: DirectiveComponents = {};

/**
 * Renders a Markdown deck: one slide at a time, scaled to fit, with step
 * reveals and keyboard navigation.
 */
export function Deck({
  markdown,
  position,
  defaultPosition,
  onPositionChange,
  layouts,
  components = NO_COMPONENTS,
  compileOptions,
  colorScheme,
  keyboard = "focus",
  controls = true,
  className,
  style,
  ref,
}: DeckProps) {
  // Parsing and compiling stay off the typing path when the source changes
  // on every keystroke.
  const source = useDeferredValue(markdown);
  const deck = useMemo(() => parseDeck(source), [source]);
  const getSlide = useSlideCompiler(deck, compileOptions);
  const getSteps = useCallback(
    (index: number) => getSlide(index).steps,
    [getSlide],
  );
  const slideCount = deck.slides.length;

  // An uncontrolled deck remembers the requested position and clamps it on
  // render, so deleting and re-adding a slide while editing returns to it.
  const [internal, setInternal] = useState(defaultPosition ?? START);
  const current = clampPosition(position ?? internal, slideCount, getSteps);

  const latest = useRef({
    current,
    slideCount,
    getSteps,
    controlled: position !== undefined,
    onPositionChange,
  });
  useLayoutEffect(() => {
    latest.current = {
      current,
      slideCount,
      getSteps,
      controlled: position !== undefined,
      onPositionChange,
    };
  });

  const go = useCallback((target: DeckPosition | NavigationAction) => {
    const { current, slideCount, getSteps, controlled, onPositionChange } =
      latest.current;
    const next =
      typeof target === "string"
        ? move(current, target, slideCount, getSteps)
        : clampPosition(target, slideCount, getSteps);
    if (next.slide === current.slide && next.step === current.step) return;
    if (!controlled) setInternal(next);
    onPositionChange?.(next);
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(
    ref,
    () => ({
      next: () => go("next"),
      prev: () => go("prev"),
      goTo: (slide, step = 0) => go({ slide, step }),
      focus: () => rootRef.current?.focus(),
    }),
    [go],
  );

  useEffect(() => {
    if (keyboard !== "global") return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      const action = getKeyAction(event);
      if (!action) return;
      event.preventDefault();
      go(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboard, go]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (keyboard !== "focus") return;
    const action = getKeyAction(event);
    if (!action) return;
    event.preventDefault();
    go(action);
  };

  const { aspectRatio, canvasWidth, theme, title } = deck.config;
  const canvasHeight = canvasWidth / aspectRatio;
  const [viewportRef, scale] = useFitScale(canvasWidth, canvasHeight);

  const allLayouts = useMemo(
    () => (layouts ? { ...builtinLayouts, ...layouts } : builtinLayouts),
    [layouts],
  );

  const slide = deck.slides[current.slide];
  const entry = slide ? getSlide(current.slide) : undefined;
  const lastStep = slide ? getSteps(current.slide) : 0;
  const label = `Slide ${current.slide + 1} of ${slideCount}`;

  return (
    <div
      ref={rootRef}
      data-deck=""
      data-theme={theme}
      data-color-scheme={colorScheme ?? deck.config.colorScheme}
      className={className}
      style={
        {
          "--deck-aspect-ratio": aspectRatio,
          "--deck-canvas-width": `${canvasWidth}px`,
          "--deck-canvas-height": `${canvasHeight}px`,
          ...style,
        } as CSSProperties
      }
      role="region"
      aria-roledescription="slide deck"
      aria-label={title ?? "Slides"}
      tabIndex={keyboard === "focus" ? 0 : undefined}
      onKeyDown={onKeyDown}
    >
      <div ref={viewportRef} data-deck-viewport="">
        <div
          data-deck-canvas=""
          data-measured={scale === null ? undefined : ""}
          style={{ "--deck-scale": scale ?? 1 } as CSSProperties}
        >
          {slide && entry ? (
            entry.error === undefined ? (
              <SlideErrorBoundary key={slide.index} resetKey={entry.tree}>
                <SlideView
                  slide={slide}
                  tree={entry.tree}
                  step={current.step}
                  layout={
                    (Object.hasOwn(allLayouts, slide.layout)
                      ? allLayouts[slide.layout]
                      : undefined) ?? builtinLayouts.default!
                  }
                  components={components}
                  label={label}
                />
              </SlideErrorBoundary>
            ) : (
              <SlideError error={entry.error} />
            )
          ) : null}
        </div>
      </div>

      {controls && slideCount > 0 ? (
        <div data-deck-controls="">
          <button
            type="button"
            aria-label="Previous"
            disabled={current.slide === 0 && current.step === 0}
            onClick={() => go("prev")}
          >
            <Chevron direction="left" />
          </button>
          <span data-deck-counter="">
            {current.slide + 1} / {slideCount}
          </span>
          <button
            type="button"
            aria-label="Next"
            disabled={
              current.slide === slideCount - 1 && current.step >= lastStep
            }
            onClick={() => go("next")}
          >
            <Chevron direction="right" />
          </button>
        </div>
      ) : null}
      {controls && slideCount > 0 ? (
        <div
          data-deck-progress=""
          style={
            {
              "--deck-progress": (current.slide + 1) / slideCount,
            } as CSSProperties
          }
        />
      ) : null}

      <div data-deck-status="" aria-live="polite">
        {slideCount > 0 ? label : ""}
      </div>
    </div>
  );
}

interface CompiledEntry {
  tree: Root;
  steps: number;
  error?: unknown;
}

// Enough for every slide of a large deck plus recent edits.
const CACHE_LIMIT = 200;
const EMPTY_TREE: Root = { type: "root", children: [] };

/**
 * Compiles slides on demand and caches them by content, so an edit only
 * recompiles the slide that changed.
 */
function useSlideCompiler(
  deck: ParsedDeck,
  options: CompileOptions | undefined,
): (index: number) => CompiledEntry {
  const compiler = useMemo(
    () => ({
      compile: createCompiler(options),
      cache: new LruCache<string, CompiledEntry>(CACHE_LIMIT),
    }),
    [options],
  );

  return useCallback(
    (index: number) => {
      const slide = deck.slides[index];
      if (!slide) return { tree: EMPTY_TREE, steps: 0 };

      const override = slide.frontmatter.steps;
      const key = `${typeof override === "number" ? override : ""}\u0000${slide.content}`;
      let entry = compiler.cache.get(key);
      if (!entry) {
        try {
          entry = compiler.compile(slide);
        } catch (error) {
          // Thrown by a user plugin; show it on the slide instead.
          entry = { tree: EMPTY_TREE, steps: 0, error };
        }
        compiler.cache.set(key, entry);
      }
      return entry;
    },
    [deck, compiler],
  );
}

/**
 * Scale that fits the canvas inside the viewport element. `null` until the
 * viewport has been measured (on the server, and in the first client render).
 */
function useFitScale(
  width: number,
  height: number,
): [Ref<HTMLDivElement>, number | null] {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const rect = viewport.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      setScale(Math.min(rect.width / width, rect.height / height));
    };
    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [width, height]);

  return [viewportRef, scale];
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={direction === "left" ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
