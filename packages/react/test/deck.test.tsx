import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Deck, type DeckHandle, type LayoutProps } from "../src";

const text = (strings: TemplateStringsArray) =>
  strings.join("").replace(/^\n/, "");

const slide = () => document.querySelector("[data-slide]")!;
const heading = () => slide().querySelector("h1, h2")?.textContent;
const deckRoot = () => document.querySelector<HTMLElement>("[data-deck]")!;
const press = (key: string, target: Element = deckRoot()) =>
  fireEvent.keyDown(target, { key });

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
