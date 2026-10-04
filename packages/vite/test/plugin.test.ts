import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  build,
  createServer,
  defaultClientConditions,
  type InlineConfig,
  type ViteDevServer,
} from "vite";
import { slidewright, type SlidewrightOptions } from "../src/index";

const DECK = `---
title: Plugin <test> & co
---

# Hello from the plugin

---

# Second slide
`;

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "slidewright-vite-"));
  writeFileSync(join(root, "slides.md"), DECK);
  writeFileSync(
    join(root, "style.css"),
    "[data-deck] { --deck-accent: #e11d48; }\n",
  );
});

afterEach(() => {
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
    expect(result?.code).toContain('from "/slides.md?import&raw"');
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

  it("fails clearly when the deck file is missing", async () => {
    await expect(serve({ deck: "missing.md" })).rejects.toThrow(
      /Deck file not found: .*missing\.md/,
    );
  });
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
    expect(html).toMatch(
      /<script type="module" crossorigin src="\/assets\/index-[\w-]+\.js">/,
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
});
