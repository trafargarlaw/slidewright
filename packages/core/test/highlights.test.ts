import { describe, expect, it } from "vitest";
import { parseAspectRatio } from "../src/config";
import { parseCodeMeta, parseHighlightSpec } from "../src/highlights";

describe("parseCodeMeta", () => {
  it("reads highlights, line numbers and titles in any order", () => {
    expect(parseCodeMeta(`title='a b.ts' lines {1|2}`)).toEqual({
      highlight: "1|2",
      lineNumbers: 1,
      title: "a b.ts",
    });
  });

  it("ignores empty or unknown meta", () => {
    expect(parseCodeMeta("{} wrap foo=bar")).toEqual({});
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
