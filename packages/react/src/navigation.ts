/** Where the audience is in the deck. */
export interface DeckPosition {
  /** 0-based slide index. */
  slide: number;
  /** Step on the slide. `0` is the slide before any reveals. */
  step: number;
}

export type NavigationAction =
  | "next"
  | "prev"
  | "nextSlide"
  | "prevSlide"
  | "first"
  | "last";

/** Number of steps on a slide, by index. */
export type StepCounter = (slide: number) => number;

/** Brings a position inside the deck: an existing slide and step. */
export function clampPosition(
  position: DeckPosition,
  slideCount: number,
  getSteps: StepCounter,
): DeckPosition {
  if (slideCount === 0) return { slide: 0, step: 0 };
  const slide = clamp(Math.trunc(position.slide), 0, slideCount - 1);
  const step = clamp(Math.trunc(position.step), 0, getSteps(slide));
  return { slide, step };
}

/** Applies a navigation action to a clamped position. */
export function move(
  position: DeckPosition,
  action: NavigationAction,
  slideCount: number,
  getSteps: StepCounter,
): DeckPosition {
  const { slide, step } = position;
  const last = slideCount - 1;
  if (last < 0) return position;

  switch (action) {
    case "next":
      if (step < getSteps(slide)) return { slide, step: step + 1 };
      return slide < last ? { slide: slide + 1, step: 0 } : position;
    case "prev":
      if (step > 0) return { slide, step: step - 1 };
      // Going back shows the previous slide as it was left: fully revealed.
      return slide > 0
        ? { slide: slide - 1, step: getSteps(slide - 1) }
        : position;
    case "nextSlide":
      return slide < last ? { slide: slide + 1, step: 0 } : position;
    case "prevSlide":
      return { slide: Math.max(slide - 1, 0), step: 0 };
    case "first":
      return { slide: 0, step: 0 };
    case "last":
      return { slide: last, step: getSteps(last) };
  }
}

const KEY_ACTIONS: Partial<Record<string, NavigationAction>> = {
  ArrowRight: "next",
  PageDown: "next",
  " ": "next",
  ArrowLeft: "prev",
  PageUp: "prev",
  ArrowDown: "nextSlide",
  ArrowUp: "prevSlide",
  Home: "first",
  End: "last",
};

// Enough for any deck; further digits are ignored.
const MAX_SLIDE_DIGITS = 4;

// Elements that need these keys for themselves.
const TEXT_ENTRY =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
const ACTIVATES_ON_SPACE = "button, a[href], summary, [role='button']";

/** The parts of a keyboard event that navigation looks at. */
export interface KeyLike {
  key: string;
  target: EventTarget | null;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  defaultPrevented: boolean;
}

/** What a key press asks the deck to do. */
export type KeyCommand =
  | { type: "navigate"; action: NavigationAction }
  /** Typing a slide number: the digits typed so far. */
  | { type: "typeSlide"; typed: string }
  /** `Enter` after a slide number. 0-based. */
  | { type: "goToSlide"; slide: number }
  | { type: "fullscreen" }
  | { type: "overview" };

/**
 * Maps a key press to a command, given the slide number typed so far.
 * Returns `undefined` for keys the deck should leave alone: browser
 * shortcuts, typing in a form field, or keys already handled by a component
 * on the slide.
 */
export function getKeyCommand(
  event: KeyLike,
  typed = "",
): KeyCommand | undefined {
  if (isForeignKey(event)) return undefined;

  const { key } = event;
  if (/^[0-9]$/.test(key)) {
    return {
      type: "typeSlide",
      typed: (typed + key).slice(0, MAX_SLIDE_DIGITS),
    };
  }
  // Enter, Backspace and Escape keep their usual meaning unless a number is
  // being typed.
  if (typed) {
    if (key === "Enter") return { type: "goToSlide", slide: Number(typed) - 1 };
    if (key === "Backspace")
      return { type: "typeSlide", typed: typed.slice(0, -1) };
    if (key === "Escape") return { type: "typeSlide", typed: "" };
  }
  if (key === "f" || key === "F") return { type: "fullscreen" };
  if (key === "o" || key === "O") return { type: "overview" };

  if (key === " ") {
    if (targetElement(event)?.closest(ACTIVATES_ON_SPACE)) return undefined;
    return { type: "navigate", action: event.shiftKey ? "prev" : "next" };
  }
  const action = KEY_ACTIONS[key];
  return action ? { type: "navigate", action } : undefined;
}

/** What a key press asks the overview to do. */
export type OverviewKeyCommand =
  /** Moves the selection to a slide. 0-based. */
  | { type: "select"; slide: number }
  /** Goes to the selected slide. */
  | { type: "choose" }
  | { type: "close" }
  | { type: "fullscreen" };

/**
 * Maps a key press in the overview to a command. The arrow keys move the
 * selection through a grid of `count` slides, `columns` to a row.
 */
export function getOverviewKeyCommand(
  event: KeyLike,
  selected: number,
  count: number,
  columns: number,
): OverviewKeyCommand | undefined {
  if (isForeignKey(event)) return undefined;

  const last = count - 1;
  const select = (slide: number): OverviewKeyCommand => ({
    type: "select",
    slide: clamp(slide, 0, last),
  });
  switch (event.key) {
    case "Escape":
    case "o":
    case "O":
      return { type: "close" };
    case "f":
    case "F":
      return { type: "fullscreen" };
    case "Enter":
    case " ":
      // A focused button, such as a thumbnail, activates itself.
      if (targetElement(event)?.closest(ACTIVATES_ON_SPACE)) return undefined;
      return { type: "choose" };
    case "ArrowLeft":
      return select(selected - 1);
    case "ArrowRight":
      return select(selected + 1);
    case "ArrowUp":
      return select(selected >= columns ? selected - columns : selected);
    case "ArrowDown": {
      // From a full row onto a shorter last row, land on its last slide.
      const lastRow = Math.floor(last / columns);
      const below = Math.floor(selected / columns) < lastRow;
      return select(below ? selected + columns : selected);
    }
    case "Home":
      return select(0);
    case "End":
      return select(last);
  }
  return undefined;
}

/** Thumbnails get at least this much width, in CSS pixels. */
const THUMBNAIL_WIDTH = 240;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 6;
const DEFAULT_COLUMNS = 4;

/**
 * Thumbnails per row in an overview of the given width, or a default while
 * the width is unknown.
 */
export function overviewColumns(width: number | undefined): number {
  if (!width) return DEFAULT_COLUMNS;
  return clamp(Math.floor(width / THUMBNAIL_WIDTH), MIN_COLUMNS, MAX_COLUMNS);
}

/**
 * Keys the deck should leave alone: browser shortcuts, typing in a form
 * field, and keys already handled by a component on the slide.
 */
function isForeignKey(event: KeyLike): boolean {
  if (event.defaultPrevented) return true;
  if (event.altKey || event.ctrlKey || event.metaKey) return true;
  return Boolean(targetElement(event)?.closest(TEXT_ENTRY));
}

function targetElement(event: { target: EventTarget | null }): Element | null {
  return event.target instanceof Element ? event.target : null;
}

/** The parts of a pointer event that swiping looks at. */
export interface PointerLike {
  pointerType: string;
  isPrimary: boolean;
  target: EventTarget | null;
  defaultPrevented: boolean;
}

/**
 * Whether a pointer press may start a swipe: one finger, not in a form field
 * (a range slider drags sideways) or on a component that handled it.
 */
export function isSwipeStart(event: PointerLike): boolean {
  if (event.pointerType !== "touch" || !event.isPrimary) return false;
  if (event.defaultPrevented) return false;
  return !targetElement(event)?.closest(TEXT_ENTRY);
}

/** Minimum horizontal travel for a swipe, in CSS pixels. */
const SWIPE_DISTANCE = 50;

/**
 * Maps a touch gesture, by how far it travelled, to an action: swipe left
 * for the next step, right for the previous one. Mostly vertical gestures
 * scroll the page instead.
 */
export function getSwipeAction(
  dx: number,
  dy: number,
): NavigationAction | undefined {
  if (Math.abs(dx) < SWIPE_DISTANCE) return undefined;
  if (Math.abs(dx) < Math.abs(dy) * 2) return undefined;
  return dx < 0 ? "next" : "prev";
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}
