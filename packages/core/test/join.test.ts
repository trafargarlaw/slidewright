import { describe, expect, it } from "vitest";
import { joinDeck, parseDeck, type JoinedDeck } from "../src";

const text = (strings: TemplateStringsArray) =>
  strings.join("").replace(/^\n/, "");

/** Joins `slides.md` of the given files. */
const join = (files: Record<string, string>) =>
  joinDeck("slides.md", { read: (file) => files[file] });

const contents = (joined: JoinedDeck) =>
  parseDeck(joined.source).slides.map((slide) => slide.content);

/** Where the first line of each slide's content comes from. */
const origins = (joined: JoinedDeck) => {
  const lines = joined.source.split("\n");
  return parseDeck(joined.source).slides.map((slide) => {
    const first = slide.content.split("\n")[0]!;
    const { file, line } = joined.locate(
      lines.indexOf(first, slide.range.start - 1) + 1,
    );
    return `${file}:${line}`;
  });
};

const MAIN = text`
---
title: Talk
theme: night
---

# Talk

---
src: chapters/intro.md
---

---

# Thanks
`;

const INTRO = text`
# Why

---

# How
`;

describe("joinDeck", () => {
  it("gives back a deck without `src` as it is", () => {
    const source = "---\ntitle: Talk\n---\n\n# One\n\n---\n\n# Two\n";
    const joined = join({ "slides.md": source });

    expect(joined.source).toBe(source);
    expect(joined.files).toEqual(["slides.md"]);
    expect(joined.locate(5)).toEqual({ file: "slides.md", line: 5 });
    expect(joined.diagnostics).toEqual([]);
  });

  it("puts the slides of a file in place of the slide with `src`", () => {
    const joined = join({ "slides.md": MAIN, "chapters/intro.md": INTRO });
    const deck = parseDeck(joined.source);

    expect(contents(joined)).toEqual(["# Talk", "# Why", "# How", "# Thanks"]);
    expect(deck.config.title).toBe("Talk");
    expect(deck.config.theme).toBe("night");
    expect(deck.diagnostics).toEqual([]);
    expect(joined.diagnostics).toEqual([]);
    expect(joined.files).toEqual(["slides.md", "chapters/intro.md"]);
  });

  it("tells which file and line each line comes from", () => {
    const joined = join({ "slides.md": MAIN, "chapters/intro.md": INTRO });

    expect(origins(joined)).toEqual([
      "slides.md:6",
      "chapters/intro.md:1",
      "chapters/intro.md:5",
      "slides.md:14",
    ]);
    // Lines outside the source are those of its ends.
    expect(joined.locate(0)).toEqual({ file: "slides.md", line: 1 });
    expect(joined.locate(1000).file).toBe("slides.md");
  });

  it("maps the problems of a slide to its file", () => {
    const joined = join({
      "slides.md": MAIN,
      "chapters/intro.md": text`
# Why

---
layout: [a
---

# How

<!-- notes
Never closed
`,
    });
    const problems = parseDeck(joined.source).diagnostics.map(
      ({ message, line }) => ({
        ...joined.locate(line),
        message: message.slice(0, 19),
      }),
    );

    expect(problems).toEqual([
      { file: "chapters/intro.md", line: 4, message: "Invalid frontmatter" },
      { file: "chapters/intro.md", line: 9, message: "Speaker notes are n" },
    ]);
  });

  it("resolves a path from the folder of its file", () => {
    const joined = join({
      "slides.md": "# One\n\n---\nsrc: ./chapters/intro.md\n---\n",
      "chapters/intro.md": "# Intro\n\n---\nsrc: ../shared/end.md\n---\n",
      "shared/end.md": "# End\n\n---\nsrc: /shared/links.md\n---\n",
      "/shared/links.md": "# Links\n",
    });

    expect(contents(joined)).toEqual(["# One", "# Intro", "# End", "# Links"]);
    expect(joined.files).toEqual([
      "slides.md",
      "chapters/intro.md",
      "shared/end.md",
      "/shared/links.md",
    ]);
  });

  it("asks the caller where a path leads, when it knows better", () => {
    const joined = joinDeck("C:\\talk\\slides.md", {
      read: (file) =>
        ({
          "C:\\talk\\slides.md": "---\nsrc: intro.md\n---\n",
          "C:\\talk|intro.md": "# Intro\n",
        })[file],
      resolve: (src, from) => `${from.slice(0, from.lastIndexOf("\\"))}|${src}`,
    });

    expect(contents(joined)).toEqual(["# Intro"]);
  });

  it("gives the other keys of the frontmatter to each slide of the file", () => {
    const joined = join({
      "slides.md": text`
# One

---
src: intro.md
layout: center
class: chapter
---
`,
      "intro.md": text`
# Why

---
layout: quote
---

# How
`,
    });
    const { slides, diagnostics } = parseDeck(joined.source);

    expect(slides.map((slide) => slide.frontmatter)).toEqual([
      {},
      { layout: "center", class: "chapter" },
      // A slide keeps what it sets.
      { layout: "quote", class: "chapter" },
    ]);
    expect(slides.map((slide) => slide.layout)).toEqual([
      "default",
      "center",
      "quote",
    ]);
    expect(diagnostics).toEqual([]);
    // The frontmatter of a slide is one place, whatever is written there.
    expect(joined.locate(slides[2]!.frontmatterRange!.start)).toEqual({
      file: "intro.md",
      line: 4,
    });
  });

  it("applies the `defaults` of an included file to its slides", () => {
    const joined = join({
      "slides.md": text`
---
theme: night
defaults:
  layout: center
  transition: fade
---

# One

---
src: intro.md
transition: slide
---

---

# Three
`,
      "intro.md": text`
---
title: Introduction
theme: day
aspectRatio: 4/3
defaults:
  layout: statement
  class: intro
---

# Why

---
class: loud
---

# How
`,
    });
    const deck = parseDeck(joined.source);

    // The deck settings of the included file are not those of the deck.
    expect(deck.config.theme).toBe("night");
    expect(deck.config.aspectRatio).toBe(16 / 9);
    expect(deck.config.title).toBeUndefined();
    expect(deck.slides.map((slide) => slide.frontmatter)).toEqual([
      { layout: "center", transition: "fade" },
      {
        layout: "statement",
        transition: "slide",
        class: "intro",
        title: "Introduction",
      },
      { layout: "statement", transition: "slide", class: "loud" },
      { layout: "center", transition: "fade" },
    ]);
    expect(deck.slides[1]!.title).toBe("Introduction");
    expect(deck.diagnostics).toEqual([]);
  });

  it("joins files that include files", () => {
    const joined = join({
      "slides.md": "---\nsrc: a.md\nclass: outer\n---\n",
      "a.md":
        "# A\n\n---\nsrc: b.md\nlayout: center\n---\n\n---\n\n# A again\n",
      "b.md": "# B\n",
    });
    const { slides } = parseDeck(joined.source);

    expect(slides.map((slide) => slide.content)).toEqual([
      "# A",
      "# B",
      "# A again",
    ]);
    expect(slides.map((slide) => slide.frontmatter)).toEqual([
      { class: "outer" },
      { class: "outer", layout: "center" },
      { class: "outer" },
    ]);
  });

  it("keeps the deck settings when the first slide has `src`", () => {
    const joined = join({
      "slides.md": text`
---
title: Talk
theme: night
defaults:
  layout: center
src: cover.md
class: cover
---

---

# Two
`,
      "cover.md": "---\nlayout: cover\n---\n\n# Welcome\n\n---\n\n# Agenda\n",
    });
    const deck = parseDeck(joined.source);

    expect(deck.config.title).toBe("Talk");
    expect(deck.config.theme).toBe("night");
    expect(deck.slides.map((slide) => slide.frontmatter)).toEqual([
      { layout: "cover", class: "cover", title: "Talk" },
      { layout: "center", class: "cover" },
      { layout: "center" },
    ]);
    expect(deck.diagnostics).toEqual([]);
    expect(joined.locate(1)).toEqual({ file: "cover.md", line: 1 });
  });

  it("keeps the deck settings when the file of the first slide is missing", () => {
    const joined = join({
      "slides.md": "---\ntitle: Talk\ntheme: night\nsrc: cover.md\n---\n",
    });
    const deck = parseDeck(joined.source);

    expect(deck.config.title).toBe("Talk");
    expect(deck.config.theme).toBe("night");
    expect(deck.slides.map((slide) => slide.content)).toEqual([""]);
    expect(joined.diagnostics).toHaveLength(1);
  });

  it("keeps content that starts like frontmatter as content", () => {
    const joined = join({
      "slides.md": "---\nsrc: a.md\n---\n\n---\nsrc: b.md\n---\n",
      "a.md": "Note: this is text\n",
      "b.md": "# B\n",
    });
    const { slides, diagnostics } = parseDeck(joined.source);

    expect(slides.map((slide) => slide.content)).toEqual([
      "Note: this is text",
      "# B",
    ]);
    expect(slides[0]!.frontmatter).toEqual({});
    expect(diagnostics).toEqual([]);
  });

  it("keeps the notes of the slides", () => {
    const joined = join({
      "slides.md": "---\nsrc: a.md\n---\n",
      "a.md": "# A\n\n<!-- notes\nSay hello.\n-->\n",
    });

    expect(parseDeck(joined.source).slides[0]!.notes).toBe("Say hello.");
  });

  it("reports a file that doesn't exist", () => {
    const joined = join({
      "slides.md":
        "# One\n\n---\nlayout: center\nsrc: chapters/intro.md\n---\n\n---\n\n# Two\n",
    });

    expect(contents(joined)).toEqual(["# One", "# Two"]);
    expect(joined.diagnostics).toEqual([
      {
        severity: "error",
        message:
          "No file `chapters/intro.md`: its slides are left out. The path is from the folder of this file.",
        line: 5,
        file: "slides.md",
      },
    ]);
    // So a tool can watch for the file.
    expect(joined.files).toEqual(["slides.md", "chapters/intro.md"]);
  });

  it("reports a file that includes itself", () => {
    const self = join({ "slides.md": "# One\n\n---\nsrc: slides.md\n---\n" });
    expect(contents(self)).toEqual(["# One"]);
    expect(self.diagnostics).toMatchObject([
      { severity: "error", line: 4, file: "slides.md" },
    ]);

    const loop = join({
      "slides.md": "# One\n\n---\nsrc: a.md\n---\n",
      "a.md": "# A\n\n---\nsrc: b.md\n---\n",
      "b.md": "# B\n\n---\nsrc: a.md\n---\n",
    });
    expect(contents(loop)).toEqual(["# One", "# A", "# B"]);
    expect(loop.diagnostics).toEqual([
      {
        severity: "error",
        message:
          "A file can't include itself, or a file that includes it. The slides of `a.md` are left out here.",
        line: 4,
        file: "b.md",
      },
    ]);
  });

  it("includes a file as often as it is asked for", () => {
    const joined = join({
      "slides.md": "---\nsrc: a.md\n---\n\n---\nsrc: a.md\n---\n",
      "a.md": "# A\n",
    });

    expect(contents(joined)).toEqual(["# A", "# A"]);
    expect(joined.files).toEqual(["slides.md", "a.md"]);
    expect(joined.diagnostics).toEqual([]);
  });

  it("warns about the content of a slide with `src`", () => {
    const joined = join({
      "slides.md": "---\nsrc: a.md\n---\n\n# Lost\n",
      "a.md": "# A\n",
    });

    expect(contents(joined)).toEqual(["# A"]);
    expect(joined.diagnostics).toEqual([
      {
        severity: "warning",
        message:
          "A slide with `src` shows the slides of that file, not its own content. Move this content to another slide.",
        line: 5,
        file: "slides.md",
      },
    ]);
  });

  it("warns about a `src` that is not a path", () => {
    const joined = join({ "slides.md": "---\nsrc: 12\n---\n\n# One\n" });

    expect(contents(joined)).toEqual(["# One"]);
    expect(joined.diagnostics).toEqual([
      {
        severity: "warning",
        message: "`src` must be the path of a Markdown file.",
        line: 2,
        file: "slides.md",
      },
    ]);
  });

  it("reports frontmatter that it has to write again", () => {
    const joined = join({
      "slides.md": "---\nsrc: a.md\nclass: chapter\n---\n",
      "a.md": "---\nlayout: [a\n---\n\n# A\n",
    });
    const { slides, diagnostics } = parseDeck(joined.source);

    expect(slides[0]!.frontmatter).toEqual({ class: "chapter" });
    expect(diagnostics).toEqual([]);
    expect(joined.diagnostics).toMatchObject([
      { severity: "error", line: 2, file: "a.md" },
    ]);
    expect(joined.diagnostics[0]!.message).toMatch(/^Invalid frontmatter/);
  });

  it("reports a deck file that doesn't exist", () => {
    const joined = join({});

    expect(joined.source).toBe("");
    expect(joined.diagnostics).toMatchObject([
      { severity: "error", file: "slides.md", line: 1 },
    ]);
  });

  it("joins files with Windows line endings", () => {
    const joined = join({
      "slides.md": "# One\r\n\r\n---\r\nsrc: a.md\r\n---\r\n",
      "a.md": "# A\r\n\r\n---\r\n\r\n# B\r\n",
    });

    expect(contents(joined)).toEqual(["# One", "# A", "# B"]);
  });
});
