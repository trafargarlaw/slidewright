import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrintDeck } from "../src";

const DECK = `---
title: Printed
aspectRatio: 4/3
canvasWidth: 800
colorScheme: dark
---

# One

- a

<!-- step -->

- b

---

# Two

\`\`\`ts {1|2}
const a = 1;
const b = 2;
\`\`\`
`;

const pages = () => [...document.querySelectorAll("[data-deck-page]")];

describe("PrintDeck", () => {
  it("renders every slide fully revealed, one per page", () => {
    render(<PrintDeck markdown={DECK} />);

    expect(
      pages().map((page) => page.querySelector("h1")?.textContent),
    ).toEqual(["One", "Two"]);
    expect(document.querySelector('[data-step-state="future"]')).toBeNull();
    // Code shows its last highlight stage.
    expect(
      [...document.querySelectorAll("[data-line]")].map((line) =>
        line.getAttribute("data-line-state"),
      ),
    ).toEqual(["dimmed", "highlighted"]);
    expect(pages().map((page) => page.getAttribute("data-page-step"))).toEqual([
      null,
      null,
    ]);
  });

  it("renders a page for every step", () => {
    render(<PrintDeck markdown={DECK} steps />);

    expect(
      pages().map((page) => [
        page.getAttribute("data-page-slide"),
        page.getAttribute("data-page-step"),
      ]),
    ).toEqual([
      ["0", "0"],
      ["0", "1"],
      ["1", "0"],
      ["1", "1"],
    ]);
    const [first, second] = pages();
    expect(first!.querySelector('[data-step-state="future"]')).not.toBeNull();
    expect(second!.querySelector('[data-step-state="future"]')).toBeNull();
  });

  it("sizes printed pages to the slides", () => {
    render(<PrintDeck markdown={DECK} />);
    expect(document.querySelector("style")?.textContent).toBe(
      "@page { size: 800px 600px; margin: 0; }",
    );
    const root = document.querySelector<HTMLElement>("[data-deck-print]")!;
    expect(root.style.getPropertyValue("--deck-page-height")).toBe("600px");
  });

  it("rounds page sizes to whole pixels", () => {
    // 980 / (16 / 9) is 551.25.
    render(<PrintDeck markdown={"# One\n"} />);
    expect(document.querySelector("style")?.textContent).toBe(
      "@page { size: 980px 551px; margin: 0; }",
    );
    const root = document.querySelector<HTMLElement>("[data-deck-print]")!;
    expect(root.style.getPropertyValue("--deck-page-width")).toBe("980px");
    expect(root.style.getPropertyValue("--deck-page-height")).toBe("551px");
  });

  it("takes the colour scheme and title from the deck", () => {
    const { rerender } = render(<PrintDeck markdown={DECK} />);
    const root = screen.getByLabelText("Printed");
    expect(root.getAttribute("data-color-scheme")).toBe("dark");
    expect(root.hasAttribute("data-deck")).toBe(true);

    rerender(<PrintDeck markdown={DECK} colorScheme="light" />);
    expect(root.getAttribute("data-color-scheme")).toBe("light");
  });

  it("labels slides by their number in the deck", () => {
    render(<PrintDeck markdown={DECK} steps />);
    expect(
      [...document.querySelectorAll("[data-slide]")].map((slide) =>
        slide.getAttribute("aria-label"),
      ),
    ).toEqual(["Slide 1 of 2", "Slide 1 of 2", "Slide 2 of 2", "Slide 2 of 2"]);
  });
});
