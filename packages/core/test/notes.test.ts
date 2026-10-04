import { describe, expect, it } from "vitest";
import { parseDeck, splitNotes } from "../src";

describe("splitNotes", () => {
  it("gives the text before the first marker to step 0", () => {
    expect(splitNotes("Intro\n[step]\nFirst\n[step]\nSecond")).toEqual([
      "Intro",
      "First",
      "Second",
    ]);
  });

  it("keeps notes without markers as one part, and empty notes as none", () => {
    expect(splitNotes("Pause here.\n\nThen go on.")).toEqual([
      "Pause here.\n\nThen go on.",
    ]);
    expect(splitNotes("")).toEqual([]);
    expect(splitNotes(" \n\n")).toEqual([]);
  });

  it("keeps empty parts, so each part stays with its step", () => {
    expect(splitNotes("[step]\nFirst")).toEqual(["", "First"]);
    expect(splitNotes("Intro\n[step]\n[step]\nSecond")).toEqual([
      "Intro",
      "",
      "Second",
    ]);
    expect(splitNotes("Intro\n[step]")).toEqual(["Intro", ""]);
  });

  it("trims blank lines around each part", () => {
    expect(splitNotes("Intro\n\n[step]\n\n  First\n\n")).toEqual([
      "Intro",
      "  First",
    ]);
    expect(splitNotes("Intro\r\n[step]\r\nFirst")).toEqual(["Intro", "First"]);
  });

  it("only counts a marker on its own line, outside code", () => {
    expect(splitNotes("Say [step] here\n  [step]  \nNext")).toEqual([
      "Say [step] here",
      "Next",
    ]);
    expect(splitNotes("[Step]\n[click]\n[step] now")).toEqual([
      "[Step]\n[click]\n[step] now",
    ]);
    const code = "Run:\n```md\n[step]\n```\n[step]\nDone";
    expect(splitNotes(code)).toEqual(["Run:\n```md\n[step]\n```", "Done"]);
  });

  it("splits the notes of a parsed slide", () => {
    const deck = parseDeck(
      [
        "# Three reasons",
        "",
        "<!-- notes",
        "Two reasons.",
        "[step]",
        "The second one.",
        "-->",
      ].join("\n"),
    );
    expect(deck.slides[0]!.notes).toBe("Two reasons.\n[step]\nThe second one.");
    expect(splitNotes(deck.slides[0]!.notes)).toEqual([
      "Two reasons.",
      "The second one.",
    ]);
  });
});
