import { fireEvent, render, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Deck, PrintDeck, type MermaidLoader } from "../src";

const FLOW = "```mermaid\nflowchart LR\n  a --> b\n```";

// A stand-in for Mermaid, which needs a browser to measure text. The deck
// keeps the first Mermaid that loads, so every test shares this one.
const initialize = vi.fn();
const draw = vi.fn(async (id: string, source: string) => {
  if (source.includes("oops")) throw new Error("Parse error on line 1");
  return {
    svg: `<svg id="${id}"><style>#${id} .node{}</style><text>${source}</text></svg>`,
  };
});
const mermaid: MermaidLoader = vi.fn(async () => ({
  default: { initialize, render: draw },
}));

const diagrams = () => [...document.querySelectorAll("[data-diagram]")];
const drawn = () => document.querySelectorAll("[data-diagram] > svg");

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no canvas to read the deck's colours with.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

describe("diagrams", () => {
  it("leaves a mermaid block as code without Mermaid", () => {
    render(<Deck markdown={FLOW} />);
    expect(diagrams()).toEqual([]);
    expect(document.querySelector("[data-code] pre")?.textContent).toBe(
      "flowchart LR\n  a --> b",
    );
  });

  it("doesn't load Mermaid for a deck without diagrams", async () => {
    render(
      <Deck markdown={"# Title\n\n```js\nlet a;\n```"} mermaid={mermaid} />,
    );
    await new Promise((done) => setTimeout(done, 20));
    expect(mermaid).not.toHaveBeenCalled();
  });

  it("shows the source, then the diagram once Mermaid has drawn it", async () => {
    render(<Deck markdown={`# Flow\n\n${FLOW}`} mermaid={mermaid} />);
    const [figure] = diagrams();
    expect(figure?.tagName).toBe("FIGURE");
    expect(figure?.getAttribute("aria-busy")).toBe("true");
    expect(figure?.querySelector("pre > code")?.textContent).toBe(
      "flowchart LR\n  a --> b",
    );
    expect(document.querySelector("[data-code]")).toBeNull();

    await waitFor(() => expect(drawn()).toHaveLength(1));
    expect(figure?.hasAttribute("aria-busy")).toBe(false);
    expect(figure?.querySelector("text")?.textContent).toBe(
      "flowchart LR\n  a --> b",
    );
    expect(initialize).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
      }),
    );
  });

  it("draws a diagram once, and gives each place it shows its own ids", async () => {
    render(<Deck markdown={`${FLOW}\n\n---\n\n# Other`} mermaid={mermaid} />);
    await waitFor(() => expect(drawn()).toHaveLength(1));
    // The overview shows the slide a second time.
    fireEvent.keyDown(document.querySelector("[data-deck]")!, { key: "o" });
    await waitFor(() => expect(drawn()).toHaveLength(2));

    const [first, second] = [...drawn()];
    expect(first?.id).toMatch(/^slidewright-diagram-shown-\d+$/);
    expect(second?.id).not.toBe(first?.id);
    for (const svg of [first, second]) {
      expect(svg?.querySelector("style")?.textContent).toBe(
        `#${svg?.id} .node{}`,
      );
    }
    // Drawn for the first test, and kept.
    expect(draw).not.toHaveBeenCalled();
  });

  it("keeps the source of a diagram with a mistake, with the message", async () => {
    render(
      <Deck markdown={"```mermaid\nflowchart oops\n```"} mermaid={mermaid} />,
    );
    await waitFor(() =>
      expect(
        document.querySelector("[data-diagram-error] figcaption")?.textContent,
      ).toBe("Parse error on line 1"),
    );
    const [figure] = diagrams();
    expect(figure?.hasAttribute("aria-busy")).toBe(false);
    expect(figure?.querySelector("pre")?.textContent).toBe("flowchart oops");
  });

  it("draws again when the source changes", async () => {
    const { rerender } = render(<Deck markdown={FLOW} mermaid={mermaid} />);
    await waitFor(() => expect(drawn()).toHaveLength(1));

    rerender(
      <Deck markdown={FLOW.replace("a --> b", "a --> c")} mermaid={mermaid} />,
    );
    await waitFor(() =>
      expect(drawn()[0]?.querySelector("text")?.textContent).toBe(
        "flowchart LR\n  a --> c",
      ),
    );
  });

  it("takes a step like other content", async () => {
    render(
      <Deck
        markdown={`# Flow\n\n<!-- step -->\n\n${FLOW}`}
        mermaid={mermaid}
      />,
    );
    expect(diagrams()[0]?.getAttribute("data-step-state")).toBe("future");
  });

  it("prints diagrams, and renders the source on the server", async () => {
    expect(
      renderToString(<PrintDeck markdown={FLOW} mermaid={mermaid} />),
    ).toMatch(/<figure data-diagram="" aria-busy="true"><pre><code>flowchart/);

    render(
      <PrintDeck markdown={`${FLOW}\n\n---\n\n${FLOW}`} mermaid={mermaid} />,
    );
    await waitFor(() => expect(drawn()).toHaveLength(2));
  });
});
