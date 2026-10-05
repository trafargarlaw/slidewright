import { describe, expect, it } from "vitest";
import { getSlideAtLine, parseDeck } from "../src";

const text = (strings: TemplateStringsArray) =>
  strings.join("").replace(/^\n/, "");

describe("splitting", () => {
  it("splits slides on --- lines", () => {
    const deck = parseDeck(text`
# One

---

# Two

---

# Three
`);
    expect(deck.slides.map((s) => s.content)).toEqual([
      "# One",
      "# Two",
      "# Three",
    ]);
    expect(deck.diagnostics).toEqual([]);
  });

  it("ignores --- inside fenced code", () => {
    const deck = parseDeck(text`
# YAML

\`\`\`yaml
---
a: 1
---
\`\`\`

~~~md
---
~~~

---

# Next
`);
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]!.content).toContain("a: 1");
  });

  it("does not let an unclosed fence swallow the rest of the deck", () => {
    const deck = parseDeck(text`
# One

\`\`\`ts
const half = "typed

---

# Two
`);
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[1]!.content).toBe("# Two");
  });

  it("drops trailing separators but keeps empty slides in the middle", () => {
    const deck = parseDeck(text`
# One

---

---

# Three

---
`);
    expect(deck.slides.map((s) => s.content)).toEqual(["# One", "", "# Three"]);
  });

  it("returns no slides for an empty file", () => {
    expect(parseDeck("").slides).toEqual([]);
    expect(parseDeck("\n\n").slides).toEqual([]);
  });
});

describe("frontmatter", () => {
  it("reads per-slide frontmatter with nested YAML", () => {
    const deck = parseDeck(text`
# Intro

---
layout: two-cols
class: [dense, dark]
background:
  image: /bg.png
  dim: 0.4
---

# Compare
`);
    const slide = deck.slides[1]!;
    expect(slide.layout).toBe("two-cols");
    expect(slide.frontmatter).toEqual({
      layout: "two-cols",
      class: ["dense", "dark"],
      background: { image: "/bg.png", dim: 0.4 },
    });
    expect(slide.content).toBe("# Compare");
  });

  it("treats a leading block as headmatter for the deck and first slide", () => {
    const deck = parseDeck(text`
---
title: My talk
theme: midnight
aspectRatio: 4/3
layout: cover
defaults:
  class: roomy
---

# Hello

---

# Second
`);
    expect(deck.config).toMatchObject({
      title: "My talk",
      theme: "midnight",
      aspectRatio: 4 / 3,
      defaults: { class: "roomy" },
    });
    expect(deck.slides[0]!.frontmatter).toEqual({
      class: "roomy",
      title: "My talk",
      layout: "cover",
    });
    expect(deck.slides[1]!.frontmatter).toEqual({ class: "roomy" });
  });

  it("lets content start with `Word:` after a blank line", () => {
    const deck = parseDeck(text`
# One

---

Note: this is content

---

# Three
`);
    expect(deck.slides).toHaveLength(3);
    expect(deck.slides[1]!.content).toBe("Note: this is content");
    expect(deck.slides[1]!.frontmatter).toEqual({});
  });

  it("reports invalid YAML without breaking the rest of the deck", () => {
    const deck = parseDeck(text`
# One

---
layout: center
title: "unterminated
---

# Two

---

# Three
`);
    expect(deck.slides).toHaveLength(3);
    expect(deck.slides[1]!.content).toBe("# Two");
    expect(deck.diagnostics).toHaveLength(1);
    expect(deck.diagnostics[0]).toMatchObject({ severity: "error", slide: 1 });
  });

  it("falls back to defaults for invalid config values", () => {
    const deck = parseDeck(text`
---
aspectRatio: wide
colorScheme: purple
---

# Hi
`);
    expect(deck.config.aspectRatio).toBeCloseTo(16 / 9);
    expect(deck.config.colorScheme).toBe("light");
    expect(deck.diagnostics.map((d) => d.severity)).toEqual([
      "warning",
      "warning",
    ]);
  });

  it("warns about a canvas width that is not a finite number", () => {
    const deck = parseDeck("---\ncanvasWidth: .inf\n---\n\n# Hi\n");
    expect(deck.config.canvasWidth).toBe(980);
    expect(deck.diagnostics).toEqual([
      {
        severity: "warning",
        message: "`canvasWidth` must be a positive number.",
        line: 2,
        slide: 0,
      },
    ]);
  });

  it("warns about a steps value that is not a number of 0 or more", () => {
    const deck = parseDeck(text`
# One

---
steps: many
---

# Two

---
steps: 2
---

# Three
`);
    expect(deck.diagnostics).toEqual([
      {
        severity: "warning",
        message: "`steps` must be a number of 0 or more.",
        line: 4,
        slide: 1,
      },
    ]);
  });

  it("does not treat frontmatter-like text at the end of the file as frontmatter", () => {
    const deck = parseDeck(text`
# One

---
key: value
`);
    expect(deck.slides[1]!.content).toBe("key: value");
  });
});

describe("code fence diagnostics", () => {
  it("reports highlight stages and line numbers that would be skipped", () => {
    const deck = parseDeck(text`
# One

\`\`\`ts {1|3-x|all}
const a = 1;
\`\`\`

---

# Two

~~~py {2||4@two} lines=ten
print(1)
~~~
`);
    expect(deck.diagnostics).toEqual([
      {
        severity: "warning",
        message:
          "`3-x` in `{1|3-x|all}` is not a line range. Use line numbers, ranges such as `3-5`, or `all`, with an optional `@step`.",
        line: 3,
        slide: 0,
      },
      {
        severity: "warning",
        message: "`{2||4@two}` has an empty stage between `|` signs.",
        line: 11,
        slide: 1,
      },
      {
        severity: "warning",
        message:
          "`4@two` in `{2||4@two}` is not a line range. Use line numbers, ranges such as `3-5`, or `all`, with an optional `@step`.",
        line: 11,
        slide: 1,
      },
      {
        severity: "warning",
        message: "`lines=ten` must be a whole number, such as `lines=10`.",
        line: 11,
        slide: 1,
      },
    ]);
  });

  it("accepts valid meta, and ignores fences that are not closed or are inside code", () => {
    const deck = parseDeck(text`
\`\`\`\`md
\`\`\`ts {nope}
\`\`\`
\`\`\`\`

\`\`\`ts {1,3-5@2|all} lines=10 title="a.ts" diff
x
\`\`\`

\`\`\`ts {half
`);
    expect(deck.diagnostics).toEqual([]);
  });
});

describe("notes", () => {
  it("extracts notes comments from anywhere in the slide", () => {
    const deck = parseDeck(text`
# Title

<!-- notes
  Say hello.

  Then pause.
-->

Body text

<!-- notes Mention the demo. -->
`);
    const slide = deck.slides[0]!;
    expect(slide.notes).toBe("Say hello.\n\nThen pause.\n\nMention the demo.");
    expect(slide.content).toBe("# Title\n\n\nBody text");
  });

  it("leaves notes comments inside code alone", () => {
    const deck = parseDeck(text`
\`\`\`html
<!-- notes not really -->
\`\`\`
`);
    expect(deck.slides[0]!.notes).toBe("");
    expect(deck.slides[0]!.content).toContain("<!-- notes not really -->");
  });

  it("keeps other HTML comments in the content", () => {
    const deck = parseDeck("# A\n\n<!-- step -->\n\nB");
    expect(deck.slides[0]!.content).toContain("<!-- step -->");
  });
});

describe("titles and ranges", () => {
  it("uses the frontmatter title, then the first heading", () => {
    const deck = parseDeck(text`
\`\`\`md
# Not this
\`\`\`

## The **real** title

---
title: Explicit
---

# Ignored
`);
    expect(deck.slides.map((s) => s.title)).toEqual([
      "The real title",
      "Explicit",
    ]);
  });

  it("records 1-based line ranges and maps lines back to slides", () => {
    const source = text`
---
title: Deck
---

# One

---
layout: center
---

# Two
`;
    const deck = parseDeck(source);
    expect(deck.slides.map((s) => s.range)).toEqual([
      { start: 1, end: 6 },
      { start: 7, end: 12 },
    ]);
    expect(deck.slides[1]!.frontmatterRange).toEqual({ start: 8, end: 8 });

    expect(getSlideAtLine(deck, 1)).toBe(0);
    expect(getSlideAtLine(deck, 6)).toBe(0);
    expect(getSlideAtLine(deck, 7)).toBe(1);
    expect(getSlideAtLine(deck, 99)).toBe(1);
  });
});
