import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import {
  defaultClientConditions,
  type InlineConfig,
  type ViteDevServer,
} from "vite";
import { chromium } from "playwright-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadChromium,
  main,
  pageFiles,
  parse,
  run,
  UsageError,
} from "../src/index";

// The page script imports the workspace packages: use their sources, so tests
// don't need a prior build.
const CONFIG: InlineConfig = {
  logLevel: "silent",
  resolve: { conditions: ["@slidewright/source", ...defaultClientConditions] },
};

describe("parse", () => {
  it("presents slides.md by default", () => {
    expect(parse([])).toEqual({
      name: "dev",
      deck: "slides.md",
      port: 3030,
      host: false,
      open: false,
    });
  });

  it("reads the command, the deck and options", () => {
    expect(
      parse(["dev", "talk/", "--port", "4000", "--host", "--open"]),
    ).toEqual({
      name: "dev",
      deck: "talk/",
      port: 4000,
      host: true,
      open: true,
    });
    expect(
      parse(["build", "talk.md", "--out", "site", "--base", "/talk/"]),
    ).toEqual({
      name: "build",
      deck: "talk.md",
      outDir: "site",
      base: "/talk/",
    });
    // The plugin's base applies.
    expect(parse(["build"])).toEqual({ name: "build", deck: "slides.md" });
  });

  it("reads export options", () => {
    expect(parse(["export"])).toEqual({
      name: "export",
      deck: "slides.md",
      format: "pdf",
      steps: false,
    });
    expect(
      parse(["export", "talk", "--format", "png", "--out", "shots", "--steps"]),
    ).toEqual({
      name: "export",
      deck: "talk",
      format: "png",
      out: "shots",
      steps: true,
    });
  });

  it("presents a Markdown file given without a command", () => {
    expect(parse(["talk.md", "--port=0"])).toMatchObject({
      name: "dev",
      deck: "talk.md",
      port: 0,
    });
  });

  it("reads help and version", () => {
    expect(parse(["--help"])).toEqual({ name: "help" });
    expect(parse(["build", "-h"])).toEqual({ name: "help" });
    expect(parse(["-v"])).toEqual({ name: "version" });
  });

  it.each([
    [["biuld"], 'Unknown command "biuld".'],
    [["dev", "a.md", "b.md"], "Expected one deck, got a.md, b.md."],
    [["build", "--port", "3000"], "--port doesn't apply to build."],
    [["dev", "--out", "site"], "--out doesn't apply to dev."],
    [["build", "--steps"], "--steps doesn't apply to build."],
    [["export", "--base", "./"], "--base doesn't apply to export."],
    [["export", "--format", "gif"], '--format must be pdf or png, got "gif".'],
    [["--port", "http"], '--port must be a port number, got "http".'],
    [["--port", "70000"], '--port must be a port number, got "70000".'],
    [["--port=-1"], '--port must be a port number, got "-1".'],
    [["--port", "1.5"], '--port must be a port number, got "1.5".'],
    [["--nope"], "Unknown option '--nope'"],
  ])("rejects %j", (args, message) => {
    expect(() => parse(args)).toThrow(UsageError);
    expect(() => parse(args)).toThrow(message);
  });
});

describe("commands", () => {
  let root = "";
  let cwd = "";
  let server: ViteDevServer | undefined;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "slidewright-cli-"));
    mkdirSync(join(root, "talk"));
    writeFileSync(
      join(root, "talk", "slides.md"),
      "---\ntitle: CLI talk\n---\n\n# Hello from the CLI\n",
    );
    cwd = process.cwd();
    process.chdir(root);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await server?.close();
    server = undefined;
    process.chdir(cwd);
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  const output = (method: "log" | "error") =>
    vi
      .mocked(console[method])
      .mock.calls.map((call) => call.join(" "))
      .join("\n");

  function site(dir: string) {
    const assets = readdirSync(join(dir, "assets"));
    const read = (pattern: RegExp) =>
      assets
        .filter((name) => pattern.test(name))
        .map((name) => readFileSync(join(dir, "assets", name), "utf8"))
        .join("\n");
    return {
      html: readFileSync(join(dir, "index.html"), "utf8"),
      js: read(/^index-.*\.js$/),
      css: read(/\.css$/),
    };
  }

  it("builds a deck folder into dist next to the deck", async () => {
    await run(parse(["build", "talk"]), CONFIG);

    const { html, js } = site(join(root, "talk", "dist"));
    expect(html).toContain("<title>CLI talk</title>");
    // Works from any folder.
    expect(html).toContain('src="./assets/');
    expect(js).toContain("Hello from the CLI");
    expect(output("log")).toMatch(
      /^Built talk\/slides\.md into talk\/dist in \d+\.\ds\.$/,
    );
  });

  it("builds into --out with --base, and loads style.css next to the deck", async () => {
    writeFileSync(
      join(root, "talk", "style.css"),
      "[data-deck] { --deck-accent: #e11d48; }\n",
    );
    await run(
      parse(["build", "talk/slides.md", "--out", "site", "--base", "/talk/"]),
      CONFIG,
    );

    const { html, css } = site(join(root, "site"));
    expect(html).toContain('src="/talk/assets/');
    expect(css).toContain("--deck-accent:#e11d48");
    expect(existsSync(join(root, "talk", "dist"))).toBe(false);
  });

  it("serves a deck on the given port", async () => {
    server = await run(parse(["dev", "talk", "--port", "0"]), CONFIG);
    const url = server!.resolvedUrls!.local[0]!;

    const html = await (await fetch(url)).text();
    expect(html).toContain("<title>CLI talk</title>");
    expect(output("log")).toContain("talk/slides.md");
    expect(server!.config.server.host).toBe(false);
  });

  it("listens on all addresses with --host", async () => {
    server = await run(parse(["dev", "talk", "--port", "0", "--host"]), CONFIG);
    expect(server!.config.server.host).toBe(true);
  });

  it("prints help and the version", async () => {
    expect(await main(["--help"])).toBe(0);
    expect(output("log")).toContain(
      "Usage: slidewright [command] [deck] [options]",
    );

    expect(await main(["--version"])).toBe(0);
    expect(output("log")).toMatch(/\n\d+\.\d+\.\d+$/);
  });

  it("explains mistakes without a stack trace", async () => {
    expect(await main(["build", "missing.md"])).toBe(1);
    expect(output("error")).toBe(
      'Deck file not found: missing.md\nRun "slidewright --help" for usage.',
    );
  });

  it("reports a folder without slides.md", async () => {
    mkdirSync(join(root, "empty"));
    expect(await main(["dev", "empty"])).toBe(1);
    expect(output("error")).toContain("Deck file not found: empty/slides.md");
  });
});

describe("pageFiles", () => {
  it("names images after the slide and step, as in the URL hash", () => {
    expect(
      pageFiles([
        [0, null],
        [1, null],
      ]),
    ).toEqual(["1.png", "2.png"]);
    expect(
      pageFiles([
        [0, "0"],
        [8, "0"],
        [8, "2"],
        [9, "0"],
      ]),
    ).toEqual(["01-0.png", "09-0.png", "09-2.png", "10-0.png"]);
  });
});

describe("loadChromium", () => {
  const nowhere = join(tmpdir(), "slidewright-no-playwright", "package.json");

  it("explains how to install Playwright when it is missing", () => {
    expect(() => loadChromium([nowhere])).toThrow(UsageError);
    expect(() => loadChromium([nowhere])).toThrow(
      "npm install --save-dev playwright-chromium",
    );
  });

  it("loads Chromium from the first base that has Playwright", () => {
    expect(loadChromium([nowhere, import.meta.url]).name()).toBe("chromium");
  });
});

// Needs a Chromium download: `npx playwright-core install chromium`.
describe.skipIf(!existsSync(chromium.executablePath()))("export", () => {
  let root = "";
  let cwd = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "slidewright-export-"));
    mkdirSync(join(root, "talk"));
    writeFileSync(
      join(root, "talk", "slides.md"),
      `---
colorScheme: dark
---

# One

---

# Two

<!-- step -->

First

<!-- step -->

Second

---
layout: two-cols
---

# Three

:::left
Left
:::

:::right
Right
:::

---

# Four

\`\`\`python
print(1)
\`\`\`
`,
    );
    cwd = process.cwd();
    process.chdir(root);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(cwd);
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  /**
   * The pages of a PDF from Chromium: the size in points, the number of
   * text blocks drawn, and the fill colours used.
   */
  function readPdf(
    file: string,
  ): { size: string; texts: number; colors: number[][] }[] {
    const pdf = readFileSync(file);
    const text = pdf.toString("latin1");
    expect(text.startsWith("%PDF-")).toBe(true);
    const object = (id: string) => {
      const start = text.indexOf(`\n${id} 0 obj`) + 1;
      return { start, body: text.slice(start, text.indexOf("endobj", start)) };
    };
    return [...text.matchAll(/\n(\d+) 0 obj\s*<<\s*\/Type \/Page\b/g)].map(
      ([, id]) => {
        const { body } = object(id!);
        const [, width, height] = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(
          body,
        )!;
        const contents = object(/\/Contents (\d+) 0 R/.exec(body)![1]!);
        const length = Number(/\/Length (\d+)/.exec(contents.body)![1]);
        const from = text.indexOf("stream\n", contents.start) + 7;
        const stream = inflateSync(pdf.subarray(from, from + length)).toString(
          "latin1",
        );
        return {
          size: `${Math.round(Number(width))}x${Math.round(Number(height))}`,
          texts: stream.match(/\bBT\b/g)?.length ?? 0,
          colors: [...stream.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg\b/g)].map(
            (match) => match.slice(1).map(Number),
          ),
        };
      },
    );
  }

  /** The width and height of a PNG file, in pixels. */
  function pngSize(file: string): [number, number] {
    const png = readFileSync(file);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  }

  it("exports a PDF with one page per slide, sized to the slide", async () => {
    await run(parse(["export", "talk"]), CONFIG);

    const pages = readPdf(join(root, "talk", "slides.pdf"));
    // 980 × 551 px is 735 × 413 pt.
    expect(pages.map((page) => page.size)).toEqual([
      "735x413",
      "735x413",
      "735x413",
      "735x413",
    ]);
    // The dark slide background is printed.
    expect(
      pages[0]!.colors.some((color) => color.every((value) => value < 0.2)),
    ).toBe(true);
    // The heading and both columns. Chromium used to drop the columns from
    // a page that is 551.25 px high and not the last.
    expect(pages[2]!.texts).toBeGreaterThanOrEqual(3);
    // The code is highlighted: each token is drawn on its own, not the
    // heading and one plain line.
    expect(pages[3]!.texts).toBeGreaterThan(2);
    expect(vi.mocked(console.log).mock.calls[0]![0]).toMatch(
      /^Exported 4 pages of talk\/slides\.md to talk\/slides\.pdf in \d+\.\ds\.$/,
    );
  });

  it("exports one PDF page per step with --steps", async () => {
    await run(
      parse(["export", "talk", "--steps", "--out", "out/steps.pdf"]),
      CONFIG,
    );

    const pages = readPdf(join(root, "out", "steps.pdf"));
    expect(pages).toHaveLength(6);
    // Slide 2 reveals one more paragraph on each step.
    expect(pages.slice(1, 4).map((page) => page.texts)).toEqual([1, 2, 3]);
  });

  it("exports PNG files at twice the slide size", async () => {
    renameSync(join(root, "talk", "slides.md"), join(root, "talk", "intro.md"));
    const dir = join(root, "talk", "intro-png");
    mkdirSync(dir);
    writeFileSync(join(dir, "9.png"), "");
    writeFileSync(join(dir, "notes.txt"), "");

    await run(parse(["export", "talk/intro.md", "--format", "png"]), CONFIG);

    expect(readdirSync(dir).sort()).toEqual([
      "1.png",
      "2.png",
      "3.png",
      "4.png",
      "notes.txt",
    ]);
    expect(pngSize(join(dir, "1.png"))).toEqual([1960, 1102]);
  });
});
