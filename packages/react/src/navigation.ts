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

// Elements that need these keys for themselves.
const TEXT_ENTRY =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
const ACTIVATES_ON_SPACE = "button, a[href], summary, [role='button']";

interface KeyLike {
  key: string;
  target: EventTarget | null;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  defaultPrevented: boolean;
}

/**
 * Maps a key press to a navigation action. Returns `undefined` for keys the
 * deck should leave alone: browser shortcuts, typing in a form field, or keys
 * already handled by a component on the slide.
 */
export function getKeyAction(event: KeyLike): NavigationAction | undefined {
  if (event.defaultPrevented) return undefined;
  if (event.altKey || event.ctrlKey || event.metaKey) return undefined;

  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(TEXT_ENTRY)) return undefined;

  if (event.key === " ") {
    if (target?.closest(ACTIVATES_ON_SPACE)) return undefined;
    return event.shiftKey ? "prev" : "next";
  }
  return KEY_ACTIONS[event.key];
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}
