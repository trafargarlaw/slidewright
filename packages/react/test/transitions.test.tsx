import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { Deck, type DeckHandle } from "../src";

const text = (strings: TemplateStringsArray) =>
  strings.join("").replace(/^\n/, "");

const slides = () => [...document.querySelectorAll("[data-slide]")];
const headings = () =>
  slides().map((slide) => slide.querySelector("h1")?.textContent);
const states = () =>
  slides().map((slide) => slide.getAttribute("data-transition-state"));
const press = (key: string) =>
  fireEvent.keyDown(document.querySelector("[data-deck]")!, { key });

/**
 * jsdom has no layout and no animations. Gives the deck a size, so it shows
 * its slides, and gives each slide in a transition an animation that ends
 * when the test says so.
 */
function stubAnimations({ endTime = 400 }: { endTime?: number } = {}) {
  const running: (() => void)[] = [];
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value(this: Element) {
      if (!this.hasAttribute("data-transition")) return [];
      const finished = new Promise<void>((resolve) => running.push(resolve));
      return [{ effect: { getComputedTiming: () => ({ endTime }) }, finished }];
    },
  });
  onTestFinished(() => {
    delete (Element.prototype as unknown as Record<string, unknown>)
      .getAnimations;
  });
  return {
    /** Ends the animations that run. */
    finish: () =>
      act(async () => {
        for (const resolve of running.splice(0)) resolve();
        await Promise.resolve();
      }),
  };
}

beforeEach(() => {
  const spy = vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue({ width: 1280, height: 720 } as DOMRect);
  onTestFinished(() => spy.mockRestore());
});

const FADE = text`
# One

<!-- step -->

Revealed

---
transition: fade
---

# Two

---
transition: zoom
---

# Three
`;

describe("transitions", () => {
  it("moves without a transition by default", () => {
    stubAnimations();
    render(<Deck markdown={"# One\n\n---\n\n# Two"} />);
    press("ArrowRight");

    expect(headings()).toEqual(["Two"]);
    expect(slides()[0]!.hasAttribute("data-transition")).toBe(false);
  });

  it("keeps the slide that leaves until the animations end", async () => {
    const animations = stubAnimations();
    render(<Deck markdown={FADE} defaultPosition={{ slide: 0, step: 1 }} />);
    const one = slides()[0]!;
    press("ArrowRight");

    expect(headings()).toEqual(["One", "Two"]);
    const [leaving, entering] = slides();
    // The same elements, so nothing on the slide starts again as it leaves.
    expect(leaving).toBe(one);
    expect(leaving!.getAttribute("data-transition")).toBe("fade");
    expect(leaving!.getAttribute("data-transition-state")).toBe("leaving");
    expect(leaving!.getAttribute("data-transition-direction")).toBe("forward");
    expect(leaving!.hasAttribute("inert")).toBe(true);
    expect(leaving!.getAttribute("aria-hidden")).toBe("true");
    // At the step that it was on.
    expect(leaving!.querySelector("[data-step-state='future']")).toBeNull();
    expect(entering!.getAttribute("data-transition")).toBe("fade");
    expect(entering!.getAttribute("data-transition-state")).toBe("entering");
    expect(entering!.hasAttribute("inert")).toBe(false);
    expect(entering!.hasAttribute("aria-hidden")).toBe(false);

    await animations.finish();
    expect(headings()).toEqual(["Two"]);
    expect(slides()[0]).toBe(entering);
    expect(entering!.hasAttribute("data-transition")).toBe(false);
    expect(entering!.hasAttribute("data-transition-state")).toBe(false);
    expect(entering!.hasAttribute("data-transition-direction")).toBe(false);
  });

  it("plays the transition backward towards an earlier slide", async () => {
    const animations = stubAnimations();
    render(<Deck markdown={FADE} defaultPosition={{ slide: 1, step: 0 }} />);
    press("ArrowLeft");

    // The transition of the later slide, which leaves.
    expect(headings()).toEqual(["Two", "One"]);
    expect(states()).toEqual(["leaving", "entering"]);
    for (const slide of slides()) {
      expect(slide.getAttribute("data-transition")).toBe("fade");
      expect(slide.getAttribute("data-transition-direction")).toBe("backward");
    }

    await animations.finish();
    expect(headings()).toEqual(["One"]);
  });

  it("uses the transition of the later slide for a jump", async () => {
    const animations = stubAnimations();
    const deck = createRef<DeckHandle>();
    render(<Deck ref={deck} markdown={FADE} />);

    act(() => deck.current!.goTo(2));
    expect(headings()).toEqual(["One", "Three"]);
    expect(slides()[0]!.getAttribute("data-transition")).toBe("zoom");
    await animations.finish();

    act(() => deck.current!.goTo(0));
    expect(headings()).toEqual(["Three", "One"]);
    expect(slides()[1]!.getAttribute("data-transition")).toBe("zoom");
    expect(slides()[1]!.getAttribute("data-transition-direction")).toBe(
      "backward",
    );
  });

  it("gives every slide the transition of `defaults`", () => {
    stubAnimations();
    const markdown = text`
---
defaults:
  transition: slide
---

# One

---

# Two

---
transition: none
---

# Three
`;
    render(<Deck markdown={markdown} />);

    press("ArrowRight");
    expect(headings()).toEqual(["One", "Two"]);
    expect(slides()[1]!.getAttribute("data-transition")).toBe("slide");

    // A slide can go without.
    press("ArrowRight");
    expect(headings()).toEqual(["Three"]);
    expect(slides()[0]!.hasAttribute("data-transition")).toBe(false);
  });

  it("drops the first slide when the deck moves again", async () => {
    const animations = stubAnimations();
    render(<Deck markdown={FADE} />);
    press("ArrowRight");
    press("ArrowRight");
    expect(headings()).toEqual(["One", "Two"]);
    press("ArrowRight");

    expect(headings()).toEqual(["Two", "Three"]);
    expect(states()).toEqual(["leaving", "entering"]);
    expect(slides()[0]!.getAttribute("data-transition")).toBe("zoom");

    await animations.finish();
    expect(headings()).toEqual(["Three"]);
    expect(states()).toEqual([null]);
  });

  it("keeps the slide that leaves while the other one takes steps", async () => {
    const animations = stubAnimations();
    render(<Deck markdown={FADE} defaultPosition={{ slide: 1, step: 0 }} />);
    press("ArrowLeft");
    expect(headings()).toEqual(["Two", "One"]);
    // Back on the last step of the first slide: one step back stays on it.
    press("ArrowLeft");
    expect(headings()).toEqual(["Two", "One"]);

    await animations.finish();
    expect(headings()).toEqual(["One"]);
    expect(
      slides()[0]!.querySelector("[data-step-state='future']"),
    ).not.toBeNull();
  });

  it("moves at once when the stylesheet has no animation for the name", () => {
    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      value: () => [],
    });
    onTestFinished(() => {
      delete (Element.prototype as unknown as Record<string, unknown>)
        .getAnimations;
    });
    render(<Deck markdown={FADE} />);
    press("ArrowRight");
    press("ArrowRight");

    expect(headings()).toEqual(["Two"]);
    expect(states()).toEqual([null]);
  });

  it("doesn't wait for an animation that never ends", () => {
    stubAnimations({ endTime: Infinity });
    render(<Deck markdown={FADE} />);
    press("ArrowRight");
    press("ArrowRight");

    expect(headings()).toEqual(["Two"]);
    expect(states()).toEqual([null]);
  });

  it("moves at once in a DOM without animations", () => {
    render(<Deck markdown={FADE} />);
    press("ArrowRight");
    press("ArrowRight");

    expect(headings()).toEqual(["Two"]);
    expect(states()).toEqual([null]);
  });

  it("opens on the slide of the URL hash without a transition", () => {
    stubAnimations();
    window.location.hash = "#2";
    onTestFinished(() => {
      window.history.replaceState(null, "", window.location.pathname);
    });
    render(<Deck markdown={FADE} hash />);

    expect(headings()).toEqual(["Two"]);
    expect(states()).toEqual([null]);
  });

  it("shows slides that arrive later without a transition", async () => {
    stubAnimations();
    const { rerender } = render(
      <Deck markdown="" defaultPosition={{ slide: 1, step: 0 }} />,
    );
    rerender(<Deck markdown={FADE} defaultPosition={{ slide: 1, step: 0 }} />);

    await waitFor(() => expect(headings()).toEqual(["Two"]));
    expect(states()).toEqual([null]);
  });

  it("follows a controlled position", async () => {
    const animations = stubAnimations();
    const { rerender } = render(
      <Deck markdown={FADE} position={{ slide: 0, step: 0 }} />,
    );
    rerender(<Deck markdown={FADE} position={{ slide: 1, step: 0 }} />);

    expect(headings()).toEqual(["One", "Two"]);
    expect(states()).toEqual(["leaving", "entering"]);
    await animations.finish();
    expect(headings()).toEqual(["Two"]);
  });

  it("lets go of a slide that an edit removes", async () => {
    const animations = stubAnimations();
    const { rerender } = render(<Deck markdown={FADE} />);
    press("ArrowRight");
    press("ArrowRight");
    press("ArrowRight");
    expect(headings()).toEqual(["Two", "Three"]);

    // The last slide goes: the deck is back on the second one.
    rerender(
      <Deck
        markdown={FADE.slice(0, FADE.lastIndexOf("---\ntransition: zoom"))}
      />,
    );
    await waitFor(() => expect(headings()).toEqual(["Two"]));
    await animations.finish();
    expect(headings()).toEqual(["Two"]);
    expect(states()).toEqual([null]);
  });

  it("shows a slide that fails to compile through its transition", async () => {
    const animations = stubAnimations();
    const fail = () => () => {
      throw new Error("Broken plugin");
    };
    const options = { remarkPlugins: [fail] };
    render(<Deck markdown={FADE} compileOptions={options} />);
    press("ArrowRight");

    expect(states()).toEqual(["leaving", "entering"]);
    expect(
      slides().every((slide) => slide.hasAttribute("data-slide-error")),
    ).toBe(true);
    await animations.finish();
    expect(slides()).toHaveLength(1);
  });
});
