import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, sep } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { globSync } from "tinyglobby";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  build,
  createLogger,
  createServer,
  defaultClientConditions,
  type InlineConfig,
  type Logger,
  type ViteDevServer,
} from "vite";
import { builtinLayouts } from "../../react/src/layouts";
import { slidewright, type SlidewrightOptions } from "../src/index";
import { createIconSetLoader, pickIcons } from "../src/icons";
import { filePattern } from "../src/pattern";
import { findProblems, LAYOUTS } from "../src/problems";
import { parseDeck } from "@slidewright/core";

const DECK = `---
title: Plugin <test> & co
---

# Hello from the plugin

---

# Second slide
`;

const DIAGRAM = "# Flow\n\n```mermaid\nflowchart LR\n  a --> b\n```\n";

/** Installs a stand-in for Mermaid in the project. */
function installMermaid() {
  const folder = join(root, "node_modules", "mermaid");
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(folder, "package.json"),
    JSON.stringify({
      name: "mermaid",
      version: "0.0.0",
      type: "module",
      main: "index.js",
    }),
  );
  writeFileSync(
    join(folder, "index.js"),
    `export default {
  initialize() {},
  render: async () => ({ svg: "<svg class='stand-in'></svg>" }),
};
`,
  );
}

const ICONS = {
  prefix: "lucide",
  lastModified: 1,
  width: 24,
  height: 24,
  icons: {
    rocket: { body: '<path d="M4 20 20 4"/>' },
    "arrow-right": { body: '<path d="M5 12h14"/>' },
    unused: { body: '<path d="M1 1h1"/>' },
  },
  aliases: {
    "arrow-left": { parent: "arrow-right", hFlip: true },
    back: { parent: "arrow-left" },
    launch: { parent: "rocket" },
  },
};

/** Installs a small icon set in the project, as `@iconify-json/lucide`. */
function installIcons() {
  const folder = join(root, "node_modules", "@iconify-json", "lucide");
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(folder, "package.json"),
    JSON.stringify({
      name: "@iconify-json/lucide",
      version: "0.0.0",
      exports: { "./*": "./*", "./icons.json": "./icons.json" },
    }),
  );
  writeFileSync(join(folder, "icons.json"), JSON.stringify(ICONS));
}

/** The `icons` that the deck module gives the page. */
function iconsOf(code: string | undefined): unknown {
  return JSON.parse(/const icons = (.*);/.exec(code ?? "")?.[1] ?? "null");
}

/** The `markdown` that the deck module gives the page. */
function markdownOf(code: string | undefined): unknown {
  return JSON.parse(/const markdown = (.*);/.exec(code ?? "")?.[1] ?? "null");
}

let root = "";

/** Writes a deck whose second slide brings in `chapters/intro.md`. */
function writeChapters(intro = "# Why\n\n---\n\n# How\n") {
  mkdirSync(join(root, "chapters"), { recursive: true });
  writeFileSync(
    join(root, "slides.md"),
    "---\ntitle: Talk\n---\n\n# Talk\n\n---\nsrc: chapters/intro.md\n---\n\n---\n\n# Thanks\n",
  );
  writeFileSync(join(root, "chapters", "intro.md"), intro);
}

const titles = (markdown: unknown) =>
  parseDeck(String(markdown)).slides.map((slide) => slide.title);

const PROBLEMS = `---
colorScheme: purple
---

# One

---
title: Two
layout: two-columns
---

\`\`\`ts {1|x}
const a = 1;
\`\`\`
`;

/** A logger that keeps the warnings, without colours. */
function recordWarnings(): { logger: Logger; warnings: string[] } {
  const warnings: string[] = [];
  const logger = createLogger("silent");
  logger.warn = (message) => {
    warnings.push(stripVTControlCharacters(message));
  };
  return { logger, warnings };
}

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "slidewright-vite-")));
  // Problems are printed with paths relative to the working directory.
  vi.spyOn(process, "cwd").mockReturnValue(root);
  writeFileSync(join(root, "slides.md"), DECK);
  writeFileSync(
    join(root, "style.css"),
    "[data-deck] { --deck-accent: #e11d48; }\n",
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

function config(options?: SlidewrightOptions): InlineConfig {
  return {
    root,
    configFile: false,
    logLevel: "silent",
    // The page script imports the workspace packages: use their sources, so
    // tests don't need a prior build.
    resolve: {
      conditions: ["@slidewright/source", ...defaultClientConditions],
    },
    plugins: [slidewright(options)],
  };
}

describe("dev server", () => {
  let server: ViteDevServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  async function serve(options?: SlidewrightOptions): Promise<string> {
    server = await createServer({
      ...config(options),
      server: { port: 0, strictPort: false, ws: false },
      optimizeDeps: { noDiscovery: true },
    });
    await server.listen();
    return server.resolvedUrls!.local[0]!;
  }

  it("serves a page titled after the deck", async () => {
    const url = await serve();

    for (const path of ["", "index.html"]) {
      const html = await (await fetch(url + path)).text();
      expect(html).toContain("<title>Plugin &lt;test&gt; &amp; co</title>");
      expect(html).toContain('<script type="module" src="/@slidewright/app">');
      expect(html).toContain("/@vite/client");
    }
  });

  it("titles the page Slides when the deck has no title", async () => {
    writeFileSync(join(root, "slides.md"), "# Untitled\n");
    const html = await (await fetch(await serve())).text();
    expect(html).toContain("<title>Slides</title>");
  });

  it("serves the deck and its stylesheets as a module", async () => {
    await serve({ css: ["style.css"] });
    const result = await server!.transformRequest("virtual:slidewright/deck");
    expect(result?.code).toContain('import "/style.css";');
    expect(markdownOf(result?.code)).toBe(DECK);
  });

  it("joins the files of a deck, and follows each of them", async () => {
    writeChapters();
    const html = await (await fetch(await serve())).text();
    expect(html).toContain("<title>Talk</title>");
    const result = await server!.transformRequest("virtual:slidewright/deck");
    expect(titles(markdownOf(result?.code))).toEqual([
      "Talk",
      "Why",
      "How",
      "Thanks",
    ]);

    // A saved chapter gives the page its slides.
    const intro = join(root, "chapters", "intro.md");
    writeFileSync(intro, "# Why now\n");
    server!.watcher.emit("change", intro);
    await vi.waitFor(async () => {
      const next = await server!.transformRequest("virtual:slidewright/deck");
      expect(titles(markdownOf(next?.code))).toEqual([
        "Talk",
        "Why now",
        "Thanks",
      ]);
    });
  });

  it("brings in a file once it is there", async () => {
    writeChapters();
    const intro = join(root, "chapters", "intro.md");
    rmSync(intro);
    const { logger, warnings } = recordWarnings();
    server = await createServer({
      ...config(),
      customLogger: logger,
      server: { port: 0, strictPort: false, ws: false },
      optimizeDeps: { noDiscovery: true },
    });
    await server.listen();
    expect(warnings).toEqual([
      "slides.md:8: error: No file `chapters/intro.md`: its slides are left out. The path is from the folder of this file.",
    ]);
    const result = await server.transformRequest("virtual:slidewright/deck");
    expect(titles(markdownOf(result?.code))).toEqual(["Talk", "Thanks"]);

    writeFileSync(intro, "# Why\n");
    server.watcher.emit("add", intro);
    await vi.waitFor(async () => {
      const next = await server!.transformRequest("virtual:slidewright/deck");
      expect(titles(markdownOf(next?.code))).toEqual(["Talk", "Why", "Thanks"]);
    });
  });

  it("prints the problems of each file with its own lines", async () => {
    writeChapters(
      "# Why\n\n---\nlayout: two-columns\n---\n\n# How :lucide:rocket:\n",
    );
    const { logger, warnings } = recordWarnings();
    server = await createServer({
      ...config(),
      customLogger: logger,
      server: { port: 0, strictPort: false, ws: false },
      optimizeDeps: { noDiscovery: true },
    });
    await server.listen();

    const intro = join("chapters", "intro.md");
    expect(
      warnings[0]!.split("\n").map((line) => line.slice(0, intro.length + 30)),
    ).toEqual([
      `${intro}:4: warning: Unknown layout "t`,
      `${intro}:7: warning: The icon \`:lucide`,
    ]);

    // A saved chapter prints what is wrong with it now.
    writeFileSync(join(root, intro), "---\nsteps: many\n---\n\n# Why\n");
    server.watcher.emit("change", join(root, intro));
    await vi.waitFor(() => expect(warnings).toHaveLength(2));
    expect(warnings[1]).toBe(
      `${intro}:2: warning: \`steps\` must be a number of 0 or more.`,
    );
  });

  it("gives the page Mermaid when the project has it", async () => {
    await serve();
    const without = await server!.transformRequest("virtual:slidewright/deck");
    expect(without?.code).toContain("const mermaid = undefined");
    await server!.close();

    installMermaid();
    await serve();
    const result = await server!.transformRequest("virtual:slidewright/deck");
    expect(result?.code).toMatch(
      /const mermaid = \(\) => import\("[^"]*mermaid[^"]*"\)/,
    );
  });

  it("tells that a diagram needs Mermaid", async () => {
    writeFileSync(join(root, "slides.md"), DIAGRAM);
    const { logger, warnings } = recordWarnings();
    server = await createServer({
      ...config(),
      customLogger: logger,
      server: { port: 0, strictPort: false, ws: false },
      optimizeDeps: { noDiscovery: true },
    });
    await server.listen();
    expect(warnings).toEqual([
      "slides.md:3: warning: This `mermaid` block shows as code: the project doesn't have Mermaid to draw the diagram. Add it with `npm install mermaid`.",
    ]);
  });

  it("gives the page the icons that the deck uses", async () => {
    const deck = join(root, "slides.md");
    writeFileSync(deck, "# Go :lucide:rocket:\n");
    await serve();
    const without = await server!.transformRequest("virtual:slidewright/deck");
    expect(iconsOf(without?.code)).toEqual([]);
    await server!.close();

    installIcons();
    await serve();
    const result = await server!.transformRequest("virtual:slidewright/deck");
    expect(iconsOf(result?.code)).toEqual([
      {
        prefix: "lucide",
        width: 24,
        height: 24,
        icons: { rocket: ICONS.icons.rocket },
        aliases: {},
      },
    ]);

    // A saved deck with another icon gives the page that icon.
    writeFileSync(deck, "# Back :lucide:back:\n");
    server!.watcher.emit("change", deck);
    await vi.waitFor(async () => {
      const next = await server!.transformRequest("virtual:slidewright/deck");
      expect(iconsOf(next?.code)).toEqual([
        {
          prefix: "lucide",
          width: 24,
          height: 24,
          icons: { "arrow-right": ICONS.icons["arrow-right"] },
          aliases: {
            back: ICONS.aliases.back,
            "arrow-left": ICONS.aliases["arrow-left"],
          },
        },
      ]);
    });
  });

  it("tells which icons show as text", async () => {
    writeFileSync(
      join(root, "slides.md"),
      "# Go :lucide:rocket:\n\n:lucide:rockt: and :mdi:home:\n",
    );
    installIcons();
    const { logger, warnings } = recordWarnings();
    server = await createServer({
      ...config(),
      customLogger: logger,
      server: { port: 0, strictPort: false, ws: false },
      optimizeDeps: { noDiscovery: true },
    });
    await server.listen();
    expect(warnings).toEqual([
      [
        "slides.md:3: warning: The icon `:lucide:rockt:` shows as text: the `lucide` icons have no `rockt`. The names are at https://icon-sets.iconify.design/lucide/.",
        "slides.md:3: warning: The icon `:mdi:home:` shows as text: the project doesn't have the `mdi` icons. Add them with `npm install @iconify-json/mdi`.",
      ].join("\n"),
    ]);
  });

  it("serves the page script", async () => {
    const url = await serve();
    const response = await fetch(`${url}@slidewright/app`);
    expect(response.status).toBe(200);
    const code = await response.text();
    expect(code).toContain("virtual:slidewright/deck");

    // Its imports live outside the project, and the server allows them.
    const imports = [...code.matchAll(/from "(\/@fs\/[^"]+)"/g)].map(
      (m) => m[1]!,
    );
    expect(imports.length).toBeGreaterThan(0);
    for (const path of imports) {
      expect((await fetch(new URL(path, url))).status, path).toBe(200);
    }
  });

  it("reads a deck with another name", async () => {
    writeFileSync(join(root, "talk.md"), "---\ntitle: Talk\n---\n\n# Talk\n");
    const html = await (await fetch(await serve({ deck: "talk.md" }))).text();
    expect(html).toContain("<title>Talk</title>");
  });

  it("prints the deck's problems at start and after each change", async () => {
    writeFileSync(join(root, "slides.md"), PROBLEMS);
    const { logger, warnings } = recordWarnings();
    server = await createServer({
      ...config(),
      customLogger: logger,
      server: { port: 0, strictPort: false, ws: false },
      optimizeDeps: { noDiscovery: true },
    });
    await server.listen();
    expect(warnings).toEqual([
      [
        "slides.md:2: warning: `colorScheme` must be one of `light`, `dark` or `auto`.",
        'slides.md:9: warning: Unknown layout "two-columns": the slide shows with the default layout. The layouts are default, center, cover, section, statement, fact, quote, full, two-cols, image, image-left, image-right.',
        "slides.md:12: warning: `x` in `{1|x}` is not a line range. Use line numbers, ranges such as `3-5`, or `all`, with an optional `@step`.",
      ].join("\n"),
    ]);

    // Fixed: nothing to print. A new problem is printed.
    const deck = join(root, "slides.md");
    writeFileSync(deck, "# Fixed\n");
    server.watcher.emit("change", deck);
    writeFileSync(deck, "---\nsteps: many\n---\n\n# Broken again\n");
    server.watcher.emit("change", deck);
    await vi.waitFor(() => expect(warnings).toHaveLength(2));
    expect(warnings[1]).toBe(
      "slides.md:2: warning: `steps` must be a number of 0 or more.",
    );

    // Saved again without a fix: printed once only.
    server.watcher.emit("change", deck);
    await new Promise((done) => setTimeout(done, 50));
    expect(warnings).toHaveLength(2);
  });

  it("fails clearly when the deck file is missing", async () => {
    await expect(serve({ deck: "missing.md" })).rejects.toThrow(
      /Deck file not found: .*missing\.md/,
    );
  });
});

it("knows every layout of @slidewright/react", () => {
  expect([...LAYOUTS].sort()).toEqual(Object.keys(builtinLayouts).sort());
});

describe("build", () => {
  it("builds the deck into a static site", async () => {
    const outDir = join(root, "dist");
    await build({
      ...config({ css: "style.css" }),
      build: { outDir, emptyOutDir: true },
    });

    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain("<title>Plugin &lt;test&gt; &amp; co</title>");
    // Relative, so the site works from any folder.
    expect(html).toMatch(
      /<script type="module" crossorigin src="\.\/assets\/index-[\w-]+\.js">/,
    );
    expect(html).not.toContain("@slidewright/app");

    const assets = readdirSync(join(outDir, "assets"));
    const read = (pattern: RegExp) =>
      assets
        .filter((name) => pattern.test(name))
        .map((name) => readFileSync(join(outDir, "assets", name), "utf8"))
        .join("\n");
    expect(read(/^index-.*\.js$/)).toContain("Hello from the plugin");
    const css = read(/\.css$/);
    expect(css).toContain("--deck-accent:#e11d48");
    // The default theme comes first, so the deck's stylesheet wins.
    expect(css.indexOf("--deck-accent:#e11d48")).toBeGreaterThan(
      css.indexOf("--deck-accent:"),
    );
  });

  it("builds the files of a deck into one page", async () => {
    writeChapters("# Why\n\n![Plan](images/plan.png)\n");
    mkdirSync(join(root, "images"));
    writeFileSync(join(root, "images", "plan.png"), "png");
    const outDir = join(root, "dist");
    await build({ ...config(), build: { outDir, emptyOutDir: true } });

    expect(readFileSync(join(outDir, "index.html"), "utf8")).toContain(
      "<title>Talk</title>",
    );
    const script = readdirSync(join(outDir, "assets"))
      .filter((name) => /^index-.*\.js$/.test(name))
      .map((name) => readFileSync(join(outDir, "assets", name), "utf8"))
      .join("\n");
    expect(script).toContain("# Why");
    expect(script).toContain("# Thanks");
    // A file that a chapter shows, at its path from the root.
    expect(readFileSync(join(outDir, "images", "plan.png"), "utf8")).toBe(
      "png",
    );
  });

  it("builds Mermaid into the page when the project has it", async () => {
    writeFileSync(join(root, "slides.md"), DIAGRAM);
    installMermaid();
    const { logger, warnings } = recordWarnings();
    const outDir = join(root, "dist");
    await build({
      ...config(),
      customLogger: logger,
      build: { outDir, emptyOutDir: true },
    });

    expect(warnings).toEqual([]);
    const scripts = readdirSync(join(outDir, "assets"))
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFileSync(join(outDir, "assets", name), "utf8"));
    expect(scripts.join("\n")).toContain("stand-in");
    // In a file of its own, which the page loads at the first diagram.
    expect(scripts.find((code) => code.includes("Flow"))).not.toContain(
      "stand-in",
    );
  });

  it("builds the deck's icons into the page", async () => {
    writeFileSync(join(root, "slides.md"), "# Go :lucide:launch:\n");
    installIcons();
    const { logger, warnings } = recordWarnings();
    const outDir = join(root, "dist");
    await build({
      ...config(),
      customLogger: logger,
      build: { outDir, emptyOutDir: true },
    });

    expect(warnings).toEqual([]);
    const scripts = readdirSync(join(outDir, "assets"))
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFileSync(join(outDir, "assets", name), "utf8"))
      .join("\n");
    expect(scripts).toContain("M4 20 20 4");
    // Only the icons of the deck, not the set.
    expect(scripts).not.toContain("M5 12h14");
    expect(scripts).not.toContain("M1 1h1");
  });

  it("prints the deck's problems and still builds", async () => {
    writeFileSync(join(root, "slides.md"), PROBLEMS);
    const { logger, warnings } = recordWarnings();
    const outDir = join(root, "dist");
    await build({
      ...config(),
      customLogger: logger,
      build: { outDir, emptyOutDir: true },
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.split("\n").map((line) => line.split(": ")[0])).toEqual(
      ["slides.md:2", "slides.md:9", "slides.md:12"],
    );
    expect(readdirSync(outDir)).toContain("index.html");
  });

  it("keeps a base from the config", async () => {
    const outDir = join(root, "dist");
    await build({
      ...config(),
      base: "/talk/",
      build: { outDir, emptyOutDir: true },
    });
    expect(readFileSync(join(outDir, "index.html"), "utf8")).toContain(
      'src="/talk/assets/',
    );
  });

  it("copies the files that the deck refers to", async () => {
    const files = [
      "images/plan.png",
      "clip.mp4",
      "poster.jpg",
      "docs/handout.pdf",
      "hills one.svg",
      "logo.png",
      "demo.mp4",
    ];
    for (const file of [...files, "unused.png", "public/icon.svg"]) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), file);
    }
    // Next to the root, outside it.
    const outside = `${root}-outside.png`;
    writeFileSync(outside, "outside");
    writeFileSync(
      join(root, "slides.md"),
      `# Files

![Plan](images/plan.png) ![Logo](/logo.png) ![Icon](icon.svg)

<video src="./clip.mp4" poster="poster.jpg"></video>

[Handout](docs/handout.pdf?v=2#page=3) [Folder](docs) [Next](#2)
[Site](https://example.com/a.png) ![Missing](missing.png)
![Outside](../${basename(outside)})

::video{src="demo.mp4" title="clip.mp4 missing.mp4"}

---
layout: image
image: hills%20one.svg
---
`,
    );
    const outDir = join(root, "dist");
    try {
      await build({ ...config(), build: { outDir, emptyOutDir: true } });
    } finally {
      rmSync(outside);
    }

    const output = readdirSync(outDir, { recursive: true, encoding: "utf8" })
      .filter((file) => !/^(assets|index\.html)/.test(file))
      .map((file) => file.split(sep).join("/"));
    expect(output.sort()).toEqual(
      // Folders, and the public folder's file.
      [...files, "docs", "images", "icon.svg"].sort(),
    );
    for (const file of files) {
      expect(readFileSync(join(outDir, file), "utf8")).toBe(file);
    }
  });

  it("doesn't copy a file over the built page", async () => {
    writeFileSync(join(root, "index.html"), "An old page");
    writeFileSync(join(root, "slides.md"), "# Home\n\n[Home](index.html)\n");
    const { logger, warnings } = recordWarnings();
    const outDir = join(root, "dist");
    await build({
      ...config(),
      customLogger: logger,
      build: { outDir, emptyOutDir: true },
    });
    expect(warnings).toEqual([]);
    expect(readFileSync(join(outDir, "index.html"), "utf8")).toContain(
      "<title>Slides</title>",
    );
  });
});

describe("findProblems", () => {
  const lines = (source: string) =>
    findProblems(parseDeck(source), source, { mermaid: false }).map(
      (problem) => [problem.line, problem.slide],
    );

  it("finds each diagram, when the project has no Mermaid", () => {
    const source = [
      "# One",
      "",
      "```mermaid",
      "pie",
      "```",
      "",
      "---",
      "",
      "~~~ Mermaid {1}",
      "pie",
      "~~~",
    ].join("\n");
    expect(lines(source)).toEqual([
      [3, 0],
      [9, 1],
    ]);
    expect(findProblems(parseDeck(source), source)).toEqual([]);
  });

  it("skips a diagram that a code block shows the source of", () => {
    const source = [
      "``````md",
      "```mermaid",
      "pie",
      "```",
      "``````",
      "",
      "```mermaidjs",
      "```",
    ].join("\n");
    expect(lines(source)).toEqual([]);
  });
});

describe("pickIcons", () => {
  const pick = (source: string) => {
    installIcons();
    return pickIcons(parseDeck(source), source, createIconSetLoader(root));
  };

  it("picks the icons of the slides and of the notes", () => {
    const source = [
      "# One :lucide:rocket:",
      "",
      "<!-- notes",
      "Say :lucide:arrow-right:",
      "-->",
      "",
      "---",
      "",
      "- :lucide:rocket: again",
    ].join("\n");
    const { sets, problems } = pick(source);
    expect(problems).toEqual([]);
    expect(sets).toHaveLength(1);
    expect(Object.keys(sets[0]!.icons)).toEqual(["rocket", "arrow-right"]);
  });

  it("leaves icons in code where they are", () => {
    const source = "`:lucide:rocket:`\n\n```\n:lucide:unused:\n```";
    expect(pick(source)).toEqual({ sets: [], problems: [] });
  });

  it("picks an icon written as HTML", () => {
    const { sets } = pick('<span data-icon="lucide:launch"></span>');
    expect(sets[0]?.icons).toEqual({ rocket: ICONS.icons.rocket });
    expect(sets[0]?.aliases).toEqual({ launch: ICONS.aliases.launch });
  });

  it("warns once for each icon of a slide, at its first line", () => {
    const source = [
      "# One",
      "",
      "A :lucide:nope: and a :lucide:nope:",
      "",
      "---",
      "",
      "# Two",
      "",
      ":lucide:nope:",
      '<span data-icon="lucide:none"></span>',
    ].join("\n");
    expect(
      pick(source).problems.map(({ line, slide, message }) => [
        line,
        slide,
        message.slice(0, 29),
      ]),
    ).toEqual([
      [3, 0, "The icon `:lucide:nope:` show"],
      [9, 1, "The icon `:lucide:nope:` show"],
      [10, 1, "The icon `:lucide:none:` show"],
    ]);
  });
});

describe("filePattern", () => {
  // Where npm installs the page script, in a project folder with glob
  // characters in its name.
  it("matches a file in a scoped package", () => {
    const folder = join(root, "talk [draft]", "node_modules", "@scope", "pkg");
    mkdirSync(folder, { recursive: true });
    const file = join(folder, "app.js");
    writeFileSync(file, "");

    const found = globSync([filePattern(file)], { absolute: true, cwd: root });
    expect(found.map((path) => realpathSync(path))).toEqual([file]);
  });
});
