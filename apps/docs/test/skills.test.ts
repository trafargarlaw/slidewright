import { createCompiler, parseDeck } from "@slidewright/core";
import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REFERENCES, SKILL, toReference } from "../lib/skills";
import { codeLines, REPOSITORY } from "../lib/sync";
import { anchors, prose } from "./markdown";

const repository = fileURLToPath(new URL("../../..", import.meta.url));

// Checkouts with core.autocrlf have CRLF line endings.
const read = (file: string) =>
  readFileSync(join(repository, file), "utf8").replaceAll("\r\n", "\n");

const skill = read(`${SKILL}/SKILL.md`);

/** The fenced code blocks of `markdown` in the language `language`. */
function examples(markdown: string, language: string): string[] {
  const blocks: string[] = [];
  let fence: string | undefined;
  let block: string[] | undefined;
  for (const line of markdown.split("\n")) {
    const [, marker, info = ""] = /^(`{3,})(.*)$/.exec(line) ?? [];
    if (!fence) {
      if (marker === undefined) continue;
      fence = marker;
      block = info.trim() === language ? [] : undefined;
    } else if (marker && marker.length >= fence.length && !info.trim()) {
      if (block) blocks.push(block.join("\n"));
      fence = undefined;
    } else {
      block?.push(line);
    }
  }
  return blocks;
}

/** The text under a heading, up to the next heading outside code. */
function section(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const code = codeLines(lines);
  const start = lines.findIndex((line, i) => !code[i] && line === heading);
  if (start === -1) throw new Error(`No heading "${heading}".`);
  const end = lines.findIndex(
    (line, i) => i > start && !code[i] && /^#{1,6} /.test(line),
  );
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

/** The names in the first column of the table rows of `markdown`. */
function firstColumn(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .flatMap((line) =>
      [...line.split("|")[1]!.matchAll(/`([^`]+)`/g)].map((name) => name[1]!),
    );
}

describe("toReference", () => {
  it("points links to the other reference files, and to GitHub", () => {
    const reference = toReference(
      "packages/cli/README.md",
      "# CLI\n\n[syntax](../../docs/syntax.md#steps), [vite](../vite) and [core](../core/README.md).\n",
    );
    expect(reference).toBe(
      [
        "<!-- A copy of packages/cli/README.md in the Slidewright repository, written by `bun run skills`. -->",
        "",
        "# CLI",
        "",
        `[syntax](syntax.md#steps), [vite](vite.md) and [core](${REPOSITORY}/blob/master/packages/core/README.md).`,
        "",
      ].join("\n"),
    );
  });
});

describe("the slidewright skill", () => {
  it("has the name of its folder, and a description", () => {
    const [, name, description] =
      /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(skill) ?? [];
    expect(name).toBe(posix.basename(SKILL));
    expect(name).toMatch(/^[a-z\d]+(-[a-z\d]+)*$/);
    // The limit of the Agent Skills format.
    expect(description!.length).toBeGreaterThan(0);
    expect(description!.length).toBeLessThanOrEqual(1024);
  });

  it.each(Object.entries(REFERENCES))(
    "has %s as the docs have it",
    (name, source) => {
      expect(
        read(`${SKILL}/references/${name}`),
        "Run `bun run skills` to write the reference files again.",
      ).toBe(toReference(source, read(source)));
    },
  );

  it.each([
    "SKILL.md",
    ...Object.keys(REFERENCES).map((name) => `references/${name}`),
  ])("has links in %s that go to a file and heading", (file) => {
    const text = prose(read(`${SKILL}/${file}`)).join("\n");
    const links = [...text.matchAll(/\]\(([^)\s]+)/g)]
      .map((match) => match[1]!)
      .filter((link) => !/^[a-z][a-z\d+.-]*:/i.test(link));

    const broken = links.filter((link) => {
      const [path = "", hash] = link.split("#");
      const target = path
        ? posix.join(SKILL, posix.dirname(file), path)
        : `${SKILL}/${file}`;
      if (!existsSync(join(repository, target))) return true;
      return hash !== undefined && !anchors(read(target)).has(hash);
    });
    expect(broken).toEqual([]);
  });

  it("has example decks without problems", () => {
    const compile = createCompiler();
    const decks = examples(skill, "md");
    expect(decks.length).toBeGreaterThan(0);
    const layouts = firstColumn(section(skill, "### Layouts"));

    for (const source of decks) {
      const deck = parseDeck(source);
      expect(deck.diagnostics, source).toEqual([]);
      for (const slide of deck.slides) {
        expect(layouts, source).toContain(slide.layout);
        expect(() => compile(slide), source).not.toThrow();
      }
    }
    expect(parseDeck(decks[0]!).slides.map((slide) => slide.layout)).toEqual([
      "cover",
      "default",
      "two-cols",
      "default",
      "fact",
    ]);
  });

  // A formatter that reads a deck as Markdown puts a blank line after the
  // `---` of a slide, and the parser has nothing to report: the keys are
  // the text of a slide.
  it.each(["SKILL.md", "references/syntax.md"])(
    "has no frontmatter that became text in the examples of %s",
    (file) => {
      const text = examples(read(`${SKILL}/${file}`), "md")
        .flatMap((source) => parseDeck(source).slides)
        .map((slide) => slide.content.trimStart().split("\n")[0]!)
        .filter((line) =>
          /^(layout|src|class|title|transition|image|steps)[ \t]*:/.test(line),
        );
      expect(text).toEqual([]);
    },
  );

  it("lists the layouts of the renderer", () => {
    const layouts = firstColumn(
      section(read("packages/react/README.md"), "## Layouts"),
    );
    expect(layouts.length).toBeGreaterThan(0);
    expect(firstColumn(section(skill, "### Layouts")).sort()).toEqual(
      layouts.sort(),
    );
  });

  it("names the transitions of the theme", () => {
    const transitions = firstColumn(
      section(read("docs/syntax.md"), "## Transitions"),
    ).filter((name) => name !== "none");
    expect(transitions.length).toBeGreaterThan(0);
    for (const name of transitions) {
      expect(section(skill, "### Slides and settings")).toContain(
        `\`${name}\``,
      );
    }
  });
});
