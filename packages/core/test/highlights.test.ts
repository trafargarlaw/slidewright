import { describe, expect, it } from "vitest";
import { parseAspectRatio } from "../src/config";
import {
  findCodeMetaProblems,
  parseCodeMeta,
  parseHighlightSpec,
} from "../src/highlights";

describe("parseCodeMeta", () => {
  it("reads highlights, line numbers, titles and diff in any order", () => {
    expect(parseCodeMeta(`title='a b.ts' diff lines {1|2}`)).toEqual({
      highlight: "1|2",
      lineNumbers: 1,
      title: "a b.ts",
      diff: true,
    });
  });

  it("ignores empty or unknown meta", () => {
    expect(parseCodeMeta("{} wrap foo=bar diff=no")).toEqual({});
    expect(parseCodeMeta(undefined)).toEqual({});
  });
});

describe("parseHighlightSpec", () => {
  it("expands ranges and lists, and reads explicit steps", () => {
    expect(parseHighlightSpec("1,3-5|all@2|*")).toEqual([
      { lines: [1, 3, 4, 5] },
      { lines: "all", step: 2 },
      { lines: "all" },
    ]);
  });

  it("skips invalid parts", () => {
    expect(parseHighlightSpec("x|2|")).toEqual([{ lines: [2] }]);
  });
});

describe("findCodeMetaProblems", () => {
  it("finds nothing in valid or empty meta", () => {
    expect(findCodeMetaProblems("{1,3-5@2|all|*} lines=10 diff")).toEqual([]);
    expect(findCodeMetaProblems("{} lines")).toEqual([]);
    expect(findCodeMetaProblems("")).toEqual([]);
  });

  it("names each part that parseHighlightSpec skips", () => {
    expect(findCodeMetaProblems("{x|2|}")).toEqual([
      "`x` in `{x|2|}` is not a line range. Use line numbers, ranges such as `3-5`, or `all`, with an optional `@step`.",
      "`{x|2|}` has an empty stage between `|` signs.",
    ]);
  });
});

describe("parseAspectRatio", () => {
  it.each([
    ["16/9", 16 / 9],
    ["4:3", 4 / 3],
    ["16 x 10", 1.6],
    [1.5, 1.5],
    ["1.5", 1.5],
  ])("parses %s", (input, expected) => {
    expect(parseAspectRatio(input)).toBeCloseTo(expected);
  });

  it.each(["wide", "0/9", -1, null])("rejects %s", (input) => {
    expect(parseAspectRatio(input)).toBeUndefined();
  });
});
