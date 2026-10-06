import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The colours of the default theme and of the built-in themes, as the
// stylesheet sets them, against the WCAG contrast ratios.

type Colours = Record<string, [light: string, dark: string]>;

const css = readFileSync(`${import.meta.dirname}/../src/styles.css`, "utf8");

const THEMES = [
  ...css.matchAll(/\n {2}\[data-deck\]\[data-theme="([\w-]+)"\] \{/g),
].map(([, name]) => name!);

/** The text in a rule of the stylesheet. */
function ruleOf(selector: string): string {
  const start = css.indexOf(`\n  ${selector} {`);
  if (start < 0) throw new Error(`No rule for ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

/** The `light-dark()` colours that a rule sets, by property name. */
function coloursOf(selector: string): Colours {
  const colours: Colours = {};
  for (const [, name, light, dark] of ruleOf(selector).matchAll(
    /--deck-([\w-]+):\s*light-dark\((#[\da-f]{6}),\s*(#[\da-f]{6})\)/g,
  )) {
    colours[name!] = [light!, dark!];
  }
  return colours;
}

const DEFAULT = coloursOf("[data-deck]");
const themeRule = (name: string) => `[data-deck][data-theme="${name}"]`;

/** The relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter! + 0.05) / (darker! + 0.05);
}

/** Each colour of text, the colour that it is on, and the minimum ratio. */
function pairs(colours: Colours, minimum: number) {
  const tokens = Object.keys(colours).filter((name) =>
    name.startsWith("code-"),
  );
  return [
    ["fg", "bg", Math.max(minimum, 7)],
    ["fg", "surface", Math.max(minimum, 7)],
    ["muted", "bg", minimum],
    ["muted", "surface", minimum],
    ["accent", "bg", minimum],
    ["accent", "surface", minimum],
    // Text on an accent fill, such as a vivid section slide.
    ["bg", "accent", minimum],
    // Code blocks are on the surface colour.
    ...tokens.map((token) => [token, "surface", minimum] as const),
  ] as const;
}

it("finds the built-in themes", () => {
  expect(THEMES).toEqual(["paper", "frost", "contrast", "vivid"]);
});

describe.each(["default", ...THEMES])("the %s theme", (name) => {
  const colours =
    name === "default"
      ? DEFAULT
      : { ...DEFAULT, ...coloursOf(themeRule(name)) };
  // `contrast` is for low vision, so all its text has the AAA ratio.
  const minimum = name === "contrast" ? 7 : 4.5;

  it.each([
    ["light", 0],
    ["dark", 1],
  ] as const)("has text that is easy to read in %s", (_, scheme) => {
    const failures = pairs(colours, minimum).flatMap(([text, on, ratio]) => {
      const actual = contrast(colours[text]![scheme], colours[on]![scheme]);
      return actual < ratio
        ? [`${text} on ${on}: ${actual.toFixed(2)}, not ${ratio}`]
        : [];
    });
    expect(failures).toEqual([]);
  });

  it.runIf(name !== "default")("sets all the colours", () => {
    expect(Object.keys(coloursOf(themeRule(name))).sort()).toEqual(
      Object.keys(DEFAULT).sort(),
    );
  });

  // So a deck that fits with one theme fits with all of them, and reduced
  // motion still stops the steps.
  it.runIf(name !== "default")("keeps the size and the motion", () => {
    expect(ruleOf(themeRule(name))).not.toMatch(
      /--deck-(font-size|line-height|padding|notes-font-size|step-|transition-)/,
    );
  });
});
