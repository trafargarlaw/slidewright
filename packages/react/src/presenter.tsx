import { splitNotes } from "@react-slides/core";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from "react";
import { SlideContext, type DirectiveComponents } from "./context";
import type { DeckProps } from "./deck";
import {
  canvasProperties,
  useCompiledDeck,
  useDeckPosition,
  useLayouts,
  type CompiledDeck,
} from "./deck-state";
import { useElementSize } from "./element-size";
import { Chevron, PauseIcon, PlayIcon, ResetIcon } from "./icons";
import {
  getKeyCommand,
  move,
  type DeckPosition,
  type KeyLike,
  type NavigationAction,
} from "./navigation";
import { renderSlide } from "./render";
import { RenderedSlide, SlideErrorBoundary } from "./slide";
import { useHashSync } from "./url-hash";

export type PresenterProps = Pick<
  DeckProps,
  | "markdown"
  | "position"
  | "defaultPosition"
  | "onPositionChange"
  | "hash"
  | "layouts"
  | "components"
  | "compileOptions"
  | "colorScheme"
  | "keyboard"
  | "className"
  | "style"
>;

const NO_COMPONENTS: DirectiveComponents = {};

/**
 * The speaker's view of a deck: the current slide, what comes next, the
 * notes for the current step and a timer. Give it the same position as the
 * audience's `Deck` to keep the two together.
 */
export function Presenter({
  markdown,
  position,
  defaultPosition,
  onPositionChange,
  hash = false,
  layouts,
  components = NO_COMPONENTS,
  compileOptions,
  colorScheme,
  keyboard = "focus",
  className,
  style,
}: PresenterProps) {
  const { deck, getSlide, getSteps, compile } = useCompiledDeck(
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
  const go = useCallback(
    (target: DeckPosition | NavigationAction) => {
      setTyped("");
      moveTo(target);
    },
    [moveTo],
  );
  useHashSync(hash, current, go);
  const allLayouts = useLayouts(layouts);

  const { aspectRatio, canvasWidth, theme, title } = deck.config;
  const canvasHeight = canvasWidth / aspectRatio;
  const [viewportRef, viewportSize] = useElementSize();
  const scale = viewportSize
    ? Math.min(
        viewportSize.width / canvasWidth,
        viewportSize.height / canvasHeight,
      )
    : null;
  const [previewRef, previewSize] = useElementSize();
  const previewScale = previewSize ? previewSize.width / canvasWidth : null;

  // The overview and fullscreen keys are left to the audience's deck.
  const handleKey = useCallback(
    (event: KeyLike & { preventDefault(): void }) => {
      const command = getKeyCommand(event, typed);
      switch (command?.type) {
        case "typeSlide":
          setTyped(command.typed);
          break;
        case "goToSlide":
          go({ slide: command.slide, step: 0 });
          break;
        case "navigate":
          go(command.action);
          break;
        default:
          return;
      }
      event.preventDefault();
    },
    [typed, go],
  );

  // Listens on the window the presenter is shown in, which may be a popup.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (keyboard !== "global") return;
    const view = rootRef.current?.ownerDocument.defaultView ?? window;
    view.addEventListener("keydown", handleKey);
    return () => view.removeEventListener("keydown", handleKey);
  }, [keyboard, handleKey]);

  // A half-typed number is dropped when focus moves elsewhere on the page.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.ownerDocument.activeElement === event.target)
      return;
    if (!event.currentTarget.contains(event.relatedTarget)) setTyped("");
  };

  const slide = deck.slides[current.slide];
  const lastStep = slide ? getSteps(current.slide) : 0;
  const next = move(current, "next", slideCount, getSteps);
  const atEnd = next.slide === current.slide && next.step === current.step;
  const nextSlide = atEnd ? undefined : deck.slides[next.slide];
  const notes = useMemo(() => splitNotes(slide?.notes ?? ""), [slide?.notes]);

  return (
    <div
      ref={rootRef}
      data-deck=""
      data-presenter=""
      data-theme={theme}
      data-color-scheme={colorScheme ?? deck.config.colorScheme}
      className={className}
      style={{ ...canvasProperties(deck.config), ...style }}
      role="region"
      aria-roledescription="presenter view"
      aria-label={title ?? "Slides"}
      tabIndex={keyboard === "focus" ? 0 : undefined}
      onKeyDown={keyboard === "focus" ? handleKey : undefined}
      onBlur={onBlur}
    >
      <figure data-presenter-current="">
        <figcaption>Current slide</figcaption>
        <div data-presenter-stage="">
          <div ref={viewportRef} data-deck-viewport="">
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
                  label={`Slide ${current.slide + 1} of ${slideCount}`}
                />
              ) : null}
            </div>
          </div>
        </div>
      </figure>

      <div data-presenter-side="">
        <figure data-presenter-next="">
          <figcaption>
            {atEnd
              ? "Next"
              : next.slide === current.slide
                ? "Next step"
                : "Next slide"}
          </figcaption>
          <div ref={previewRef} data-presenter-preview="">
            {nextSlide ? (
              <div
                data-deck-canvas=""
                data-measured={previewScale === null ? undefined : ""}
                style={{ "--deck-scale": previewScale ?? 1 } as CSSProperties}
                inert
              >
                <RenderedSlide
                  slide={nextSlide}
                  entry={getSlide(next.slide)}
                  step={next.step}
                  layouts={allLayouts}
                  components={components}
                  label={`Slide ${next.slide + 1} of ${slideCount}`}
                />
              </div>
            ) : (
              <p data-presenter-end="">End of the deck</p>
            )}
          </div>
        </figure>

        {/* A new slide starts its notes at the top. */}
        <Notes
          key={current.slide}
          notes={notes}
          current={Math.min(current.step, notes.length - 1)}
          compile={compile}
          components={components}
        />
      </div>

      <div data-presenter-bar="">
        {slideCount > 0 ? (
          <div data-presenter-nav="">
            <button
              type="button"
              aria-label="Previous"
              disabled={current.slide === 0 && current.step === 0}
              onClick={() => go("prev")}
            >
              <Chevron direction="left" />
            </button>
            <span data-presenter-counter="">
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
                current.slide === slideCount - 1 && current.step >= lastStep
              }
              onClick={() => go("next")}
            >
              <Chevron direction="right" />
            </button>
          </div>
        ) : null}
        <Timer />
      </div>
    </div>
  );
}

interface NotesProps {
  /** The slide's notes, split at its `[step]` lines. */
  notes: readonly string[];
  /** The part for the current step. */
  current: number;
  compile: CompiledDeck["compile"];
  components: DirectiveComponents;
}

// Space kept above and below the current part when scrolling to it.
const NOTES_MARGIN = 12;

/**
 * Speaker notes, rendered as Markdown. Notes with `[step]` lines are split
 * into parts: the part for the current step is marked, earlier ones are
 * dimmed.
 */
function Notes({ notes, current, compile, components }: NotesProps) {
  const ref = useRef<HTMLElement>(null);

  // Brings the current part into view as the talk moves through the notes.
  useLayoutEffect(() => {
    const box = ref.current;
    const part = box?.querySelector<HTMLElement>("[aria-current]");
    if (!box || !part) return;
    const top = part.offsetTop - NOTES_MARGIN;
    const bottom = part.offsetTop + part.offsetHeight + NOTES_MARGIN;
    if (top < box.scrollTop) {
      box.scrollTop = top;
    } else if (bottom > box.scrollTop + box.clientHeight) {
      box.scrollTop = Math.min(top, bottom - box.clientHeight);
    }
  }, [notes, current]);

  const split = notes.length > 1;
  return (
    <section ref={ref} data-presenter-notes="" aria-label="Notes">
      {notes.some(Boolean) ? (
        notes.map((part, index) =>
          part ? (
            <div
              key={index}
              data-presenter-note=""
              data-note-state={split ? noteState(index, current) : undefined}
              aria-current={split && index === current ? "step" : undefined}
            >
              <Note markdown={part} compile={compile} components={components} />
            </div>
          ) : null,
        )
      ) : (
        <p data-presenter-no-notes="">No notes for this slide.</p>
      )}
    </section>
  );
}

function noteState(index: number, current: number) {
  if (index < current) return "past";
  return index === current ? "current" : "future";
}

interface NoteProps {
  markdown: string;
  compile: CompiledDeck["compile"];
  components: DirectiveComponents;
}

/** One part of the notes, fully revealed. Falls back to its source text. */
function NoteContent({ markdown, compile, components }: NoteProps) {
  const entry = compile(markdown);
  const content = useMemo(
    () => renderSlide(entry.tree, entry.steps, []).children,
    [entry],
  );
  const context = useMemo(
    () => ({ step: entry.steps, components }),
    [entry.steps, components],
  );

  const source = <p data-presenter-note-source="">{markdown}</p>;
  if (entry.error !== undefined) return source;
  return (
    <SlideErrorBoundary resetKey={entry.tree} fallback={source}>
      <SlideContext value={context}>{content}</SlideContext>
    </SlideErrorBoundary>
  );
}

// Moving through the steps only re-renders the parts' wrappers.
const Note = memo(NoteContent);

interface TimerState {
  /** When the timer last started, or `null` while it is paused. */
  started: number | null;
  /** Time counted before `started`. */
  banked: number;
  now: number;
}

/** Time since the presenter opened, with pause and reset. */
function Timer() {
  const ref = useRef<HTMLDivElement>(null);
  const [timer, setTimer] = useState<TimerState>(() => {
    const now = Date.now();
    return { started: now, banked: 0, now };
  });
  const running = timer.started !== null;

  // Wakes up when the shown second changes. The window the timer is in
  // keeps time: in a presenter window, the audience's window may be hidden
  // behind it, and browsers slow down the timers of hidden pages.
  useEffect(() => {
    if (timer.started === null) return;
    const view = ref.current?.ownerDocument.defaultView ?? window;
    const id = view.setTimeout(
      () => setTimer((timer) => ({ ...timer, now: Date.now() })),
      1000 - (elapsedTime(timer) % 1000),
    );
    return () => view.clearTimeout(id);
  }, [timer]);

  const toggle = () =>
    setTimer((timer) => {
      const now = Date.now();
      return timer.started === null
        ? { started: now, banked: timer.banked, now }
        : { started: null, banked: elapsedTime({ ...timer, now }), now };
    });
  const reset = () =>
    setTimer((timer) => {
      const now = Date.now();
      return { started: timer.started === null ? null : now, banked: 0, now };
    });

  return (
    <div
      ref={ref}
      data-presenter-timer=""
      data-paused={running ? undefined : ""}
    >
      <span role="timer" aria-label="Elapsed time">
        {formatElapsed(elapsedTime(timer))}
      </span>
      <button
        type="button"
        aria-label={running ? "Pause timer" : "Resume timer"}
        onClick={toggle}
      >
        {running ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button type="button" aria-label="Reset timer" onClick={reset}>
        <ResetIcon />
      </button>
    </div>
  );
}

function elapsedTime({ started, banked, now }: TimerState): number {
  // The system clock can be set back while the timer runs.
  return banked + (started === null ? 0 : Math.max(0, now - started));
}

/** `mm:ss`, or `h:mm:ss` from an hour on. */
function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const mm = String(Math.floor(seconds / 60) % 60).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
