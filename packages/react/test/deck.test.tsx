import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { Deck, type DeckHandle, type LayoutProps } from "../src";

const text = (strings: TemplateStringsArray) =>
  strings.join("").replace(/^\n/, "");

const slide = () => document.querySelector("[data-slide]")!;
const heading = () => slide().querySelector("h1, h2")?.textContent;
const deckRoot = () => document.querySelector<HTMLElement>("[data-deck]")!;
const press = (key: string, target: Element = deckRoot()) =>
  fireEvent.keyDown(target, { key });
const counter = () =>
  document.querySelector("[data-deck-counter]")?.textContent;

const viewport = () => document.querySelector("[data-deck-viewport]")!;
const swipe = (dx: number, dy = 0, pointerType = "touch") => {
  const at = { pointerId: 1, pointerType, isPrimary: true };
  fireEvent.pointerDown(viewport(), { ...at, clientX: 200, clientY: 100 });
  fireEvent.pointerUp(viewport(), {
    ...at,
    clientX: 200 + dx,
    clientY: 100 + dy,
  });
};

/** jsdom has no Fullscreen API: a stand-in that records calls. */
function stubFullscreen() {
  let element: Element | null = null;
  const change = (next: Element | null) => {
    element = next;
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  };
  const request = vi.fn(function (this: Element) {
    return change(this);
  });
  const exit = vi.fn(() => change(null));

  Object.defineProperties(document, {
    fullscreenEnabled: { configurable: true, get: () => true },
    fullscreenElement: { configurable: true, get: () => element },
    exitFullscreen: { configurable: true, value: exit },
  });
  Object.defineProperty(Element.prototype, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  onTestFinished(() => {
    const doc = document as unknown as Record<string, unknown>;
    delete doc.fullscreenEnabled;
    delete doc.fullscreenElement;
    delete doc.exitFullscreen;
    delete (Element.prototype as unknown as Record<string, unknown>)
      .requestFullscreen;
  });
  return { request, exit };
}

const THREE_SLIDES = text`
# One

---

# Two

<!-- step -->

Revealed

---

# Three
`;

describe("rendering", () => {
  it("renders the current slide with its layout and deck settings", () => {
    render(
      <Deck
        markdown={text`
---
title: Quarterly review
colorScheme: dark
aspectRatio: 4/3
---

# Hello

---
layout: center
class: [roomy, bold]
---

# Centered
`}
      />,
    );

    const root = screen.getByRole("region", { name: "Quarterly review" });
    expect(root.dataset.colorScheme).toBe("dark");
    expect(root.style.getPropertyValue("--deck-canvas-height")).toBe("735px");
    expect(slide().getAttribute("data-layout")).toBe("default");
    expect(heading()).toBe("Hello");

    press("ArrowRight");
    expect(slide().getAttribute("data-layout")).toBe("center");
    expect(slide().className).toBe("roomy bold");
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });

  it("renders nothing to navigate for an empty deck", () => {
    render(<Deck markdown="" />);
    expect(document.querySelector("[data-slide]")).toBeNull();
    expect(document.querySelector("[data-deck-controls]")).toBeNull();
  });
});

describe("reacting to Markdown changes", () => {
  it("keeps the slide and step while the slide is edited", () => {
    const { rerender } = render(<Deck markdown={THREE_SLIDES} />);
    press("ArrowRight");
    press("ArrowRight");
    expect(screen.getByText("Revealed").dataset.stepState).toBe("current");

    rerender(
      <Deck markdown={THREE_SLIDES.replace("# Two", "# Two, edited")} />,
    );
    expect(heading()).toBe("Two, edited");
    expect(screen.getByText("Revealed").dataset.stepState).toBe("current");
  });

  it("clamps while slides are missing and returns when they come back", () => {
    const { rerender } = render(<Deck markdown={THREE_SLIDES} />);
    press("End");
    expect(heading()).toBe("Three");

    const [withoutLast] = THREE_SLIDES.split("\n---\n\n# Three");
    rerender(<Deck markdown={withoutLast!} />);
    expect(heading()).toBe("Two");

    rerender(<Deck markdown={THREE_SLIDES} />);
    expect(heading()).toBe("Three");
  });
});

describe("steps", () => {
  it("reveals content one step at a time", () => {
    render(
      <Deck
        markdown={text`
# List

- Always

<!-- step -->

- Second

<!-- step -->

- Third
`}
      />,
    );
    const state = (item: string) =>
      screen
        .getByText(item)
        .closest("[data-step]")
        ?.getAttribute("data-step-state");

    expect(state("Second")).toBe("future");
    expect(state("Third")).toBe("future");
    press("ArrowRight");
    expect(state("Second")).toBe("current");
    press("ArrowRight");
    expect(state("Second")).toBe("past");
    expect(state("Third")).toBe("current");
  });

  it("goes back to the previous slide fully revealed", () => {
    render(
      <Deck markdown={THREE_SLIDES} defaultPosition={{ slide: 2, step: 0 }} />,
    );
    press("ArrowLeft");
    expect(heading()).toBe("Two");
    expect(screen.getByText("Revealed").dataset.stepState).toBe("current");
  });
});

describe("keyboard", () => {
  it("only handles keys while focused by default", () => {
    render(<Deck markdown={THREE_SLIDES} />);
    press("ArrowDown", document.body);
    expect(heading()).toBe("One");
    press("ArrowDown");
    expect(heading()).toBe("Two");
  });

  it("handles keys anywhere on the page in global mode", () => {
    render(<Deck markdown={THREE_SLIDES} keyboard="global" />);
    press("ArrowDown", document.body);
    expect(heading()).toBe("Two");
  });

  it("leaves keys alone inside form fields on a slide", () => {
    render(
      <Deck
        markdown="::name-field"
        components={{ "name-field": () => <input aria-label="Name" /> }}
      />,
    );
    const input = screen.getByLabelText("Name");
    const event = press("ArrowRight", input);
    expect(event).toBe(true); // not prevented
  });
});

describe("going to a slide by number", () => {
  it("goes to the typed slide on Enter", () => {
    render(<Deck markdown={THREE_SLIDES} />);
    press("3");
    expect(counter()).toBe("3 / 3");
    expect(heading()).toBe("One");

    press("Enter");
    expect(heading()).toBe("Three");
    expect(counter()).toBe("3 / 3");
  });

  it("corrects and cancels the number", () => {
    render(<Deck markdown={THREE_SLIDES} />);
    press("1");
    press("2");
    press("Backspace");
    press("Enter");
    expect(heading()).toBe("One");

    press("2");
    press("Escape");
    expect(counter()).toBe("1 / 3");
    expect(press("Enter")).toBe(true); // not prevented
    expect(heading()).toBe("One");
  });

  it("forgets the number on other navigation", () => {
    render(<Deck markdown={THREE_SLIDES} />);
    press("3");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(counter()).toBe("2 / 3");
    press("Enter");
    expect(heading()).toBe("Two");
  });

  it("forgets the number when focus moves elsewhere on the page", () => {
    render(
      <>
        <Deck markdown={THREE_SLIDES} />
        <button type="button">Elsewhere</button>
      </>,
    );
    act(() => deckRoot().focus());
    press("3");

    fireEvent.blur(deckRoot()); // another window: the deck keeps focus
    expect(counter()).toBe("3 / 3");

    act(() => screen.getByRole("button", { name: "Elsewhere" }).focus());
    expect(counter()).toBe("1 / 3");
  });
});

describe("touch", () => {
  it("swipes between steps and slides", () => {
    render(<Deck markdown={THREE_SLIDES} />);
    swipe(-100);
    expect(heading()).toBe("Two");
    swipe(-100);
    expect(screen.getByText("Revealed").dataset.stepState).toBe("current");
    swipe(100);
    swipe(100);
    expect(heading()).toBe("One");
  });

  it("ignores taps, scrolling, mouse drags and cancelled touches", () => {
    render(<Deck markdown={THREE_SLIDES} />);
    swipe(-10);
    swipe(-100, 120);
    swipe(-100, 0, "mouse");

    const at = { pointerId: 1, pointerType: "touch", isPrimary: true };
    fireEvent.pointerDown(viewport(), { ...at, clientX: 200 });
    fireEvent.pointerCancel(viewport(), at);
    fireEvent.pointerUp(viewport(), { ...at, clientX: 50 });

    expect(heading()).toBe("One");
  });

  it("leaves sliders on a slide alone", () => {
    render(
      <Deck
        markdown={"# One\n\n::volume\n\n---\n\n# Two"}
        components={{
          volume: () => <input type="range" aria-label="Volume" />,
        }}
      />,
    );
    const at = { pointerId: 1, pointerType: "touch", isPrimary: true };
    const slider = screen.getByLabelText("Volume");
    fireEvent.pointerDown(slider, { ...at, clientX: 200 });
    fireEvent.pointerUp(slider, { ...at, clientX: 50 });
    expect(heading()).toBe("One");
  });

  it("can be turned off", () => {
    render(<Deck markdown={THREE_SLIDES} swipe={false} />);
    swipe(-100);
    expect(heading()).toBe("One");
    expect(viewport().hasAttribute("data-swipe")).toBe(false);
  });
});

describe("fullscreen", () => {
  it("has no button where the browser can't go fullscreen", () => {
    render(<Deck markdown={THREE_SLIDES} />);
    expect(screen.queryByRole("button", { name: "Fullscreen" })).toBeNull();
  });

  it("toggles with the button and the F key", () => {
    const { request, exit } = stubFullscreen();
    render(<Deck markdown={THREE_SLIDES} />);
    const button = screen.getByRole("button", { name: "Fullscreen" });
    expect(button.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(button);
    expect(request.mock.contexts).toEqual([deckRoot()]);
    expect(button.getAttribute("aria-pressed")).toBe("true");

    press("f");
    expect(exit).toHaveBeenCalledOnce();
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("moves focus from the controls to the deck in fullscreen", () => {
    stubFullscreen();
    render(<Deck markdown={THREE_SLIDES} />);
    const button = screen.getByRole("button", { name: "Fullscreen" });
    act(() => button.focus());
    fireEvent.click(button);
    expect(document.activeElement).toBe(deckRoot());
  });

  it("toggles through a ref", () => {
    const { request } = stubFullscreen();
    const ref = createRef<DeckHandle>();
    render(<Deck markdown={THREE_SLIDES} ref={ref} controls={false} />);
    act(() => ref.current!.toggleFullscreen());
    expect(request).toHaveBeenCalledOnce();
  });
});

describe("controlling the deck", () => {
  it("follows the position prop and reports navigation", () => {
    const onPositionChange = vi.fn();
    const { rerender } = render(
      <Deck
        markdown={THREE_SLIDES}
        position={{ slide: 0, step: 0 }}
        onPositionChange={onPositionChange}
      />,
    );

    press("ArrowRight");
    expect(onPositionChange).toHaveBeenCalledWith({ slide: 1, step: 0 });
    expect(heading()).toBe("One");

    rerender(
      <Deck
        markdown={THREE_SLIDES}
        position={{ slide: 1, step: 1 }}
        onPositionChange={onPositionChange}
      />,
    );
    expect(heading()).toBe("Two");
    expect(screen.getByText("Revealed").dataset.stepState).toBe("current");
  });

  it("exposes navigation through a ref", () => {
    const ref = createRef<DeckHandle>();
    render(<Deck markdown={THREE_SLIDES} ref={ref} />);

    act(() => ref.current!.goTo(2));
    expect(heading()).toBe("Three");
    act(() => ref.current!.prev());
    expect(heading()).toBe("Two");
  });

  it("navigates with the controls", () => {
    render(<Deck markdown={THREE_SLIDES} />);
    const previous = screen.getByRole("button", { name: "Previous" });
    expect((previous as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(heading()).toBe("Two");
    expect(screen.getByText("Slide 2 of 3")).toBeTruthy();
  });
});

describe("layouts and directives", () => {
  it("places slot directives into the layout", () => {
    render(
      <Deck
        markdown={text`
---
layout: two-cols
---

# Compare

:::left
Before
:::

:::right{.highlight}
After
:::

:::note
Not a slot
:::
`}
      />,
    );

    const left = document.querySelector('[data-part="left"] [data-slot]');
    const right = document.querySelector('[data-part="right"] [data-slot]');
    expect(left?.textContent).toBe("Before");
    expect(right?.className).toBe("highlight");
    expect(document.querySelector('[data-directive="note"]')?.textContent).toBe(
      "Not a slot",
    );
    expect(document.querySelector('[data-part="columns"]')?.textContent).toBe(
      "BeforeAfter",
    );
  });

  it("renders registered components with the directive's attributes", () => {
    render(
      <Deck
        markdown={text`
::video{src="/demo.mp4" start="10"}

:::callout{.warning}
Mind the **gap**
:::
`}
        components={{
          video: ({ src, start }: { src: string; start: string }) => (
            <span data-testid="video">{`${src}@${start}`}</span>
          ),
          callout: ({ children }: { children?: React.ReactNode }) => (
            <aside data-testid="callout">{children}</aside>
          ),
        }}
      />,
    );

    expect(screen.getByTestId("video").textContent).toBe("/demo.mp4@10");
    const callout = screen.getByTestId("callout");
    expect(callout.innerHTML).toContain("<strong>gap</strong>");
    expect(callout.parentElement?.className).toBe("warning");
  });

  it("uses custom layouts and their slots", () => {
    function Split({ children, slots }: LayoutProps) {
      return (
        <>
          <main>{children}</main>
          <aside>{slots.aside}</aside>
        </>
      );
    }
    Split.slots = ["aside"];

    render(
      <Deck
        markdown={text`
---
layout: split
---

Main

:::aside
Side
:::
`}
        layouts={{ split: Split }}
      />,
    );

    expect(document.querySelector("main")?.textContent).toBe("Main\n");
    expect(document.querySelector("aside [data-slot]")?.textContent).toBe(
      "Side",
    );
  });

  it("falls back to the default layout for unknown names", () => {
    render(<Deck markdown={"---\nlayout: nope\n---\n\n# Hi"} />);
    expect(slide().getAttribute("data-layout")).toBe("nope");
    expect(heading()).toBe("Hi");
  });
});

describe("code blocks", () => {
  const CODE = text`
\`\`\`ts {1|2} lines=5 title="math.ts"
const a = 1;
const b = 2;
\`\`\`
`;

  it("renders title, line numbers and per-step highlights", () => {
    render(<Deck markdown={CODE} />);
    const lines = () =>
      [...document.querySelectorAll("[data-line]")].map((line) =>
        line.getAttribute("data-line-state"),
      );

    expect(screen.getByText("math.ts").tagName).toBe("FIGCAPTION");
    expect(document.querySelector("pre")?.style.counterReset).toBe("line 4");
    expect(lines()).toEqual(["highlighted", "dimmed"]);

    press("ArrowRight");
    expect(lines()).toEqual(["dimmed", "highlighted"]);
  });

  it("adds syntax colours once the highlighter loads", async () => {
    render(<Deck markdown={CODE} />);
    expect(document.querySelector("[data-line]")?.textContent).toBe(
      "const a = 1;",
    );

    await waitFor(
      () => {
        const keyword = document.querySelector("[data-line] span");
        expect(keyword?.textContent).toBe("const");
        expect(keyword?.getAttribute("style")).toContain(
          "--deck-code-token-keyword",
        );
      },
      { timeout: 10_000 },
    );
    expect(document.querySelector("code")?.textContent).toBe(
      "const a = 1;\nconst b = 2;",
    );
  });
});

describe("errors", () => {
  it("contains a failing component to its slide", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    function Broken(): never {
      throw new Error("boom");
    }

    const { rerender } = render(
      <Deck markdown="::broken" components={{ broken: Broken }} />,
    );
    expect(screen.getByRole("alert").textContent).toContain("boom");

    rerender(<Deck markdown="# Fixed" components={{ broken: Broken }} />);
    expect(heading()).toBe("Fixed");
    consoleError.mockRestore();
  });
});
