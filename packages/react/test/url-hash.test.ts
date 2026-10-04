import { describe, expect, it } from "vitest";
import { formatHash, parseHash } from "../src/url-hash";

describe("parseHash", () => {
  it("reads a slide number and an optional step", () => {
    expect(parseHash("#1")).toEqual({ slide: 0, step: 0 });
    expect(parseHash("#3")).toEqual({ slide: 2, step: 0 });
    expect(parseHash("#3.2")).toEqual({ slide: 2, step: 2 });
    expect(parseHash("#03")).toEqual({ slide: 2, step: 0 });
  });

  it("ignores anything else, such as the page's own anchors", () => {
    for (const hash of [
      "",
      "#",
      "#0",
      "#0.1",
      "#install",
      "#3.",
      "#.2",
      "#-1",
      "#3.2.1",
      "#1e3",
      "#3 ",
    ]) {
      expect(parseHash(hash), hash).toBeNull();
    }
  });
});

describe("formatHash", () => {
  it("numbers slides from 1 and leaves out step 0", () => {
    expect(formatHash({ slide: 0, step: 0 })).toBe("#1");
    expect(formatHash({ slide: 2, step: 0 })).toBe("#3");
    expect(formatHash({ slide: 2, step: 2 })).toBe("#3.2");
  });

  it("writes what parseHash reads", () => {
    const position = { slide: 11, step: 4 };
    expect(parseHash(formatHash(position))).toEqual(position);
  });
});
