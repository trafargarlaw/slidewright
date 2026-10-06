import { act, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { Deck, type DeckHandle, type MermaidLoader } from "../src";

// Stand-ins for Shiki and KaTeX, which tell when the deck loads them.
const { loadLanguage, loadKatex } = vi.hoisted(() => ({
  loadLanguage: vi.fn<(lang: string) => Promise<void>>(async () => {}),
  loadKatex: vi.fn(),
}));
vi.mock("shiki", () => ({
  bundledLanguages: { ts: {} },
  createCssVariablesTheme: () => ({}),
  createJavaScriptRegexEngine: () => ({}),
  createHighlighter: async () => ({
    loadLanguage,
    codeToTokensBase: (code: string) =>
      code
        .split("\n")
        .map((line) => [
          { content: line, offset: 0, color: "var(--deck-code-token-keyword)" },
        ]),
  }),
}));
vi.mock("katex", () => {
  loadKatex();
  return {
    default: {
      renderToString: (source: string) =>
        `<span class="katex">${source}</span>`,
    },
  };
});

// A stand-in for Mermaid, as in the diagram tests.
const draw = vi.fn<(id: string, source: string) => Promise<{ svg: string }>>(
  async (id) => ({ svg: `<svg id="${id}"></svg>` }),
);
const mermaid: MermaidLoader = vi.fn(async () => ({
  default: { initialize: vi.fn(), render: draw },
}));

const slides = (...contents: string[]) => contents.join("\n\n---\n\n");
const diagram = (name: string) =>
  `\`\`\`mermaid\nflowchart LR\n  ${name}\n\`\`\``;
const drawn = () => document.querySelectorAll("[data-diagram] > svg");
// Lets settled promises run their callbacks, or waits for a while.
const tick = (milliseconds = 0) =>
  new Promise((done) => setTimeout(done, milliseconds));

// jsdom doesn't decode images. The deck decodes those it loads ahead.
const decoded: string[] = [];
beforeAll(() => {
  HTMLImageElement.prototype.decode = function (this: HTMLImageElement) {
    decoded.push(this.getAttribute("src") ?? "");
    return Promise.resolve();
  };
});

beforeEach(() => {
  decoded.length = 0;
  vi.clearAllMocks();
  // jsdom has no canvas to read the deck's colours with.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

describe("getting slides ready", () => {
  it("loads and decodes the images of the next three slides", async () => {
    const markdown = `# One

---

![](two.png)

---
layout: image-right
image: three.png
---

# Three

---

<video src="four.mp4" poster="four.png"></video>

---

![](five.png)
`;
    render(<Deck markdown={markdown} />);
    await waitFor(() =>
      expect(decoded).toEqual(["two.png", "three.png", "four.png"]),
    );
  });

  it("keeps the images it has loaded, so going back doesn't load them again", async () => {
    const ref = createRef<DeckHandle>();
    render(
      <Deck
        ref={ref}
        markdown={slides(
          "![](kept.png)",
          "# Two",
          "# Three",
          "# Four",
          "# Five",
          "![](far.png)",
        )}
      />,
    );
    await waitFor(() => expect(decoded).toEqual(["kept.png"]));

    act(() => ref.current!.goTo(5));
    await waitFor(() => expect(decoded).toEqual(["kept.png", "far.png"]));
    act(() => ref.current!.goTo(0));
    await tick(200);
    expect(decoded).toEqual(["kept.png", "far.png"]);
  });

  it("draws the diagrams of the next slides, which then show at once", async () => {
    const ref = createRef<DeckHandle>();
    render(
      <Deck
        ref={ref}
        markdown={slides("# One", diagram("ahead"))}
        mermaid={mermaid}
      />,
    );
    await waitFor(() => expect(draw).toHaveBeenCalledOnce());
    await tick();

    act(() => ref.current!.next());
    expect(drawn()).toHaveLength(1);
    expect(draw).toHaveBeenCalledOnce();
  });

  it("draws a diagram ahead in the colours of its part of the layout", async () => {
    // The `image` layout gives its content other colours. jsdom can't read
    // colours, nor inherit them, so a font on the figure stands in for them.
    const style = document.createElement("style");
    style.textContent =
      '[data-layout="image"] [data-part="content"] [data-diagram] { font-family: serif }';
    document.head.append(style);
    onTestFinished(() => style.remove());
    const ref = createRef<DeckHandle>();
    render(
      <Deck
        ref={ref}
        markdown={`# One\n\n---\nlayout: image\n---\n\n${diagram("over")}`}
        mermaid={mermaid}
      />,
    );
    await waitFor(() => expect(draw).toHaveBeenCalledOnce());
    await tick();

    act(() => ref.current!.next());
    expect(drawn()).toHaveLength(1);
    expect(draw).toHaveBeenCalledOnce();
  });

  it("draws a diagram on show before those of the slides to come", async () => {
    let finish = () => {};
    draw.mockImplementationOnce(async (id) => {
      await new Promise<void>((done) => (finish = done));
      return { svg: `<svg id="${id}"></svg>` };
    });
    const ref = createRef<DeckHandle>();
    render(
      <Deck
        ref={ref}
        markdown={slides(
          "# One",
          diagram("b"),
          diagram("c"),
          diagram("d"),
          "# Five",
          "# Six",
          diagram("g"),
        )}
        mermaid={mermaid}
      />,
    );
    await waitFor(() => expect(draw).toHaveBeenCalledOnce());

    act(() => ref.current!.goTo(6));
    finish();
    await waitFor(() => expect(drawn()).toHaveLength(1));
    await waitFor(() => expect(draw).toHaveBeenCalledTimes(4));
    expect(
      draw.mock.calls.map(([, source]) => source.split(" ").at(-1)),
    ).toEqual(["b", "g", "c", "d"]);
  });

  it("loads the languages of the code on the next slides", async () => {
    const ref = createRef<DeckHandle>();
    render(<Deck ref={ref} markdown={slides("# One", "```TS\nlet a;\n```")} />);
    await waitFor(() => expect(loadLanguage).toHaveBeenCalledWith("ts"));
    await tick();

    act(() => ref.current!.next());
    const code = document.querySelector("[data-code]");
    expect(code?.hasAttribute("aria-busy")).toBe(false);
    expect(code?.querySelector("[data-line] span[style]")).not.toBeNull();
  });

  it("loads KaTeX for the maths on the next slides", async () => {
    const ref = createRef<DeckHandle>();
    render(<Deck ref={ref} markdown={slides("# One", "$$\nx^2\n$$")} />);
    await waitFor(() => expect(loadKatex).toHaveBeenCalledOnce());
    await tick();

    act(() => ref.current!.next());
    expect(document.querySelector("[data-math] > .katex")).not.toBeNull();
  });
});
