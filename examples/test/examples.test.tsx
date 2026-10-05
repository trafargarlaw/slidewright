import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import logos from "@iconify-json/logos/icons.json";
import lucide from "@iconify-json/lucide/icons.json";
import { joinDeck, parseDeck } from "@slidewright/core";
import { PrintDeck, type IconSet } from "@slidewright/react";
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
  diagrams: example("diagrams", "slides.md"),
  icons: example("icons", "slides.md"),
  transitions: example("transitions", "slides.md"),
  chapters: example("chapters", "slides.md"),
  react: example("react", "src", "slides.md"),
};

// The sets as their packages have them: thousands of icons each.
const ICONS: readonly IconSet[] = [lucide, logos];

const read = (file: string) => readFileSync(file, "utf8");

/** A deck with the slides of the files that it names, as the CLI reads it. */
const joinFiles = (name: keyof typeof DECKS) =>
  joinDeck(DECKS[name], {
    read: (file) => (existsSync(file) ? read(file) : undefined),
    resolve: (src, from) => resolve(dirname(from), src),
  });
const source = (name: keyof typeof DECKS) => joinFiles(name).source;

/** The deck rendered as for printing: every slide, fully revealed. */
function print(name: keyof typeof DECKS): string {
  return renderToString(
    <PrintDeck
      markdown={source(name)}
      layouts={name === "react" ? layouts : undefined}
      components={name === "react" ? components : undefined}
      icons={name === "icons" ? ICONS : undefined}
    />,
  );
}

describe.each(Object.keys(DECKS) as (keyof typeof DECKS)[])("%s", (name) => {
  it("parses without diagnostics", () => {
    expect(joinFiles(name).diagnostics).toEqual([]);
    expect(parseDeck(source(name)).diagnostics).toEqual([]);
  });

  it("renders every slide without errors", () => {
    const html = print(name);
    expect(html.match(/data-deck-page=""/g)).toHaveLength(
      parseDeck(source(name)).slides.length,
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

describe("transitions", () => {
  it("shows every transition of the theme, and one of its own", () => {
    const { slides } = parseDeck(read(DECKS.transitions));
    expect(
      new Set(slides.map((slide) => slide.frontmatter.transition)),
    ).toEqual(new Set(["fade", "slide", "slide-up", "zoom", "none", "turn"]));

    const theme = readFileSync(
      example("..", "packages", "react", "src", "styles.css"),
      "utf8",
    );
    const own = read(example("transitions", "style.css"));
    for (const name of ["fade", "slide", "slide-up", "zoom"]) {
      expect(theme).toContain(`@keyframes deck-${name}-in`);
      expect(theme).toContain(`@keyframes deck-${name}-out`);
    }
    expect(theme).not.toContain("turn");
    expect(own).toContain("@keyframes turn-in");
    expect(own).toContain("@keyframes turn-out");
  });
});

describe("chapters", () => {
  it("is one deck from four files", () => {
    const joined = joinFiles("chapters");
    const { config, slides } = parseDeck(joined.source);

    expect(
      joined.files.map((file) =>
        file.slice(example("chapters").length + 1).replaceAll("\\", "/"),
      ),
    ).toEqual([
      "slides.md",
      "chapters/why.md",
      "chapters/how.md",
      "shared/questions.md",
    ]);
    expect(config.title).toBe("Several files");
    expect(slides.map((slide) => slide.title)).toEqual([
      "Several files",
      "Why",
      "Decks grow",
      "How",
      "A slide with src",
      "The settings of a chapter",
      "Questions?",
      "Back in slides.md",
    ]);
    // The chapter's `defaults`, and the `class` next to its `src`.
    expect(
      slides.map((slide) => [slide.layout, slide.frontmatter.class]),
    ).toEqual([
      ["cover", undefined],
      ["section", undefined],
      ["default", undefined],
      ["section", "how"],
      ["center", "how"],
      ["center", "how"],
      ["statement", "how"],
      ["center", undefined],
    ]);
    // The `defaults` of the deck file reach every slide.
    expect(
      slides.every((slide) => slide.frontmatter.transition === "fade"),
    ).toBe(true);
  });

  it("has chapters that are decks of their own", () => {
    for (const chapter of ["why.md", "how.md"]) {
      const text = read(example("chapters", "chapters", chapter));
      expect(parseDeck(text).diagnostics).toEqual([]);
    }
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
    "diagrams",
    "icons",
    "transitions",
    "chapters",
  ] as const)("builds the %s deck as the CLI does", async (name) => {
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
    if (name === "transitions") {
      // The theme's animations and the deck's own.
      expect(output()).toContain("deck-slide-up-in");
      expect(output()).toContain("turn-out");
    }
    if (name === "chapters") {
      // The slides of the deck file and of a file that a chapter names.
      expect(output()).toContain("One deck, several files");
      expect(output()).toContain("# Questions?");
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
