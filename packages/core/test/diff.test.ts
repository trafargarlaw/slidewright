import { describe, expect, it } from "vitest";
import {
  formatLineChanges,
  parseLineChanges,
  stripDiffMarkers,
} from "../src/diff";

describe("stripDiffMarkers", () => {
  it("takes the markers off added and removed lines", () => {
    const { code, changes } = stripDiffMarkers("a\n-b\n+c\n+d");
    expect(code).toBe("a\nb\nc\nd");
    expect(changes).toEqual(
      new Map([
        [2, "removed"],
        [3, "added"],
        [4, "added"],
      ]),
    );
  });

  it("takes the leading space off unchanged lines pasted from git diff", () => {
    const { code } = stripDiffMarkers(" if (a) {\n-  b();\n+  c();\n\n }");
    expect(code).toBe("if (a) {\n  b();\n  c();\n\n}");
  });

  it("keeps indentation when not every unchanged line starts with a space", () => {
    const { code } = stripDiffMarkers("if (a) {\n  b();\n+  c();\n}");
    expect(code).toBe("if (a) {\n  b();\n  c();\n}");
  });
});

describe("line changes", () => {
  it("round-trips through the data-diff format", () => {
    const changes = stripDiffMarkers("-a\n-b\nc\n+d\n-e\n+f").changes;
    const value = formatLineChanges(changes);
    expect(value).toBe("added:4,6|removed:1-2,5");
    expect(parseLineChanges(value)).toEqual(changes);
  });

  it("skips invalid parts", () => {
    expect(parseLineChanges("added:1|moved:2|removed:x|added:all|3")).toEqual(
      new Map([[1, "added"]]),
    );
    expect(parseLineChanges("")).toEqual(new Map());
  });
});
