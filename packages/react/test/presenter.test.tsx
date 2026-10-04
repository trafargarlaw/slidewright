import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { Deck, Presenter, type DeckPosition } from "../src";

const text = (strings: TemplateStringsArray) =>
  strings.join("").replace(/^\n/, "");

const presenter = () =>
  document.querySelector<HTMLElement>("[data-presenter]")!;
const press = (key: string, target: Element = presenter()) =>
  fireEvent.keyDown(target, { key });
const counter = () =>
  document.querySelector("[data-presenter-counter]")?.textContent;
const currentHeading = () =>
  document.querySelector("[data-presenter-current] h1")?.textContent;
const next = () => document.querySelector("[data-presenter-next]")!;
const nextHeading = () => next().querySelector("h1")?.textContent;
const caption = () => next().querySelector("figcaption")?.textContent;
const notes = () => document.querySelector("[data-presenter-notes]")!;
const parts = () =>
  [...notes().querySelectorAll<HTMLElement>("[data-presenter-note]")].map(
    (part) => [part.textContent, part.dataset.noteState],
  );

const TALK = text`
# Welcome

<!-- notes
Say hello.
-->

---

# Reasons

<!-- step -->

- Fast

<!-- step -->

- Small

<!-- notes
Two reasons.

[step]

**Fast**: no build.

[step]

Small: one file.
-->

---

# Thanks
`;

describe("layout", () => {
  it("shows the current slide, the next one and the notes", () => {
    render(<Presenter markdown={TALK} />);

    expect(presenter().getAttribute("aria-roledescription")).toBe(
      "presenter view",
    );
    expect(currentHeading()).toBe("Welcome");
    expect(caption()).toBe("Next slide");
    expect(nextHeading()).toBe("Reasons");
    expect(notes().textContent).toBe("Say hello.");
    expect(counter()).toBe("1 / 3");
  });

  it("previews the next step on the same slide", () => {
    render(
      <Presenter markdown={TALK} defaultPosition={{ slide: 1, step: 0 }} />,
    );

    expect(caption()).toBe("Next step");
    expect(nextHeading()).toBe("Reasons");
    const revealed = next().querySelectorAll(
      "[data-step-state='current'], [data-step-state='past']",
    );
    expect([...revealed].map((element) => element.textContent?.trim())).toEqual(
      ["Fast"],
    );
  });

  it("says when the deck ends", () => {
    render(
      <Presenter markdown={TALK} defaultPosition={{ slide: 2, step: 0 }} />,
    );

    expect(caption()).toBe("Next");
    expect(next().textContent).toContain("End of the deck");
    expect(next().querySelector("[data-slide]")).toBeNull();
  });

  it("keeps the preview out of the tab order", () => {
    render(<Presenter markdown={"# One\n\n[Link](#2)\n\n---\n\n# Two"} />);

    expect(
      next().querySelector("[data-deck-canvas]")?.hasAttribute("inert"),
    ).toBe(true);
  });
});

describe("notes", () => {
  it("marks the part for the current step", () => {
    render(
      <Presenter markdown={TALK} defaultPosition={{ slide: 1, step: 0 }} />,
    );

    expect(parts()).toEqual([
      ["Two reasons.", "current"],
      ["Fast: no build.", "future"],
      ["Small: one file.", "future"],
    ]);
    expect(notes().querySelector("[aria-current='step']")?.textContent).toBe(
      "Two reasons.",
    );

    press("ArrowRight");
    expect(parts()).toEqual([
      ["Two reasons.", "past"],
      ["Fast: no build.", "current"],
      ["Small: one file.", "future"],
    ]);
  });

  it("renders Markdown", () => {
    render(
      <Presenter markdown={TALK} defaultPosition={{ slide: 1, step: 1 }} />,
    );

    expect(notes().querySelector("strong")?.textContent).toBe("Fast");
  });

  it("keeps the last part current when the slide has more steps", () => {
    const markdown = text`
# One

<!-- step -->

A

<!-- step -->

B

<!-- notes
First.

[step]

Rest.
-->
`;
    render(
      <Presenter markdown={markdown} defaultPosition={{ slide: 0, step: 2 }} />,
    );

    expect(parts()).toEqual([
      ["First.", "past"],
      ["Rest.", "current"],
    ]);
  });

  it("shows notes without steps as one block", () => {
    render(<Presenter markdown={TALK} />);

    expect(parts()).toEqual([["Say hello.", undefined]]);
    expect(notes().querySelector("[aria-current]")).toBeNull();
  });

  it("leaves out empty parts", () => {
    const markdown = text`
# One

<!-- step -->

A

<!-- notes
[step]

On A.
-->
`;
    render(<Presenter markdown={markdown} />);

    expect(parts()).toEqual([["On A.", "future"]]);
    press("ArrowRight");
    expect(parts()).toEqual([["On A.", "current"]]);
  });

  it("says when a slide has no notes", () => {
    render(
      <Presenter markdown={TALK} defaultPosition={{ slide: 2, step: 0 }} />,
    );

    expect(notes().textContent).toBe("No notes for this slide.");
  });

  it("follows edits to the notes", () => {
    const { rerender } = render(<Presenter markdown={TALK} />);

    rerender(<Presenter markdown={TALK.replace("Say hello.", "Say hi.")} />);

    expect(notes().textContent).toBe("Say hi.");
  });
});

describe("navigation", () => {
  it("moves through steps and slides with the keyboard", () => {
    render(<Presenter markdown={TALK} />);

    press("ArrowRight");
    expect(counter()).toBe("2 / 3");
    expect(caption()).toBe("Next step");

    press("ArrowDown");
    expect(currentHeading()).toBe("Thanks");

    press("ArrowLeft");
    expect(currentHeading()).toBe("Reasons");
    expect(parts().at(-1)).toEqual(["Small: one file.", "current"]);
  });

  it("goes to a typed slide number", () => {
    render(<Presenter markdown={TALK} />);

    press("3");
    expect(counter()).toBe("3 / 3");
    expect(document.querySelector("[data-deck-typed]")?.textContent).toBe("3");

    press("Enter");
    expect(currentHeading()).toBe("Thanks");
    expect(document.querySelector("[data-deck-typed]")).toBeNull();
  });

  it("leaves the overview, fullscreen and presenter keys alone", () => {
    render(<Presenter markdown={TALK} />);

    expect(press("o")).toBe(true);
    expect(press("f")).toBe(true);
    expect(press("p")).toBe(true);
    expect(press("ArrowRight")).toBe(false);
  });

  it("navigates with the buttons", () => {
    render(<Presenter markdown={TALK} />);
    const previous = screen.getByRole("button", { name: "Previous" });

    expect(previous).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(counter()).toBe("2 / 3");
    expect(previous).toHaveProperty("disabled", false);
  });

  it("handles keys anywhere on the page with global keyboard", () => {
    render(<Presenter markdown={TALK} keyboard="global" />);

    press("ArrowDown", document.body);

    expect(counter()).toBe("2 / 3");
    expect(presenter().hasAttribute("tabindex")).toBe(false);
  });

  it("ignores keys when the keyboard is off", () => {
    render(<Presenter markdown={TALK} keyboard={false} />);

    press("ArrowDown");

    expect(counter()).toBe("1 / 3");
  });

  it("keeps the position in the URL hash", () => {
    history.replaceState(null, "", "/#2.1");
    onTestFinished(() => history.replaceState(null, "", "/"));
    render(<Presenter markdown={TALK} hash />);

    expect(parts()[1]).toEqual(["Fast: no build.", "current"]);
    press("ArrowDown");
    expect(location.hash).toBe("#3");
  });

  it("stays in step with a deck that shares its position", () => {
    function Talk() {
      const [position, setPosition] = useState<DeckPosition>({
        slide: 0,
        step: 0,
      });
      return (
        <>
          <Deck
            markdown={TALK}
            position={position}
            onPositionChange={setPosition}
          />
          <Presenter
            markdown={TALK}
            position={position}
            onPositionChange={setPosition}
          />
        </>
      );
    }
    render(<Talk />);
    const deck = document.querySelector("[data-deck]:not([data-presenter])")!;

    press("ArrowDown");
    expect(deck.querySelector("[data-deck-counter]")?.textContent).toBe(
      "2 / 3",
    );

    fireEvent.keyDown(deck, { key: "ArrowRight" });
    expect(parts()[1]).toEqual(["Fast: no build.", "current"]);
  });
});

describe("timer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const timer = () => screen.getByRole("timer").textContent;
  const click = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }));
  // A second at a time, so React renders each tick and sets the next one.
  const wait = (seconds: number) => {
    for (let second = 0; second < seconds; second++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
  };

  it("counts from when the presenter opens", () => {
    vi.useFakeTimers();
    render(<Presenter markdown={TALK} />);

    expect(timer()).toBe("00:00");
    wait(65);
    expect(timer()).toBe("01:05");
  });

  it("pauses, resumes and resets", () => {
    vi.useFakeTimers();
    render(<Presenter markdown={TALK} />);

    wait(5);
    click("Pause timer");
    wait(60);
    expect(timer()).toBe("00:05");

    click("Resume timer");
    wait(2);
    expect(timer()).toBe("00:07");

    click("Reset timer");
    expect(timer()).toBe("00:00");
    wait(3);
    expect(timer()).toBe("00:03");
  });

  it("stays paused when reset while paused", () => {
    vi.useFakeTimers();
    render(<Presenter markdown={TALK} />);

    wait(5);
    click("Pause timer");
    click("Reset timer");
    wait(5);

    expect(timer()).toBe("00:00");
    expect(screen.getByRole("button", { name: "Resume timer" })).toBeTruthy();
  });

  it("shows hours in long talks", () => {
    vi.useFakeTimers();
    render(<Presenter markdown={TALK} />);

    vi.setSystemTime(Date.now() + 3_598_000);
    wait(1);
    expect(timer()).toBe("59:59");
    wait(1);
    expect(timer()).toBe("1:00:00");
    vi.setSystemTime(Date.now() + 3_600_000 + 122_000);
    wait(1);
    expect(timer()).toBe("2:02:03");
  });
});
