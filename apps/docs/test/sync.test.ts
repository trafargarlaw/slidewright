import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { icons } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import {
  codeLines,
  ICONS,
  packageManagerTabs,
  PAGES,
  REPOSITORY,
  rewriteLinks,
  sync,
  toManagers,
  toPage,
} from "../lib/sync";
import { anchors, prose } from "./markdown";

const site = fileURLToPath(new URL("..", import.meta.url));
const repository = join(site, "..", "..");

describe("toPage", () => {
  it("takes the title from the first heading", () => {
    const page = toPage("docs/guide.md", "# The guide\n\nText.\n", {
      description: "About it",
      icon: "Map",
    });
    expect(page).toBe(
      [
        "---",
        "# Generated from docs/guide.md. Edit that file instead.",
        'title: "The guide"',
        'description: "About it"',
        "icon: Map",
        "---",
        "",
        "Text.",
        "",
      ].join("\n"),
    );
  });

  it("shows npm commands in a tab for each package manager", () => {
    const page = toPage("a.md", "# A\n\n```sh\nnpm install x\n```\n");
    expect(page).toContain('```sh tab="npm" tab-group="package-manager"');
  });

  it("quotes titles that YAML would read otherwise", () => {
    expect(toPage("a.md", "# @scope/name: a #tag\n")).toContain(
      'title: "@scope/name: a #tag"',
    );
  });

  it("reads files checked out with CRLF line endings", () => {
    expect(toPage("a.md", "# Title\r\n\r\n```md\r\n[a](b.md)\r\n```\r\n")).toBe(
      toPage("a.md", "# Title\n\n```md\n[a](b.md)\n```\n"),
    );
  });

  it("needs a heading on the first line", () => {
    expect(() => toPage("a.md", "Text first\n\n# Heading\n")).toThrow(
      "a.md doesn't start with a # heading.",
    );
  });
});

describe("rewriteLinks", () => {
  const rewrite = (markdown: string) =>
    rewriteLinks(markdown, "packages/react/README.md");

  it("points links to synced files at their pages", () => {
    expect(rewrite("See [steps](../../docs/syntax.md#steps).")).toBe(
      "See [steps](/docs/reference/syntax#steps).",
    );
    expect(rewrite("[Roadmap](../../docs/ROADMAP.md)")).toBe(
      "[Roadmap](/docs/roadmap)",
    );
  });

  it("points links to a package folder at its README's page", () => {
    expect(rewrite("[cli](../cli) and [core](../core/#api)")).toBe(
      "[cli](/docs/reference/cli) and [core](/docs/reference/core#api)",
    );
  });

  it("points other files at GitHub", () => {
    expect(rewrite("[source](src/deck.tsx)")).toBe(
      `[source](${REPOSITORY}/blob/master/packages/react/src/deck.tsx)`,
    );
    expect(rewrite("![Overview](../../docs/overview.png)")).toBe(
      `![Overview](${REPOSITORY}/blob/master/docs/overview.png?raw=true)`,
    );
  });

  it("keeps URLs, site paths and anchors", () => {
    const markdown =
      "[a](https://example.com/x.md) [b](mailto:a@b.c) [c](/docs) [d](#usage)";
    expect(rewrite(markdown)).toBe(markdown);
  });

  it("keeps titles and bracketed link text", () => {
    expect(rewrite('[the [`Deck`] docs](../core "Core")')).toBe(
      '[the [`Deck`] docs](/docs/reference/core "Core")',
    );
  });

  it("leaves code alone", () => {
    const markdown = [
      "`[a](b.md)` and ``[c](`d`.md)``",
      "````md",
      "[a](b.md)",
      "```",
      "[still code](b.md)",
      "````",
      "~~~",
      "[a](b.md)",
      "~~~ts",
      "[still code](b.md)",
      "~~~",
      "[after](../cli)",
    ].join("\n");
    expect(rewrite(markdown)).toBe(
      markdown.replace("[after](../cli)", "[after](/docs/reference/cli)"),
    );
  });
});

describe("toManagers", () => {
  it("writes npm commands for each package manager", () => {
    expect(toManagers("npm install --save-dev @slidewright/cli")).toEqual({
      npm: "npm install --save-dev @slidewright/cli",
      pnpm: "pnpm add --save-dev @slidewright/cli",
      yarn: "yarn add --dev @slidewright/cli",
      bun: "bun add --dev @slidewright/cli",
    });
    expect(toManagers("npm install mermaid")?.pnpm).toBe("pnpm add mermaid");
    expect(toManagers("npm install")?.yarn).toBe("yarn install");
    expect(toManagers("npm run dev")?.bun).toBe("bun run dev");
    expect(toManagers("npm create @slidewright my-talk")?.bun).toBe(
      "bun create @slidewright my-talk",
    );
    expect(toManagers("cd my-talk")?.pnpm).toBe("cd my-talk");
  });

  it("leaves other commands alone", () => {
    expect(toManagers("npx slidewright build")).toBeUndefined();
    expect(toManagers("npm install -g x")).toBeUndefined();
    expect(toManagers("npm ci")).toBeUndefined();
    expect(toManagers("")).toBeUndefined();
  });
});

describe("packageManagerTabs", () => {
  it("makes a tab for each package manager", () => {
    expect(packageManagerTabs("```sh\ncd talk\nnpm install\n```")).toBe(
      [
        '```sh tab="npm" tab-group="package-manager"',
        "cd talk",
        "npm install",
        "```",
        "",
        '```sh tab="pnpm"',
        "cd talk",
        "pnpm install",
        "```",
        "",
        '```sh tab="yarn"',
        "cd talk",
        "yarn install",
        "```",
        "",
        '```sh tab="bun"',
        "cd talk",
        "bun install",
        "```",
      ].join("\n"),
    );
  });

  it("leaves blocks with other commands, and other code, alone", () => {
    const markdown = [
      "```sh",
      "npm install x",
      "npx slidewright",
      "```",
      "````md",
      "```sh",
      "npm install x",
      "```",
      "````",
      "```ts",
      "npm install x",
      "```",
    ].join("\n");
    expect(packageManagerTabs(markdown)).toBe(markdown);
  });
});

describe("codeLines", () => {
  it("marks fenced blocks and their fences", () => {
    const lines = [
      "a",
      "```ts",
      "```js",
      "````",
      "b",
      "~~~",
      "```",
      "~~~",
      "c",
    ];
    expect(codeLines(lines)).toEqual([
      false,
      true,
      true,
      true,
      false,
      true,
      true,
      true,
      false,
    ]);
  });
});

describe("sync", () => {
  let target: string | undefined;
  afterEach(() => {
    if (target) rmSync(target, { recursive: true, force: true });
  });

  it("writes every page and asset, and returns the files it read", () => {
    target = mkdtempSync(join(tmpdir(), "slidewright-docs-"));
    const read = sync(repository, target).map((file) =>
      relative(repository, file).replaceAll(sep, "/"),
    );

    expect(read).toEqual([
      ...Object.values(PAGES),
      "examples/layouts/hills.svg",
    ]);
    for (const route of Object.keys(PAGES)) {
      expect(existsSync(join(target, "content/docs", `${route}.md`))).toBe(
        true,
      );
    }
    expect(existsSync(join(target, "public/docs/examples/hills.svg"))).toBe(
      true,
    );
  });

  it("gives every page a description", () => {
    target = mkdtempSync(join(tmpdir(), "slidewright-docs-"));
    sync(repository, target);
    for (const route of Object.keys(PAGES)) {
      expect(
        readFileSync(join(target, "content/docs", `${route}.md`), "utf8"),
        route,
      ).toMatch(/^description: ".+"$/m);
    }
  });

  it("gives every page an icon that Lucide has", () => {
    const pages = sitePages();
    for (const [route, markdown] of pages) {
      if (!route) continue;
      const icon = /^icon: (\w+)$/m.exec(markdown)?.[1];
      expect(icon && icon in icons, route).toBe(true);
    }
    expect(Object.keys(ICONS)).toEqual(Object.keys(PAGES));
  });

  it("leaves unchanged files alone", () => {
    target = mkdtempSync(join(tmpdir(), "slidewright-docs-"));
    const page = join(target, "content/docs/reference/react.md");
    sync(repository, target);
    const written = statSync(page).mtimeMs;
    sync(repository, target);
    expect(statSync(page).mtimeMs).toBe(written);
  });
});

// The site's pages, by path: the home page, the synced pages, and the ones
// written for the site.
function sitePages(): Map<string, string> {
  const pages = new Map<string, string>([
    ["", readFileSync(join(site, "app", "(home)", "page.tsx"), "utf8")],
  ]);
  for (const [route, source] of Object.entries(PAGES)) {
    pages.set(
      `docs/${route}`,
      toPage(source, readFileSync(join(repository, source), "utf8"), {
        icon: ICONS[route],
      }),
    );
  }
  const docs = join(site, "content", "docs");
  for (const file of readdirSync(docs, { recursive: true, encoding: "utf8" })) {
    if (!file.endsWith(".mdx")) continue;
    const route = file
      .replaceAll(sep, "/")
      .replace(/(^|\/)index\.mdx$/, "")
      .replace(/\.mdx$/, "");
    pages.set(
      posix.join("docs", route),
      readFileSync(join(docs, file), "utf8"),
    );
  }
  return pages;
}

describe("site links", () => {
  const pages = sitePages();

  it.each([...pages])(
    "every link on /%s goes to a page and heading",
    (route, markdown) => {
      const text = prose(markdown).join("\n");
      const links = [
        ...text.matchAll(/\]\(([/#][^)\s]*)/g),
        ...text.matchAll(/href="(\/[^"]*)"/g),
      ].map((match) => match[1]!);

      const broken = links.filter((link) => {
        const [path = "", hash] = link.split("#");
        const target = path ? path.replace(/^\/|\/$/g, "") : route;
        const page = pages.get(target);
        return !page || (hash !== undefined && !anchors(page).has(hash));
      });
      expect(broken).toEqual([]);
    },
  );

  it("has links to check", () => {
    const links = [...pages.values()].join("\n").match(/\]\(\/[a-z]/g);
    expect(links?.length).toBeGreaterThan(10);
  });
});
