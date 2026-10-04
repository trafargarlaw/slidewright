import GithubSlugger from "github-slugger";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  codeLines,
  PAGES,
  REPOSITORY,
  rewriteLinks,
  sync,
  toPage,
} from "../src/sync";

const site = fileURLToPath(new URL("..", import.meta.url));
const repository = join(site, "..", "..");

describe("toPage", () => {
  it("takes the title from the first heading", () => {
    const page = toPage("docs/guide.md", "# The guide\n\nText.\n", "About it");
    expect(page).toBe(
      [
        "---",
        "# Generated from docs/guide.md. Edit that file instead.",
        'title: "The guide"',
        'description: "About it"',
        `editUrl: ${REPOSITORY}/edit/master/docs/guide.md`,
        "---",
        "",
        "Text.",
        "",
      ].join("\n"),
    );
  });

  it("quotes titles that YAML would read otherwise", () => {
    expect(toPage("a.md", "# @scope/name: a #tag\n")).toContain(
      'title: "@scope/name: a #tag"',
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
      "See [steps](/reference/syntax/#steps).",
    );
    expect(rewrite("[Roadmap](../../docs/ROADMAP.md)")).toBe(
      "[Roadmap](/roadmap/)",
    );
  });

  it("points links to a package folder at its README's page", () => {
    expect(rewrite("[cli](../cli) and [core](../core/#api)")).toBe(
      "[cli](/reference/cli/) and [core](/reference/core/#api)",
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
      "[a](https://example.com/x.md) [b](mailto:a@b.c) [c](/start/) [d](#usage)";
    expect(rewrite(markdown)).toBe(markdown);
  });

  it("keeps titles and bracketed link text", () => {
    expect(rewrite('[the [`Deck`] docs](../core "Core")')).toBe(
      '[the [`Deck`] docs](/reference/core/ "Core")',
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
      markdown.replace("[after](../cli)", "[after](/reference/cli/)"),
    );
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
    mkdirSync(join(target, "public"));
    const read = sync(repository, target).map((file) =>
      relative(repository, file),
    );

    expect(read).toEqual([
      ...Object.values(PAGES),
      "examples/layouts/public/hills.svg",
    ]);
    for (const route of Object.keys(PAGES)) {
      expect(existsSync(join(target, "src/content/docs", `${route}.md`))).toBe(
        true,
      );
    }
    expect(existsSync(join(target, "public/hills.svg"))).toBe(true);
    expect(
      readFileSync(join(target, "src/content/docs/reference/react.md"), "utf8"),
    ).toMatch(/^description: ".+"$/m);
  });
});

// The site's pages, by route: the synced ones, and the ones written for it.
function sitePages(): Map<string, string> {
  const pages = new Map<string, string>();
  for (const [route, source] of Object.entries(PAGES)) {
    pages.set(
      route,
      toPage(source, readFileSync(join(repository, source), "utf8")),
    );
  }
  const docs = join(site, "src", "content", "docs");
  for (const file of readdirSync(docs, { recursive: true, encoding: "utf8" })) {
    if (!file.endsWith(".mdx")) continue;
    const route = file.replace(/\.mdx$/, "").replace(/^index$/, "");
    pages.set(route, readFileSync(join(docs, file), "utf8"));
  }
  return pages;
}

/** The lines of `markdown` outside fenced code blocks, without code spans. */
function prose(markdown: string): string[] {
  const lines = markdown.split("\n");
  const code = codeLines(lines);
  return lines
    .filter((_, index) => !code[index])
    .map((line) => line.replace(/(?<!`)(`+)(?!`).*?(?<!`)\1(?!`)/g, ""));
}

/** The ids Starlight gives to the headings of a page. */
function anchors(markdown: string): Set<string> {
  const slugger = new GithubSlugger();
  const ids = new Set<string>();
  for (const line of prose(markdown)) {
    const heading = /^#{2,6} (.+)/.exec(line);
    if (heading) {
      const text = heading[1]!.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
      ids.add(slugger.slug(text));
    }
  }
  return ids;
}

describe("site links", () => {
  const pages = sitePages();

  it.each([...pages])(
    "every link on /%s goes to a page and heading",
    (route, markdown) => {
      const text = prose(markdown).join("\n");
      const links = [
        ...text.matchAll(/\]\(([/#][^)\s]*)/g),
        ...text.matchAll(/^\s+link: (\/\S*)$/gm),
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
