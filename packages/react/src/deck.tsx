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
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type Ref,
  type RefObject,
} from "react";
import type { DirectiveComponents } from "./context";
import { useElementSize } from "./element-size";
import { builtinLayouts, type Layout } from "./layouts";
import { LruCache } from "./lru";
import {
  clampPosition,
  getKeyCommand,
  getOverviewKeyCommand,
  getSwipeAction,
  isSwipeStart,
  move,
  overviewColumns,
  type DeckPosition,
  type KeyLike,
  type NavigationAction,
} from "./navigation";
import { Overview } from "./overview";
import { RenderedSlide, type CompiledEntry } from "./slide";

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
  /** Swipe left and right on touch screens to navigate. Default `true`. */
  swipe?: boolean;
  /**
   * Show previous, next, overview and fullscreen buttons, a slide counter and
   * progress. Default `true`.
   */
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
  /** Opens or closes the overview of all slides. */
  toggleOverview(): void;
  /**
   * Enters or leaves fullscreen. Browsers only allow entering in response to
   * a click or key press.
   */
  toggleFullscreen(): void;
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
  swipe = true,
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
  // Digits typed towards a slide number, before Enter.
  const [typed, setTyped] = useState("");
  // The slide picked in the overview, while it is open.
  const [picked, setPicked] = useState<number | null>(null);
  const selected =
    picked === null || slideCount === 0
      ? null
      : Math.min(picked, slideCount - 1);

  const { aspectRatio, canvasWidth, theme, title } = deck.config;
  const canvasHeight = canvasWidth / aspectRatio;
  const [viewportRef, viewportSize] = useElementSize();
  const scale = viewportSize
    ? Math.min(
        viewportSize.width / canvasWidth,
        viewportSize.height / canvasHeight,
      )
    : null;
  const columns = overviewColumns(viewportSize?.width);

  const latest = useRef({
    current,
    slideCount,
    getSteps,
    controlled: position !== undefined,
    onPositionChange,
    typed,
    selected,
    columns,
  });
  useLayoutEffect(() => {
    latest.current = {
      current,
      slideCount,
      getSteps,
      controlled: position !== undefined,
      onPositionChange,
      typed,
      selected,
      columns,
    };
  });

  const go = useCallback((target: DeckPosition | NavigationAction) => {
    const { current, slideCount, getSteps, controlled, onPositionChange } =
      latest.current;
    setTyped("");
    const next =
      typeof target === "string"
        ? move(current, target, slideCount, getSteps)
        : clampPosition(target, slideCount, getSteps);
    if (next.slide === current.slide && next.step === current.step) return;
    if (!controlled) setInternal(next);
    onPositionChange?.(next);
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(rootRef);
  const toggleFullscreen = fullscreen.toggle;

  const overviewRef = useRef<HTMLElement>(null);
  const closeOverview = useCallback(() => {
    // The focused thumbnail is about to go. Focus moves to the deck, so its
    // keys keep working; a deck that can't take focus leaves it to the page.
    if (overviewRef.current?.contains(document.activeElement)) {
      rootRef.current?.focus();
    }
    setPicked(null);
  }, []);
  const toggleOverview = useCallback(() => {
    const { current, selected } = latest.current;
    setTyped("");
    if (selected === null) setPicked(current.slide);
    else closeOverview();
  }, [closeOverview]);
  // Choosing the slide the deck is on keeps its step.
  const chooseSlide = useCallback(
    (slide: number) => {
      closeOverview();
      if (slide !== latest.current.current.slide) go({ slide, step: 0 });
    },
    [closeOverview, go],
  );

  useImperativeHandle(
    ref,
    () => ({
      next: () => go("next"),
      prev: () => go("prev"),
      goTo: (slide, step = 0) => go({ slide, step }),
      focus: () => rootRef.current?.focus(),
      toggleOverview,
      toggleFullscreen,
    }),
    [go, toggleOverview, toggleFullscreen],
  );

  // Focus left on a control would keep the controls over the fullscreen
  // slide (a focused button shows its ring once a key is pressed), so it
  // moves to the deck.
  useEffect(() => {
    const root = rootRef.current;
    const focused = document.activeElement;
    if (!fullscreen.active || !root || !(focused instanceof HTMLElement))
      return;
    if (!root.querySelector("[data-deck-controls]")?.contains(focused)) return;
    if (keyboard === "focus") root.focus();
    else focused.blur();
  }, [fullscreen.active, keyboard]);

  const handleKey = useCallback(
    (event: KeyLike & { preventDefault(): void }) => {
      const { typed, selected, slideCount, columns } = latest.current;
      if (selected !== null) {
        const command = getOverviewKeyCommand(
          event,
          selected,
          slideCount,
          columns,
        );
        if (!command) return;
        event.preventDefault();
        switch (command.type) {
          case "select":
            setPicked(command.slide);
            break;
          case "choose":
            chooseSlide(selected);
            break;
          case "close":
            closeOverview();
            break;
          case "fullscreen":
            toggleFullscreen();
        }
        return;
      }

      const command = getKeyCommand(event, typed);
      if (!command) return;
      event.preventDefault();
      switch (command.type) {
        case "typeSlide":
          setTyped(command.typed);
          break;
        case "goToSlide":
          go({ slide: command.slide, step: 0 });
          break;
        case "navigate":
          go(command.action);
          break;
        case "overview":
          toggleOverview();
          break;
        case "fullscreen":
          setTyped("");
          toggleFullscreen();
      }
    },
    [go, chooseSlide, closeOverview, toggleOverview, toggleFullscreen],
  );

  useEffect(() => {
    if (keyboard !== "global") return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [keyboard, handleKey]);

  // A half-typed number is dropped when focus moves elsewhere on the page.
  // Switching to another window blurs the deck too, but leaves it the active
  // element, so the number survives a glance at the speaker notes.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (document.activeElement === event.target) return;
    if (!event.currentTarget.contains(event.relatedTarget)) setTyped("");
  };

  // The start of a one-finger touch, to tell a swipe from a tap.
  const touchStart = useRef<{ id: number; x: number; y: number }>(null);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isSwipeStart(event)) return;
    touchStart.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    if (start?.id !== event.pointerId) return;
    touchStart.current = null;
    const action = getSwipeAction(
      event.clientX - start.x,
      event.clientY - start.y,
    );
    if (action) go(action);
  };
  // Scrolling, zooming or a second finger takes the gesture over.
  const onPointerCancel = () => {
    touchStart.current = null;
  };

  const allLayouts = useMemo(
    () => (layouts ? { ...builtinLayouts, ...layouts } : builtinLayouts),
    [layouts],
  );

  const slide = deck.slides[current.slide];
  const lastStep = slide ? getSteps(current.slide) : 0;
  const label = `Slide ${current.slide + 1} of ${slideCount}`;
  const overviewOpen = selected !== null;

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
      onKeyDown={keyboard === "focus" ? handleKey : undefined}
      onBlur={onBlur}
    >
      <div
        ref={viewportRef}
        data-deck-viewport=""
        data-swipe={swipe ? "" : undefined}
        inert={overviewOpen}
        onPointerDown={swipe ? onPointerDown : undefined}
        onPointerUp={swipe ? onPointerUp : undefined}
        onPointerCancel={swipe ? onPointerCancel : undefined}
      >
        <div
          data-deck-canvas=""
          data-measured={scale === null ? undefined : ""}
          style={{ "--deck-scale": scale ?? 1 } as CSSProperties}
        >
          {slide ? (
            <RenderedSlide
              slide={slide}
              entry={getSlide(current.slide)}
              step={current.step}
              layouts={allLayouts}
              components={components}
              label={label}
            />
          ) : null}
        </div>
      </div>

      {selected !== null ? (
        <Overview
          ref={overviewRef}
          slides={deck.slides}
          getSlide={getSlide}
          layouts={allLayouts}
          components={components}
          canvasWidth={canvasWidth}
          columns={columns}
          current={current.slide}
          selected={selected}
          onChoose={chooseSlide}
        />
      ) : null}

      {controls && slideCount > 0 ? (
        <div data-deck-controls="" data-typing={typed ? "" : undefined}>
          <button
            type="button"
            aria-label="Previous"
            disabled={
              overviewOpen || (current.slide === 0 && current.step === 0)
            }
            onClick={() => go("prev")}
          >
            <Chevron direction="left" />
          </button>
          <span data-deck-counter="">
            {typed ? (
              <span data-deck-typed="">{typed}</span>
            ) : (
              current.slide + 1
            )}{" "}
            / {slideCount}
          </span>
          <button
            type="button"
            aria-label="Next"
            disabled={
              overviewOpen ||
              (current.slide === slideCount - 1 && current.step >= lastStep)
            }
            onClick={() => go("next")}
          >
            <Chevron direction="right" />
          </button>
          <button
            type="button"
            aria-label="Overview"
            aria-pressed={overviewOpen}
            onClick={toggleOverview}
          >
            <GridIcon />
          </button>
          {fullscreen.supported ? (
            <button
              type="button"
              aria-label="Fullscreen"
              aria-pressed={fullscreen.active}
              onClick={toggleFullscreen}
            >
              <FullscreenIcon exit={fullscreen.active} />
            </button>
          ) : null}
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

const subscribeToFullscreen = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};
const ignoreChanges = () => () => {};

/**
 * Fullscreen state of an element. `supported` is `false` on the server and
 * where the page may not go fullscreen, such as iPhones and iframes without
 * `allow="fullscreen"`.
 */
function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const supported = useSyncExternalStore(
    ignoreChanges,
    () => document.fullscreenEnabled === true,
    () => false,
  );
  const active = useSyncExternalStore(
    subscribeToFullscreen,
    () => ref.current !== null && document.fullscreenElement === ref.current,
    () => false,
  );
  const toggle = useCallback(() => {
    const element = ref.current;
    if (!element || !document.fullscreenEnabled) return;
    // Both reject when the browser refuses, which leaves things as they are.
    if (document.fullscreenElement === element) {
      document.exitFullscreen().catch(() => {});
    } else {
      element.requestFullscreen().catch(() => {});
    }
  }, [ref]);
  return { supported, active, toggle };
}

function FullscreenIcon({ exit }: { exit: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={
          exit
            ? "M6 2.5V6H2.5M10 2.5V6h3.5M6 13.5V10H2.5M10 13.5V10h3.5"
            : "M2.5 6V2.5H6M10 2.5h3.5V6M2.5 10v3.5H6M13.5 10v3.5H10"
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="2.75" y="2.75" width="4" height="4" rx="1" />
      <rect x="9.25" y="2.75" width="4" height="4" rx="1" />
      <rect x="2.75" y="9.25" width="4" height="4" rx="1" />
      <rect x="9.25" y="9.25" width="4" height="4" rx="1" />
    </svg>
  );
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
