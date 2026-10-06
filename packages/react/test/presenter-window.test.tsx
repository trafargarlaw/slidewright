import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode, createRef, useState, type CSSProperties } from "react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { Deck, type DeckHandle, type DeckPosition } from "../src";

const text = (strings: TemplateStringsArray) =>
  strings.join("").replace(/^\n/, "");

const deckRoot = () => document.querySelector<HTMLElement>("[data-deck]")!;
const press = (key: string, target: Element = deckRoot()) =>
  fireEvent.keyDown(target, { key });
const heading = () => deckRoot().querySelector("[data-slide] h1")?.textContent;
const button = () => screen.getByRole("button", { name: "Presenter view" });

const TALK = text`
---
title: Talk
---

# One

<!-- notes
Open with a story.
-->

---

# Two

<!-- step -->

Revealed

---

# Three
`;

/**
 * jsdom can't open windows: an iframe stands in for each one, with its own
 * document and globals like a real window.
 */
function stubWindowOpen() {
  const opened: Window[] = [];
  const open = vi.spyOn(window, "open").mockImplementation(() => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const popup = frame.contentWindow!;
    let closed = false;
    Object.defineProperty(popup, "closed", { get: () => closed });
    popup.close = () => {
      closed = true;
    };
    opened.push(popup);
    return popup;
  });
  onTestFinished(() => {
    open.mockRestore();
    for (const frame of document.querySelectorAll("iframe")) frame.remove();
  });
  return { open, opened, popup: () => opened.at(-1)! };
}

const presenterIn = (popup: Window) =>
  popup.document.querySelector<HTMLElement>("[data-presenter]");
const currentIn = (popup: Window) =>
  popup.document.querySelector("[data-presenter-current] h1")?.textContent;

describe("presenter window", () => {
  it("opens the presenter view in a second window with P", () => {
    const { open, popup } = stubWindowOpen();
    render(<Deck markdown={TALK} />);
    expect(button().getAttribute("aria-pressed")).toBe("false");

    expect(press("p")).toBe(false);

    expect(open).toHaveBeenCalledExactlyOnceWith(
      "",
      "_blank",
      expect.stringContaining("popup"),
    );
    expect(button().getAttribute("aria-pressed")).toBe("true");
    expect(popup().document.title).toBe("Talk – Presenter view");
    expect(currentIn(popup())).toBe("One");
    expect(
      popup().document.querySelector("[data-presenter-notes]")?.textContent,
    ).toBe("Open with a story.");
    // Only the presenter: the audience's deck stays on this page.
    expect(document.querySelectorAll("[data-presenter]")).toHaveLength(0);
  });

  it("stays open in strict mode", () => {
    const { popup } = stubWindowOpen();
    render(
      <StrictMode>
        <Deck markdown={TALK} />
      </StrictMode>,
    );

    press("p");

    expect(popup().closed).toBe(false);
    expect(currentIn(popup())).toBe("One");
  });

  it("moves together with the deck", () => {
    const { popup } = stubWindowOpen();
    render(<Deck markdown={TALK} />);
    press("p");

    press("ArrowDown", popup().document.body);
    expect(heading()).toBe("Two");
    press("ArrowRight", popup().document.body);
    expect(screen.getByText("Revealed").dataset.stepState).toBe("current");

    press("ArrowRight");
    expect(currentIn(popup())).toBe("Three");
    fireEvent.click(
      popup().document.querySelector("button[aria-label='Previous']")!,
    );
    expect(heading()).toBe("Two");
  });

  it("keeps keys in the window to the presenter", () => {
    const { popup } = stubWindowOpen();
    render(<Deck markdown={TALK} />);
    press("p");
    const next = popup().document.querySelector<HTMLElement>(
      "button[aria-label='Next']",
    )!;

    // Not also handled by the deck, which would move twice.
    press("ArrowDown", next);
    expect(heading()).toBe("Two");
    press("3", next);
    expect(
      popup().document.querySelector("[data-presenter-counter]")?.textContent,
    ).toBe("3 / 3");
    expect(deckRoot().querySelector("[data-deck-counter]")?.textContent).toBe(
      "2 / 3",
    );
  });

  it("reports the presenter's moves to a controlled deck", () => {
    const { popup } = stubWindowOpen();
    const changes: DeckPosition[] = [];
    function Talk() {
      const [position, setPosition] = useState({ slide: 0, step: 0 });
      return (
        <Deck
          markdown={TALK}
          position={position}
          onPositionChange={(next) => {
            changes.push(next);
            setPosition(next);
          }}
        />
      );
    }
    render(<Talk />);
    press("p");

    press("ArrowDown", popup().document.body);

    expect(changes).toEqual([{ slide: 1, step: 0 }]);
    expect(heading()).toBe("Two");
  });

  it("follows edits to the deck", () => {
    const { popup } = stubWindowOpen();
    const { rerender } = render(<Deck markdown={TALK} />);
    press("p");

    rerender(<Deck markdown={TALK.replace("# One", "# First")} />);

    expect(currentIn(popup())).toBe("First");
  });

  it("closes with P, the button, or the deck", () => {
    const { open, opened } = stubWindowOpen();
    const { unmount } = render(<Deck markdown={TALK} />);

    press("p");
    press("p");
    expect(opened[0]!.closed).toBe(true);
    expect(button().getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(button());
    expect(open).toHaveBeenCalledTimes(2);
    fireEvent.click(button());
    expect(opened[1]!.closed).toBe(true);

    press("p");
    unmount();
    expect(opened[2]!.closed).toBe(true);
  });

  it("notices when the speaker closes the window", () => {
    const { open, popup } = stubWindowOpen();
    render(<Deck markdown={TALK} />);
    press("p");

    act(() => {
      popup().dispatchEvent(new Event("pagehide"));
    });
    expect(button().getAttribute("aria-pressed")).toBe("false");

    press("p");
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("opens a new window when the old one closed unnoticed", () => {
    const { open, opened } = stubWindowOpen();
    render(<Deck markdown={TALK} />);
    press("p");
    opened[0]!.close();

    press("p");

    expect(open).toHaveBeenCalledTimes(2);
    expect(button().getAttribute("aria-pressed")).toBe("true");
    expect(currentIn(opened[1]!)).toBe("One");
  });

  it("closes the window when the page goes", () => {
    const { popup } = stubWindowOpen();
    render(<Deck markdown={TALK} />);
    press("p");

    window.dispatchEvent(new Event("pagehide"));

    expect(popup().closed).toBe(true);
  });

  it("does nothing when the browser blocks the window", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    onTestFinished(() => open.mockRestore());
    render(<Deck markdown={TALK} />);

    press("p");

    expect(open).toHaveBeenCalledOnce();
    expect(button().getAttribute("aria-pressed")).toBe("false");
  });

  it("opens through a ref", () => {
    const { popup } = stubWindowOpen();
    const ref = createRef<DeckHandle>();
    render(<Deck markdown={TALK} ref={ref} controls={false} />);

    act(() => ref.current!.togglePresenter());

    expect(presenterIn(popup())).not.toBeNull();
  });

  it("can be turned off", () => {
    const { open } = stubWindowOpen();
    render(<Deck markdown={TALK} presenter={false} />);

    expect(screen.queryByRole("button", { name: "Presenter view" })).toBe(null);
    expect(press("p")).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });
});

describe("presenter window styles", () => {
  const addToHead = (html: string) => {
    const template = document.createElement("template");
    template.innerHTML = html;
    const element = template.content.firstElementChild!;
    document.head.append(element);
    onTestFinished(() => element.remove());
    return element;
  };
  const sheetsIn = (popup: Window) =>
    [...popup.document.head.querySelectorAll("link, style")].map(
      (element) => element.outerHTML,
    );

  it("copies the page's stylesheets and follows changes", async () => {
    const { popup } = stubWindowOpen();
    const link = addToHead('<link rel="stylesheet" href="/deck.css">');
    const style = addToHead("<style>.a { color: red }</style>");
    addToHead('<link rel="icon" href="/icon.png">');
    render(<Deck markdown={TALK} />);
    press("p");

    expect(sheetsIn(popup())).toEqual([
      '<link rel="stylesheet" href="/deck.css">',
      "<style>.a { color: red }</style>",
    ]);
    const copiedLink = popup().document.head.querySelector("link");

    style.textContent = ".a { color: blue }";
    const added = addToHead("<style>.b {}</style>");
    link.after(added);
    await waitFor(() =>
      expect(sheetsIn(popup())).toEqual([
        '<link rel="stylesheet" href="/deck.css">',
        "<style>.b {}</style>",
        "<style>.a { color: blue }</style>",
      ]),
    );
    // An unchanged stylesheet is kept, so it doesn't load again.
    expect(popup().document.head.querySelector("link")).toBe(copiedLink);

    link.remove();
    await waitFor(() =>
      expect(sheetsIn(popup())).toEqual([
        "<style>.b {}</style>",
        "<style>.a { color: blue }</style>",
      ]),
    );
  });

  it("copies the root element's attributes, such as a dark mode class", async () => {
    const { popup } = stubWindowOpen();
    const root = document.documentElement;
    root.setAttribute("lang", "fr");
    root.classList.add("dark");
    onTestFinished(() => {
      root.removeAttribute("lang");
      root.removeAttribute("class");
    });
    render(<Deck markdown={TALK} />);
    press("p");
    const copy = popup().document.documentElement;

    expect(copy.getAttribute("lang")).toBe("fr");
    expect(copy.className).toBe("dark");

    root.classList.remove("dark");
    root.removeAttribute("lang");
    await waitFor(() => expect(copy.hasAttribute("lang")).toBe(false));
    expect(copy.className).toBe("");
  });

  it("gives the presenter the deck's class and custom properties", () => {
    const { popup } = stubWindowOpen();
    render(
      <Deck
        markdown={TALK}
        className="brand"
        style={{ height: "400px", "--deck-accent": "red" } as CSSProperties}
      />,
    );
    press("p");
    const presenter = presenterIn(popup())!;

    expect(presenter.className).toBe("brand");
    expect(presenter.style.getPropertyValue("--deck-accent")).toBe("red");
    // The deck's size is not for the window.
    expect(presenter.style.height).not.toBe("400px");
  });
});

describe("presenter in another window", () => {
  it("measures with the window's own ResizeObserver", () => {
    const observed: HTMLElement[] = [];
    class FakeObserver {
      observe(element: HTMLElement) {
        observed.push(element);
      }
      disconnect() {}
    }
    const { open } = stubWindowOpen();
    const stubbed = open.getMockImplementation()!;
    open.mockImplementation((...args) => {
      const popup = stubbed(...args)!;
      Object.assign(popup, { ResizeObserver: FakeObserver });
      return popup;
    });
    render(<Deck markdown={TALK} />);

    press("p");

    expect(observed.map((element) => Object.keys(element.dataset)[0])).toEqual([
      "deckViewport",
      "presenterPreview",
    ]);
  });

  it("keeps time with the window's own clock", () => {
    const { open } = stubWindowOpen();
    const stubbed = open.getMockImplementation()!;
    let setTimeout: ReturnType<typeof vi.fn> | undefined;
    open.mockImplementation((...args) => {
      const popup = stubbed(...args)!;
      setTimeout = vi.spyOn(popup, "setTimeout") as never;
      return popup;
    });
    render(<Deck markdown={TALK} />);

    press("p");

    // The timer waits for the next second there.
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
