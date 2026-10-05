import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import logos from "@iconify-json/logos/icons.json";
import lucide from "@iconify-json/lucide/icons.json";
import { parseDeck } from "@slidewright/core";
import {
  PrintDeck,
  type DirectiveComponents,
  type IconSet,
} from "@slidewright/react";
import { slidewright } from "@slidewright/vite";
import { renderToString } from "react-dom/server";
import { build, defaultClientConditions, type InlineConfig } from "vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import deckComponents from "../components/components";
import { components, layouts } from "../react/src/parts";

const example = (...path: string[]) => join(import.meta.dirname, "..", ...path);

// Decks presented with the CLI, and the deck of the React app.
const DECKS = {
  layouts: example("layouts", "slides.md"),
  code: example("code", "slides.md"),
  theme: example("theme", "slides.md"),
  components: example("components", "slides.md"),
  diagrams: example("diagrams", "slides.md"),
  icons: example("icons", "slides.md"),
  react: example("react", "src", "slides.md"),
};

const COMPONENTS: Partial<Record<keyof typeof DECKS, DirectiveComponents>> = {
  components: deckComponents,
  react: components,
};

// The sets as their packages have them: thousands of icons each.
const ICONS: readonly IconSet[] = [lucide, logos];

const read = (deck: string) => readFileSync(deck, "utf8");

/** The deck rendered as for printing: every slide, fully revealed. */
function print(name: keyof typeof DECKS): string {
  return renderToString(
    <PrintDeck
      markdown={read(DECKS[name])}
      layouts={name === "react" ? layouts : undefined}
      components={COMPONENTS[name]}
      icons={name === "icons" ? ICONS : undefined}
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

describe("components", () => {
  it("renders the directives with the components next to the deck", () => {
    const html = print("components");
    expect(html.match(/class="callout" data-tone="(\w+)"/g)).toEqual([
      'class="callout" data-tone="warning"',
      'class="callout" data-tone="info"',
    ]);
    expect(html).toContain("Hands up<!-- -->: <strong>3</strong>");
  });
});

describe("icons", () => {
  it("draws every icon of the deck", () => {
    const html = print("icons");
    expect(html).not.toContain("<span data-icon=");
    expect(html.match(/<svg data-icon="lucide:[a-z-]+"/g)).toHaveLength(13);
    expect(html.match(/<svg data-icon="logos:[a-z-]+"/g)).toHaveLength(4);
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

  it.each([
    "layouts",
    "code",
    "theme",
    "components",
    "diagrams",
    "icons",
  ] as const)("builds the %s deck as the CLI does", async (name) => {
    const root = dirname(DECKS[name]);
    const file = (name: string) =>
      existsSync(join(root, name)) ? name : undefined;
    await build(
      config({
        root,
        configFile: false,
        plugins: [
          slidewright({
            deck: "slides.md",
            css: file("style.css"),
            components: file("components.tsx"),
          }),
        ],
      }),
    );

    expect(existsSync(join(out, "index.html"))).toBe(true);
    if (name === "layouts") {
      expect(existsSync(join(out, "hills.svg"))).toBe(true);
      expect(output()).toContain(".poster");
    }
    if (name === "theme") expect(output()).toContain("#f2925a");
    if (name === "diagrams") {
      // Mermaid, from this workspace: a file for each kind of diagram.
      expect(
        readdirSync(join(out, "assets")).filter((file) =>
          /^(flow|sequence|state|pie)Diagram.*\.js$/.test(file),
        ),
      ).toHaveLength(4);
    }
    if (name === "icons") {
      // The icons of the deck, from this workspace, and not their sets.
      expect(output()).toMatch(/["'`]party-popper["'`]:/);
      expect(output()).toMatch(/["'`]typescript-icon["'`]:/);
      expect(output()).not.toMatch(/["'`]a-arrow-down["'`]:/);
    }
    if (name === "components") {
      // The component, whatever quotes the minifier picks.
      expect(output()).toMatch(/className:["'`]counter["'`]/);
    }
  });

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
