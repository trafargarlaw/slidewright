import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultClientConditions,
  type InlineConfig,
  type ViteDevServer,
} from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main, parse, run, UsageError } from "../src/index";

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
      parse(["build", "talk.md", "--out", "site", "--base", "./"]),
    ).toEqual({
      name: "build",
      deck: "talk.md",
      outDir: "site",
      base: "./",
    });
    expect(parse(["build"])).toEqual({
      name: "build",
      deck: "slides.md",
      base: "/",
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
    expect(html).toContain('src="/assets/');
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
      parse(["build", "talk/slides.md", "--out", "site", "--base", "./"]),
      CONFIG,
    );

    const { html, css } = site(join(root, "site"));
    expect(html).toContain('src="./assets/');
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
