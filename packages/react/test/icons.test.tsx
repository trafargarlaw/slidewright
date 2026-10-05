import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Deck, Presenter, PrintDeck, type IconSet } from "../src";

const ROCKET = '<path d="M4 20 20 4"/>';

const lucide: IconSet = {
  prefix: "lucide",
  width: 24,
  height: 24,
  icons: {
    rocket: { body: ROCKET },
    "arrow-right": { body: '<path d="M5 12h14"/>' },
    banner: { body: '<path d="M0 0h48v12H0z"/>', width: 48, height: 12 },
  },
  aliases: {
    launch: { parent: "rocket" },
    "arrow-left": { parent: "arrow-right", hFlip: true },
    "arrow-up": { parent: "arrow-left", rotate: 1 },
    pillar: { parent: "banner", rotate: 1 },
    loop: { parent: "loop" },
  },
};

const logos: IconSet = {
  prefix: "logos",
  icons: {
    sun: {
      body: '<defs><linearGradient id="a"><stop/></linearGradient><linearGradient id="ab" href="#a"/></defs><circle fill="url(#ab)"/>',
    },
  },
};

const icons = [lucide, logos];
const icon = (name: string) =>
  document.querySelector(`[data-slide] [data-icon="${name}"]`);

describe("icons", () => {
  it("shows the source text without the icon's set", () => {
    render(<Deck markdown="# Ship :lucide:rocket:" />);
    const span = icon("lucide:rocket");
    expect(span?.tagName).toBe("SPAN");
    expect(span?.textContent).toBe(":lucide:rocket:");
  });

  it("shows the source text for a name that the set doesn't have", () => {
    render(
      <Deck markdown=":lucide:rockt: :lucide:loop: :mdi:home:" icons={icons} />,
    );
    expect(document.querySelector("svg[data-icon]")).toBeNull();
    expect(document.querySelector("[data-slide] p")?.textContent).toBe(
      ":lucide:rockt: :lucide:loop: :mdi:home:",
    );
  });

  it("draws an icon from its set", () => {
    render(<Deck markdown="# Ship :lucide:rocket: now" icons={icons} />);
    const svg = icon("lucide:rocket");
    expect(svg?.tagName).toBe("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg?.getAttribute("width")).toBe("1em");
    expect(svg?.getAttribute("height")).toBe("1em");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.innerHTML).toBe(ROCKET.replace("/>", "></path>"));
    expect(document.querySelector("[data-slide] h1")?.textContent).toBe(
      "Ship  now",
    );
  });

  it("gives an icon the size of its own box", () => {
    render(<Deck markdown=":lucide:banner: :logos:sun:" icons={icons} />);
    expect(icon("lucide:banner")?.getAttribute("viewBox")).toBe("0 0 48 12");
    expect(icon("lucide:banner")?.getAttribute("width")).toBe("4em");
    expect(icon("logos:sun")?.getAttribute("viewBox")).toBe("0 0 16 16");
  });

  it("draws aliases, flipped and turned as they say", () => {
    render(
      <Deck
        markdown=":lucide:launch: :lucide:arrow-left: :lucide:arrow-up: :lucide:pillar:"
        icons={icons}
      />,
    );
    expect(icon("lucide:launch")?.innerHTML).toContain('d="M4 20 20 4"');
    expect(icon("lucide:arrow-left")?.innerHTML).toMatch(
      /^<g transform="translate\(24 0\) scale\(-1 1\)"><path/,
    );
    expect(icon("lucide:arrow-up")?.innerHTML).toMatch(
      /^<g transform="rotate\(90 12 12\) translate\(24 0\) scale\(-1 1\)">/,
    );
    const pillar = icon("lucide:pillar");
    expect(pillar?.getAttribute("viewBox")).toBe("0 0 12 48");
    expect(pillar?.getAttribute("width")).toBe("0.25em");
    expect(pillar?.innerHTML).toMatch(/^<g transform="rotate\(90 6 6\)">/);
  });

  it("keeps the ids of two copies of an icon apart", () => {
    render(<Deck markdown=":logos:sun: :logos:sun:" icons={icons} />);
    const [first, second] = [
      ...document.querySelectorAll('[data-slide] [data-icon="logos:sun"]'),
    ];
    const ids = (svg: Element | undefined) =>
      [...(svg?.querySelectorAll("[id]") ?? [])].map((el) => el.id);
    const [a, ab] = ids(first);
    expect(a).toMatch(/^a-\w+$/);
    expect(ab).toBe(a!.replace(/^a-/, "ab-"));
    expect(first?.querySelector(`#${ab}`)?.getAttribute("href")).toBe(`#${a}`);
    expect(first?.querySelector("circle")?.getAttribute("fill")).toBe(
      `url(#${ab})`,
    );
    expect(ids(second)).toHaveLength(2);
    expect(ids(second)).not.toContain(a);
    expect(ids(second)).not.toContain(ab);
  });

  it("keeps the class, style and title of an icon written as HTML", () => {
    render(
      <Deck
        markdown={
          '<span data-icon="lucide:rocket" class="big" style="color: red" title="Launch"></span>'
        }
        icons={icons}
      />,
    );
    const svg = icon("lucide:rocket") as SVGElement | null;
    expect(svg?.tagName).toBe("svg");
    expect(svg?.getAttribute("class")).toBe("big");
    expect(svg?.style.color).toBe("red");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Launch");
    expect(svg?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("reveals an icon with its step", () => {
    render(
      <Deck
        markdown={"Go\n\n<!-- step -->\n\n:lucide:rocket:"}
        icons={icons}
        defaultPosition={{ slide: 0, step: 0 }}
      />,
    );
    expect(
      icon("lucide:rocket")
        ?.closest("[data-step]")
        ?.getAttribute("data-step-state"),
    ).toBe("future");
  });

  it("draws icons on the server", () => {
    const html = renderToString(
      <Deck markdown=":lucide:rocket:" icons={icons} />,
    );
    expect(html).toContain('<svg data-icon="lucide:rocket"');
    expect(html).toContain(ROCKET);
  });

  it("draws icons in the print view", () => {
    render(
      <PrintDeck
        markdown={":lucide:rocket:\n\n---\n\n:logos:sun:"}
        icons={icons}
      />,
    );
    expect(document.querySelectorAll("svg[data-icon]")).toHaveLength(2);
  });

  it("draws icons in the presenter view, notes included", () => {
    render(
      <Presenter
        markdown={"# One\n\n<!-- notes\nSay :lucide:rocket:\n-->"}
        icons={icons}
      />,
    );
    expect(
      document.querySelector(
        '[data-presenter-notes] svg[data-icon="lucide:rocket"]',
      ),
    ).not.toBeNull();
  });
});
