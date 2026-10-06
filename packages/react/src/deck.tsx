import type { ColorScheme, CompileOptions } from "@slidewright/core";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { DirectiveComponents } from "./context";
import {
  canvasProperties,
  useCompiledDeck,
  useDeckPosition,
  useLayouts,
} from "./deck-state";
import type { MermaidLoader } from "./diagram";
import { useElementSize } from "./element-size";
import type { IconSet } from "./icon-sets";
import { Chevron, FullscreenIcon, GridIcon, PresenterIcon } from "./icons";
import type { Layout } from "./layouts";
import {
  getKeyCommand,
  getOverviewKeyCommand,
  getSwipeAction,
  isSwipeStart,
  overviewColumns,
  type DeckPosition,
  type KeyLike,
  type NavigationAction,
} from "./navigation";
import { Overview } from "./overview";
import { usePreload } from "./preload";
import { Presenter } from "./presenter";
import { usePresenterWindow } from "./presenter-window";
import { Resources } from "./resources";
import { RenderedSlide } from "./slide";
import { useSlideTransition } from "./transition";
import { useHashSync } from "./url-hash";

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
  /**
   * Keep the position in the URL hash (`#3`, `#3.2`), so reloads and links
   * open on that slide. For one deck per page. Default `false`.
   */
  hash?: boolean;
  /** Extra layouts by name. A layout with a built-in name replaces it. */
  layouts?: Readonly<Record<string, Layout>>;
  /** Components for `:::name` and `::name` directives, by name. */
  components?: DirectiveComponents;
  /**
   * Loads Mermaid, to draw `mermaid` code blocks as diagrams:
   * `() => import("mermaid")`. Without it, they show as code.
   */
  mermaid?: MermaidLoader;
  /**
   * Icon sets for `:set:name:` icons, in the Iconify format: the
   * `icons.json` of `@iconify-json/*` packages. Without its set, an icon
   * shows as its source text.
   */
  icons?: readonly IconSet[];
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
   * Let the speaker open the presenter view in a second window, with `P` or
   * a button. The two windows move together. Default `true`.
   */
  presenter?: boolean;
  /**
   * Show previous, next, overview, presenter and fullscreen buttons, a slide
   * counter and progress. Default `true`.
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
  /**
   * Opens or closes the presenter view in a second window. Browsers only
   * allow opening in response to a click or key press.
   */
  togglePresenter(): void;
}

const NO_COMPONENTS: DirectiveComponents = {};
const NO_ICONS: readonly IconSet[] = [];
// The presenter fills its window, whatever size the deck's class gives it.
const PRESENTER_WINDOW_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "none",
  height: "100dvh",
  maxHeight: "none",
  margin: 0,
};

/**
 * The style of the presenter in its window: the custom properties in the
 * deck's `style`, such as theme colours, and not the deck's size.
 */
function presenterWindowStyle(style: CSSProperties = {}): CSSProperties {
  const custom = Object.entries(style).filter(([name]) =>
    name.startsWith("--"),
  );
  return { ...Object.fromEntries(custom), ...PRESENTER_WINDOW_STYLE };
}

/**
 * Renders a Markdown deck: one slide at a time, scaled to fit, with step
 * reveals and keyboard navigation.
 */
export function Deck({
  markdown,
  position,
  defaultPosition,
  onPositionChange,
  hash = false,
  layouts,
  components = NO_COMPONENTS,
  mermaid,
  icons = NO_ICONS,
  compileOptions,
  colorScheme,
  keyboard = "focus",
  swipe = true,
  presenter = true,
  controls = true,
  className,
  style,
  ref,
}: DeckProps) {
  const { deck, getSlide, getSteps } = useCompiledDeck(
    markdown,
    compileOptions,
  );
  const slideCount = deck.slides.length;
  const { current, go: moveTo } = useDeckPosition(
    { position, defaultPosition, onPositionChange },
    slideCount,
    getSteps,
  );
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

  const canvasRef = useRef<HTMLDivElement>(null);
  const leaving = useSlideTransition(
    canvasRef,
    deck.slides,
    current,
    scale !== null && slideCount > 0,
  );
  const allLayouts = useLayouts(layouts);
  usePreload(
    canvasRef,
    deck.slides,
    getSlide,
    allLayouts,
    current.slide,
    mermaid,
  );

  const latest = useRef({ current, slideCount, typed, selected, columns });
  useLayoutEffect(() => {
    latest.current = { current, slideCount, typed, selected, columns };
  });

  const go = useCallback(
    (target: DeckPosition | NavigationAction) => {
      setTyped("");
      moveTo(target);
    },
    [moveTo],
  );
  useHashSync(hash, current, go);

  const rootRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(rootRef);
  const toggleFullscreen = fullscreen.toggle;
  const presenterWindow = usePresenterWindow(
    rootRef,
    `${title ?? "Slides"} – Presenter view`,
  );
  const togglePresenter = presenterWindow.toggle;

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
      togglePresenter,
    }),
    [go, toggleOverview, toggleFullscreen, togglePresenter],
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
      if (!command || (command.type === "presenter" && !presenter)) return;
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
          break;
        case "presenter":
          setTyped("");
          togglePresenter();
      }
    },
    [
      go,
      chooseSlide,
      closeOverview,
      toggleOverview,
      toggleFullscreen,
      togglePresenter,
      presenter,
    ],
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

  const slide = deck.slides[current.slide];
  // Gone when an edit removes it during its transition.
  const leavingSlide = leaving ? deck.slides[leaving.slide] : undefined;
  const lastStep = slide ? getSteps(current.slide) : 0;
  const label = `Slide ${current.slide + 1} of ${slideCount}`;
  // Read out after each move. The title tells a screen reader user where
  // they are without reading the slide.
  const status = slide?.title ? `${label}: ${slide.title}` : label;
  const overviewOpen = selected !== null;

  return (
    <Resources mermaid={mermaid} icons={icons}>
      <div
        ref={rootRef}
        data-deck=""
        data-theme={theme}
        data-color-scheme={colorScheme ?? deck.config.colorScheme}
        className={className}
        style={{ ...canvasProperties(deck.config), ...style }}
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
            ref={canvasRef}
            data-deck-canvas=""
            data-measured={scale === null ? undefined : ""}
            style={{ "--deck-scale": scale ?? 1 } as CSSProperties}
          >
            {/* Keyed by slide, so the slide that leaves keeps its elements
                and the state of its components until it is gone. */}
            {leaving && leavingSlide ? (
              <RenderedSlide
                key={leaving.slide}
                slide={leavingSlide}
                entry={getSlide(leaving.slide)}
                step={leaving.step}
                layouts={allLayouts}
                components={components}
                label={`Slide ${leaving.slide + 1} of ${slideCount}`}
                transition={{
                  name: leaving.name,
                  state: "leaving",
                  backward: leaving.backward,
                }}
              />
            ) : null}
            {slide ? (
              <RenderedSlide
                key={current.slide}
                slide={slide}
                entry={getSlide(current.slide)}
                step={current.step}
                layouts={allLayouts}
                components={components}
                label={label}
                transition={
                  leaving
                    ? {
                        name: leaving.name,
                        state: "entering",
                        backward: leaving.backward,
                      }
                    : undefined
                }
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
            {presenter ? (
              <button
                type="button"
                aria-label="Presenter view"
                aria-pressed={presenterWindow.popup !== null}
                onClick={togglePresenter}
              >
                <PresenterIcon />
              </button>
            ) : null}
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
          {slideCount > 0 ? status : ""}
        </div>
      </div>
      {/* Outside the deck, so its events don't bubble through the deck's.
          With the deck's class, so it has the deck's theme. */}
      {presenterWindow.popup
        ? createPortal(
            <Presenter
              markdown={markdown}
              position={current}
              onPositionChange={go}
              layouts={layouts}
              components={components}
              mermaid={mermaid}
              icons={icons}
              compileOptions={compileOptions}
              colorScheme={colorScheme}
              keyboard="global"
              className={className}
              style={presenterWindowStyle(style)}
            />,
            presenterWindow.popup.document.body,
          )
        : null}
    </Resources>
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
