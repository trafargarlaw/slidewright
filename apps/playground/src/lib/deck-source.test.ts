import { parseDeck } from "@react-slides/core";
import { describe, expect, it } from "vitest";
import { setSlideNotes } from "./deck-source";

function edit(source: string, slide: number, notes: string) {
  const result = setSlideNotes(source, parseDeck(source).slides[slide]!, notes);
  return { result, deck: parseDeck(result) };
}

const text = String.raw;

describe("setSlideNotes", () => {
  it("adds notes at the end of a slide", () => {
    const source = text`# One

---

# Two
`;
    const { result, deck } = edit(source, 0, "Say hi");
    expect(result).toBe(text`# One

<!-- notes
Say hi
-->

---

# Two
`);
    expect(deck.slides.map((s) => s.notes)).toEqual(["Say hi", ""]);
  });

  it("replaces existing notes in place of all notes comments", () => {
    const source = text`# One

<!-- notes first -->

Body

<!-- notes
second
-->
---
# Two`;
    const { result, deck } = edit(source, 0, "new\nnotes");
    expect(result).toBe(text`# One

Body

<!-- notes
new
notes
-->
---
# Two`);
    expect(deck.slides[0]!.notes).toBe("new\nnotes");
    expect(deck.slides[0]!.content).toBe("# One\n\nBody");
  });

  it("removes notes when empty", () => {
    const source = text`# One

<!-- notes
old
-->

---

# Two`;
    expect(edit(source, 0, "  ").result).toBe(text`# One

---

# Two`);
  });

  it("edits the last slide and keeps the final newline", () => {
    const source = "# One\n\n---\n\n# Two\n";
    const { result, deck } = edit(source, 1, "Bye");
    expect(result).toBe("# One\n\n---\n\n# Two\n\n<!-- notes\nBye\n-->\n");
    expect(deck.slides[1]!.notes).toBe("Bye");
  });

  it("leaves notes comments inside code blocks alone", () => {
    const source = text`# Code

~~~md
<!-- notes
not a note
-->
~~~`;
    const { deck } = edit(source, 0, "Real");
    expect(deck.slides[0]!.notes).toBe("Real");
    expect(deck.slides[0]!.content).toContain("not a note");
  });

  it("keeps the slide's frontmatter", () => {
    const source = text`---
layout: center
---

# One
`;
    const { deck } = edit(source, 0, "Hi");
    expect(deck.slides[0]!.layout).toBe("center");
    expect(deck.slides[0]!.notes).toBe("Hi");
  });
});
