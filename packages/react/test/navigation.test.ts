import { describe, expect, it } from "vitest";
import { clampPosition, getKeyAction, move } from "../src/navigation";

// Three slides with 0, 2 and 1 steps.
const steps = [0, 2, 1];
const getSteps = (slide: number) => steps[slide] ?? 0;
const go = (slide: number, step: number, action: Parameters<typeof move>[1]) =>
  move({ slide, step }, action, steps.length, getSteps);

describe("move", () => {
  it("walks through steps before moving to the next slide", () => {
    expect(go(0, 0, "next")).toEqual({ slide: 1, step: 0 });
    expect(go(1, 0, "next")).toEqual({ slide: 1, step: 1 });
    expect(go(1, 2, "next")).toEqual({ slide: 2, step: 0 });
    expect(go(2, 1, "next")).toEqual({ slide: 2, step: 1 });
  });

  it("goes back to the previous slide fully revealed", () => {
    expect(go(2, 0, "prev")).toEqual({ slide: 1, step: 2 });
    expect(go(1, 1, "prev")).toEqual({ slide: 1, step: 0 });
    expect(go(0, 0, "prev")).toEqual({ slide: 0, step: 0 });
  });

  it("skips steps with slide-level actions", () => {
    expect(go(1, 0, "nextSlide")).toEqual({ slide: 2, step: 0 });
    expect(go(2, 1, "prevSlide")).toEqual({ slide: 1, step: 0 });
    expect(go(1, 1, "first")).toEqual({ slide: 0, step: 0 });
    expect(go(0, 0, "last")).toEqual({ slide: 2, step: 1 });
  });

  it("does nothing in an empty deck", () => {
    expect(move({ slide: 0, step: 0 }, "next", 0, getSteps)).toEqual({
      slide: 0,
      step: 0,
    });
  });
});

describe("clampPosition", () => {
  it("keeps positions inside the deck", () => {
    expect(clampPosition({ slide: 9, step: 9 }, 3, getSteps)).toEqual({
      slide: 2,
      step: 1,
    });
    expect(clampPosition({ slide: -1, step: Number.NaN }, 3, getSteps)).toEqual(
      { slide: 0, step: 0 },
    );
  });
});

describe("getKeyAction", () => {
  const key = (init: Partial<Parameters<typeof getKeyAction>[0]>) =>
    getKeyAction({
      key: "",
      target: null,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      defaultPrevented: false,
      ...init,
    });

  it("maps presentation keys", () => {
    expect(key({ key: "ArrowRight" })).toBe("next");
    expect(key({ key: " " })).toBe("next");
    expect(key({ key: " ", shiftKey: true })).toBe("prev");
    expect(key({ key: "PageUp" })).toBe("prev");
    expect(key({ key: "ArrowDown" })).toBe("nextSlide");
    expect(key({ key: "End" })).toBe("last");
    expect(key({ key: "a" })).toBeUndefined();
  });

  it("leaves browser shortcuts and handled events alone", () => {
    expect(key({ key: "ArrowLeft", metaKey: true })).toBeUndefined();
    expect(key({ key: "ArrowLeft", altKey: true })).toBeUndefined();
    expect(key({ key: "ArrowLeft", defaultPrevented: true })).toBeUndefined();
  });

  it("leaves keys alone while typing or pressing a button", () => {
    const input = document.createElement("input");
    const button = document.createElement("button");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.append(document.createElement("span"));

    expect(key({ key: "ArrowRight", target: input })).toBeUndefined();
    expect(key({ key: "ArrowRight", target: editable.firstChild })).toBe(
      undefined,
    );
    expect(key({ key: " ", target: button })).toBeUndefined();
    expect(key({ key: "ArrowRight", target: button })).toBe("next");
  });
});
