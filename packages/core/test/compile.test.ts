import type { Element, Root } from "hast";
import { toHtml } from "hast-util-to-html";
import { describe, expect, it } from "vitest";
import {
  compileSlide,
  createCompiler,
  getHighlightedLines,
  parseDeck,
  parseHighlights,
} from "../src";

const html = (markdown: string) => toHtml(compileSlide(markdown).tree);

function findAll(tree: Root | Element, test: (el: Element) => boolean) {
  const found: Element[] = [];
  const walk = (node: Root | Element) => {
    for (const child of node.children) {
      if (child.type !== "element") continue;
      if (test(child)) found.push(child);
      walk(child);
    }
  };
  walk(tree);
  return found;
}

describe("markdown", () => {
  it("supports GFM and maths", () => {
    const out = html(
      "| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n\n~~gone~~ $x^2$",
    );
    expect(out).toContain("<table>");
    expect(out).toContain('type="checkbox"');
    expect(out).toContain("<del>gone</del>");
    expect(out).toContain("language-math");
  });
});

describe("steps", () => {
  it("reveals content after each step marker", () => {
    const { tree, steps } = compileSlide(
      "# Title\n\n<!-- step -->\n\nFirst\n\n<!-- step -->\n\nSecond\n\nStill second",
    );
    expect(steps).toBe(2);
    const stepped = findAll(tree, (el) => el.properties.dataStep !== undefined);
    expect(
      stepped.map((el) => [toHtml(el.children), el.properties.dataStep]),
    ).toEqual([
      ["First", 1],
      ["Second", 2],
      ["Still second", 2],
    ]);
    expect(toHtml(tree)).not.toContain("<!--");
  });

  it("assigns steps inside raw HTML containers and inline", () => {
    const { tree, steps } = compileSlide(
      '<div class="grid">\n\nLeft\n\n<!-- step -->\n\nRight\n\n</div>\n\nA <!-- step --> B',
    );
    expect(steps).toBe(2);
    expect(toHtml(tree)).toBe(
      '<div class="grid">\n<p>Left</p>\n\n<p data-step="1">Right</p>\n</div>\n<p>A <span data-step="2"> B</span></p>',
    );
  });

  it("supports explicit step numbers without moving the counter", () => {
    const { tree, steps } = compileSlide(
      "<!-- step 3 -->\n\nThird\n\n<!-- step -->\n\nFirst",
    );
    expect(steps).toBe(3);
    expect(
      findAll(tree, (el) => el.tagName === "p").map(
        (el) => el.properties.dataStep,
      ),
    ).toEqual([3, 1]);
  });

  it("lets frontmatter override the step count", () => {
    const deck = parseDeck("---\nsteps: 5\n---\n\nA\n\n<!-- step -->\n\nB");
    expect(compileSlide(deck.slides[0]!).steps).toBe(5);
  });
});

describe("code blocks", () => {
  const codeOf = (markdown: string) => {
    const { tree, steps } = compileSlide(markdown);
    const [code] = findAll(tree, (el) => el.tagName === "code");
    return { code: code!, steps };
  };

  it("records language, title and line numbers", () => {
    const { code } = codeOf('```ts lines=10 title="app.ts"\nlet a\n```');
    expect(code.properties).toMatchObject({
      className: ["language-ts"],
      dataLang: "ts",
      // Raw HTML parsing turns attribute values into strings.
      dataLineNumbers: "10",
      dataTitle: "app.ts",
    });
  });

  it("turns highlight ranges into steps", () => {
    const { code, steps } = codeOf("```ts {1|2-3|all}\na\nb\nc\n```");
    expect(steps).toBe(2);
    expect(code.properties.dataHighlights).toBe("0:1|1:2-3|2:all");

    const ranges = parseHighlights(String(code.properties.dataHighlights));
    expect(getHighlightedLines(ranges, 0)).toEqual(new Set([1]));
    expect(getHighlightedLines(ranges, 1)).toEqual(new Set([2, 3]));
    expect(getHighlightedLines(ranges, 7)).toBe("all");
  });

  it("starts highlights when the block is revealed and continues the count", () => {
    const { code, steps } = codeOf(
      "Intro\n\n<!-- step -->\n\n```ts {1|2}\na\nb\n```\n\n<!-- step -->\n\nAfter",
    );
    expect(code.properties.dataHighlights).toBe("1:1|2:2");
    expect(steps).toBe(3);
  });

  it("supports explicit highlight steps", () => {
    const { code, steps } = codeOf("```ts {1@2|2@4}\na\nb\n```");
    expect(code.properties.dataHighlights).toBe("2:1|4:2");
    expect(steps).toBe(4);
    const ranges = parseHighlights(String(code.properties.dataHighlights));
    expect(getHighlightedLines(ranges, 1)).toBeNull();
  });

  it("treats a single range as a static highlight", () => {
    const { code, steps } = codeOf("```ts {2,4}\na\nb\nc\nd\n```");
    expect(code.properties.dataHighlights).toBe("0:2,4");
    expect(steps).toBe(0);
  });

  it("moves diff markers out of the code", () => {
    const { code } = codeOf("```ts diff {2}\nlet a\n-a = 1\n+a = 2\n```");
    expect(code.properties).toMatchObject({
      dataDiff: "added:3|removed:2",
      // Removed lines count towards highlight ranges.
      dataHighlights: "0:2",
    });
    expect(toHtml(code.children)).toBe("let a\na = 1\na = 2\n");
  });

  it("keeps + and - in code without diff", () => {
    const { code } = codeOf("```ts\n-a\n+b\n```");
    expect(code.properties.dataDiff).toBeUndefined();
    expect(toHtml(code.children)).toBe("-a\n+b\n");
  });
});

describe("directives", () => {
  it("turns block directives into tagged divs", () => {
    const { tree } = compileSlide(
      ':::left{.wide #intro tone="calm"}\nHello\n:::\n\n::youtube{id=abc}',
    );
    const [left, youtube] = findAll(
      tree,
      (el) => "dataDirective" in el.properties,
    );
    expect(left!.properties).toMatchObject({
      dataDirective: "left",
      dataDirectiveKind: "container",
      className: ["wide"],
      id: "user-content-intro",
      dataDirectiveAttributes: '{"class":"wide","id":"intro","tone":"calm"}',
    });
    expect(youtube!.properties).toMatchObject({
      dataDirective: "youtube",
      dataDirectiveKind: "leaf",
      dataDirectiveAttributes: '{"id":"abc"}',
    });
  });

  it("leaves inline colons in prose untouched", () => {
    expect(html("Note:this at 10:30 and :smile:")).toBe(
      "<p>Note:this at 10:30 and :smile:</p>",
    );
  });
});

describe("sanitising", () => {
  const dangerous =
    '<script>alert(1)</script><img src="x.png" onerror="alert(1)"><a href="javascript:alert(1)">x</a><iframe src="https://example.com"></iframe>';

  it("removes scripts, handlers, iframes and javascript: URLs by default", () => {
    const out = html(dangerous);
    expect(out).not.toMatch(/script|onerror|javascript|iframe/);
  });

  it("keeps classes, styles and data attributes", () => {
    expect(
      html('<div class="flex gap-4" style="color: red" data-x="1">Hi</div>'),
    ).toBe('<div class="flex gap-4" style="color: red" data-x="1">Hi</div>');
  });

  it("can be turned off for trusted decks", () => {
    const compile = createCompiler({ sanitize: false });
    expect(toHtml(compile(dangerous).tree)).toContain("<iframe");
  });
});
