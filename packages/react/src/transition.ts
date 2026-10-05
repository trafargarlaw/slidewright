import type { Slide } from "@slidewright/core";
import { useLayoutEffect, useState, type RefObject } from "react";
import type { DeckPosition } from "./navigation";

/** The part of a slide in a transition between two slides. */
export interface SlideTransition {
  /** The `transition` of the later of the two slides. */
  name: string;
  state: "entering" | "leaving";
  /** The deck moves to an earlier slide. */
  backward: boolean;
}

/** The slide that the deck moves away from, at the step it was on. */
export interface LeavingSlide extends DeckPosition {
  name: string;
  backward: boolean;
}

/** The attributes of a slide in a transition, which the stylesheet reads. */
export function transitionAttributes(transition: SlideTransition | undefined) {
  if (!transition) return undefined;
  const leaving = transition.state === "leaving";
  return {
    "data-transition": transition.name,
    "data-transition-state": transition.state,
    "data-transition-direction": transition.backward ? "backward" : "forward",
    inert: leaving,
    "aria-hidden": leaving || undefined,
  };
}

/**
 * The slide to keep in the canvas while the deck moves to another one, or
 * `null` between transitions. It goes when the animations of both slides
 * end, and at once when the stylesheet gives them none.
 *
 * `visible` tells whether the audience sees the slides: a deck that opens on
 * the slide of the URL hash, or whose slides arrive later, shows it without
 * a transition.
 */
export function useSlideTransition(
  canvas: RefObject<HTMLElement | null>,
  slides: readonly Slide[],
  current: DeckPosition,
  visible: boolean,
): LeavingSlide | null {
  const [shown, setShown] = useState({ ...current, visible });
  const [leaving, setLeaving] = useState<LeavingSlide | null>(null);

  // Follows the position while rendering, so the slide that leaves stays
  // mounted: an effect would run after React has taken it out.
  if (
    shown.slide !== current.slide ||
    shown.step !== current.step ||
    shown.visible !== visible
  ) {
    setShown({ slide: current.slide, step: current.step, visible });
    if (shown.slide !== current.slide) {
      const name =
        shown.visible && visible
          ? transitionName(slides[Math.max(shown.slide, current.slide)])
          : undefined;
      setLeaving(
        name === undefined
          ? null
          : {
              slide: shown.slide,
              step: shown.step,
              name,
              backward: current.slide < shown.slide,
            },
      );
    }
  }

  useLayoutEffect(() => {
    if (!leaving) return;
    const done = () => setLeaving((now) => (now === leaving ? null : now));
    const running = [
      ...(canvas.current?.querySelectorAll(":scope > [data-transition]") ?? []),
    ].flatMap(animationsOf);
    if (running.length === 0) {
      done();
      return;
    }
    // An animation that is cancelled, such as by the next move, rejects.
    void Promise.allSettled(
      running.map((animation) => animation.finished),
    ).then(done);
  }, [canvas, leaving]);

  return leaving;
}

/** The transition that a slide asks for, when it asks for one. */
function transitionName(slide: Slide | undefined): string | undefined {
  const name = slide?.frontmatter.transition;
  return typeof name === "string" && name !== "" && name !== "none"
    ? name
    : undefined;
}

/** The animations of an element that end. */
function animationsOf(element: Element): Animation[] {
  // Not every DOM has animations: jsdom doesn't.
  if (typeof element.getAnimations !== "function") return [];
  return element.getAnimations().filter((animation) => {
    const end = animation.effect?.getComputedTiming().endTime;
    return typeof end === "number" && Number.isFinite(end);
  });
}
