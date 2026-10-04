import { describe, expect, it, onTestFinished } from "vitest";
import {
  clampPosition,
  getKeyCommand,
  getOverviewKeyCommand,
  getSwipeAction,
  isSwipeStart,
  move,
  overviewColumns,
  type KeyLike,
} from "../src/navigation";

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

const keyEvent = (init: Partial<KeyLike>): KeyLike => ({
  key: "",
  target: null,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  defaultPrevented: false,
  ...init,
});

describe("getKeyCommand", () => {
  const key = (init: Partial<KeyLike>, typed?: string) =>
    getKeyCommand(keyEvent(init), typed);
  const action = (init: Partial<KeyLike>) => {
    const command = key(init);
    return command?.type === "navigate" ? command.action : command?.type;
  };

  it("maps presentation keys", () => {
    expect(action({ key: "ArrowRight" })).toBe("next");
    expect(action({ key: " " })).toBe("next");
    expect(action({ key: " ", shiftKey: true })).toBe("prev");
    expect(action({ key: "PageUp" })).toBe("prev");
    expect(action({ key: "ArrowDown" })).toBe("nextSlide");
    expect(action({ key: "End" })).toBe("last");
    expect(action({ key: "f" })).toBe("fullscreen");
    expect(action({ key: "F", shiftKey: true })).toBe("fullscreen");
    expect(action({ key: "o" })).toBe("overview");
    expect(action({ key: "O", shiftKey: true })).toBe("overview");
    expect(action({ key: "p" })).toBe("presenter");
    expect(action({ key: "P", shiftKey: true })).toBe("presenter");
    expect(action({ key: "a" })).toBeUndefined();
  });

  it("builds up a slide number and goes to it on Enter", () => {
    expect(key({ key: "1" })).toEqual({ type: "typeSlide", typed: "1" });
    expect(key({ key: "2" }, "1")).toEqual({ type: "typeSlide", typed: "12" });
    expect(key({ key: "Backspace" }, "12")).toEqual({
      type: "typeSlide",
      typed: "1",
    });
    expect(key({ key: "Escape" }, "12")).toEqual({
      type: "typeSlide",
      typed: "",
    });
    expect(key({ key: "Enter" }, "12")).toEqual({
      type: "goToSlide",
      slide: 11,
    });
    expect(key({ key: "5" }, "1234")).toEqual({
      type: "typeSlide",
      typed: "1234",
    });
  });

  it("leaves Enter, Backspace and Escape alone without a number", () => {
    expect(key({ key: "Enter" })).toBeUndefined();
    expect(key({ key: "Backspace" })).toBeUndefined();
    expect(key({ key: "Escape" })).toBeUndefined();
  });

  it("leaves browser shortcuts and handled events alone", () => {
    expect(key({ key: "ArrowLeft", metaKey: true })).toBeUndefined();
    expect(key({ key: "ArrowLeft", altKey: true })).toBeUndefined();
    expect(key({ key: "f", ctrlKey: true })).toBeUndefined();
    expect(key({ key: "1", altKey: true })).toBeUndefined();
    expect(key({ key: "ArrowLeft", defaultPrevented: true })).toBeUndefined();
  });

  it("leaves keys alone while typing or pressing a button", () => {
    const input = document.createElement("input");
    const button = document.createElement("button");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.append(document.createElement("span"));

    expect(key({ key: "ArrowRight", target: input })).toBeUndefined();
    expect(key({ key: "1", target: input })).toBeUndefined();
    expect(key({ key: "ArrowRight", target: editable.firstChild })).toBe(
      undefined,
    );
    expect(key({ key: " ", target: button })).toBeUndefined();
    expect(action({ key: "ArrowRight", target: button })).toBe("next");
    expect(key({ key: "Enter", target: button })).toBeUndefined();
  });

  it("knows form fields and buttons in another window", () => {
    // The presenter window has its own `Element`, like this frame.
    const frame = document.createElement("iframe");
    document.body.append(frame);
    onTestFinished(() => frame.remove());
    const other = frame.contentDocument!;
    const input = other.createElement("input");
    const button = other.createElement("button");

    expect(input instanceof Element).toBe(false);
    expect(key({ key: "ArrowRight", target: input })).toBeUndefined();
    expect(key({ key: " ", target: button })).toBeUndefined();
    expect(action({ key: "ArrowRight", target: other })).toBe("next");
  });
});

describe("getOverviewKeyCommand", () => {
  // Eight slides, three to a row:
  //   0 1 2
  //   3 4 5
  //   6 7
  const key = (init: Partial<KeyLike>, selected = 4) =>
    getOverviewKeyCommand(keyEvent(init), selected, 8, 3);
  const select = (key: string, selected: number) => {
    const command = getOverviewKeyCommand(keyEvent({ key }), selected, 8, 3);
    return command?.type === "select" ? command.slide : command?.type;
  };

  it("moves the selection along rows and columns", () => {
    expect(select("ArrowLeft", 4)).toBe(3);
    expect(select("ArrowRight", 4)).toBe(5);
    expect(select("ArrowUp", 4)).toBe(1);
    expect(select("ArrowDown", 4)).toBe(7);
    expect(select("ArrowLeft", 3)).toBe(2);
    expect(select("Home", 4)).toBe(0);
    expect(select("End", 4)).toBe(7);
  });

  it("stops at the edges of the grid", () => {
    expect(select("ArrowLeft", 0)).toBe(0);
    expect(select("ArrowRight", 7)).toBe(7);
    expect(select("ArrowUp", 2)).toBe(2);
    expect(select("ArrowDown", 6)).toBe(6);
    // Down from a full row onto the shorter last one.
    expect(select("ArrowDown", 5)).toBe(7);
  });

  it("chooses, closes and toggles fullscreen", () => {
    expect(key({ key: "Enter" })).toEqual({ type: "choose" });
    expect(key({ key: " " })).toEqual({ type: "choose" });
    expect(key({ key: "Escape" })).toEqual({ type: "close" });
    expect(key({ key: "o" })).toEqual({ type: "close" });
    expect(key({ key: "f" })).toEqual({ type: "fullscreen" });
  });

  it("leaves a focused button to activate itself", () => {
    const button = document.createElement("button");
    expect(key({ key: "Enter", target: button })).toBeUndefined();
    expect(key({ key: " ", target: button })).toBeUndefined();
    expect(key({ key: "ArrowRight", target: button })).toEqual({
      type: "select",
      slide: 5,
    });
  });

  it("leaves other keys, shortcuts and form fields alone", () => {
    expect(key({ key: "3" })).toBeUndefined();
    expect(key({ key: "PageDown" })).toBeUndefined();
    expect(key({ key: "ArrowRight", metaKey: true })).toBeUndefined();
    expect(key({ key: "ArrowRight", defaultPrevented: true })).toBeUndefined();
    const input = document.createElement("input");
    expect(key({ key: "ArrowRight", target: input })).toBeUndefined();
  });
});

describe("overviewColumns", () => {
  it("fits thumbnails to the width, within limits", () => {
    expect(overviewColumns(360)).toBe(2);
    expect(overviewColumns(980)).toBe(4);
    expect(overviewColumns(1440)).toBe(6);
    expect(overviewColumns(2560)).toBe(6);
    expect(overviewColumns(undefined)).toBe(4);
  });
});

describe("getSwipeAction", () => {
  it("goes forward on a swipe left and back on a swipe right", () => {
    expect(getSwipeAction(-80, 10)).toBe("next");
    expect(getSwipeAction(80, -10)).toBe("prev");
  });

  it("ignores taps and mostly vertical gestures", () => {
    expect(getSwipeAction(-20, 0)).toBeUndefined();
    expect(getSwipeAction(-80, 60)).toBeUndefined();
  });
});

describe("isSwipeStart", () => {
  const start = (init: Partial<Parameters<typeof isSwipeStart>[0]>) =>
    isSwipeStart({
      pointerType: "touch",
      isPrimary: true,
      target: null,
      defaultPrevented: false,
      ...init,
    });

  it("starts on one finger", () => {
    expect(start({})).toBe(true);
    expect(start({ pointerType: "mouse" })).toBe(false);
    expect(start({ isPrimary: false })).toBe(false);
  });

  it("leaves form fields and handled presses alone", () => {
    const range = document.createElement("input");
    range.type = "range";
    expect(start({ target: range })).toBe(false);
    expect(start({ defaultPrevented: true })).toBe(false);
  });
});
