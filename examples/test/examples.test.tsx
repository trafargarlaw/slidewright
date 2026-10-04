import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parseDeck } from "@slidewright/core";
import { PrintDeck } from "@slidewright/react";
import { slidewright } from "@slidewright/vite";
import { renderToString } from "react-dom/server";
import { build, defaultClientConditions, type InlineConfig } from "vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { components, layouts } from "../react/src/parts";

const example = (...path: string[]) => join(import.meta.dirname, "..", ...path);

// Decks presented with the CLI, and the deck of the React app.
const DECKS = {
  layouts: example("layouts", "slides.md"),
  code: example("code", "slides.md"),
  theme: example("theme", "slides.md"),
  react: example("react", "src", "slides.md"),
};

const read = (deck: string) => readFileSync(deck, "utf8");

/** The deck rendered as for printing: every slide, fully revealed. */
function print(name: keyof typeof DECKS): string {
  return renderToString(
    <PrintDeck
      markdown={read(DECKS[name])}
      layouts={name === "react" ? layouts : undefined}
      components={name === "react" ? components : undefined}
    />,
  );
}

describe.each(Object.keys(DECKS) as (keyof typeof DECKS)[])("%s", (name) => {
  it("parses without diagnostics", () => {
    expect(parseDeck(read(DECKS[name])).diagnostics).toEqual([]);
  });

  it("renders every slide without errors", () => {
    const html = print(name);
    expect(html.match(/data-deck-page=""/g)).toHaveLength(
      parseDeck(read(DECKS[name])).slides.length,
    );
    expect(html).not.toContain("data-slide-error");
  });
});

describe("layouts", () => {
  it("shows every built-in layout", () => {
    const { slides } = parseDeck(read(DECKS.layouts));
    expect(new Set(slides.map((slide) => slide.layout))).toEqual(
      new Set([
        "default",
        "center",
        "cover",
        "section",
        "statement",
        "fact",
        "quote",
        "full",
        "two-cols",
        "image",
        "image-left",
        "image-right",
      ]),
    );
  });
});

describe("react", () => {
  it("fills the custom layout and components", () => {
    const html = print("react");
    expect(html).toMatch(
      /<aside data-part="aside"><div data-slot="aside"[^>]*><p><strong>Sidebar<\/strong>/,
    );
    expect(html.match(/class="callout" data-tone="(\w+)"/g)).toEqual([
      'class="callout" data-tone="info"',
      'class="callout" data-tone="warning"',
    ]);
  });
});

describe("build", () => {
  let out = "";
  beforeEach(() => {
    out = mkdtempSync(join(tmpdir(), "slidewright-examples-"));
  });
  afterEach(() => {
    rmSync(out, { recursive: true, force: true });
  });

  // Workspace sources in the built pages too.
  const config = (config: InlineConfig): InlineConfig => ({
    ...config,
    logLevel: "warn",
    resolve: {
      conditions: ["@slidewright/source", ...defaultClientConditions],
    },
    build: { outDir: out },
  });

  /** All text files of the build, joined. */
  const output = () =>
    readdirSync(out, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(html|js|css)$/.test(file))
      .map((file) => readFileSync(join(out, file), "utf8"))
      .join("\n");

  it.each(["layouts", "code", "theme"] as const)(
    "builds the %s deck as the CLI does",
    async (name) => {
      const root = dirname(DECKS[name]);
      const css = existsSync(join(root, "style.css")) ? "style.css" : undefined;
      await build(
        config({
          root,
          configFile: false,
          plugins: [slidewright({ deck: "slides.md", css })],
        }),
      );

      expect(existsSync(join(out, "index.html"))).toBe(true);
      if (name === "layouts") {
        expect(existsSync(join(out, "hills.svg"))).toBe(true);
        expect(output()).toContain(".poster");
      }
      if (name === "theme") expect(output()).toContain("#f2925a");
    },
  );

  it("builds the React app", async () => {
    await build(
      config({
        root: example("react"),
        configFile: example("react", "vite.config.ts"),
      }),
    );
    expect(output()).toContain("A custom layout");
  });
});
