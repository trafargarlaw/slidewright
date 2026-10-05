import type { ColorScheme, DeckConfig, Diagnostic } from "./types";

export const DEFAULT_CONFIG: Readonly<DeckConfig> = {
  theme: "default",
  colorScheme: "light",
  aspectRatio: 16 / 9,
  canvasWidth: 980,
  defaults: {},
};

const COLOR_SCHEMES = new Set<ColorScheme>(["light", "dark", "auto"]);

/**
 * Turns raw headmatter into a {@link DeckConfig}. Invalid values fall back to
 * the defaults and produce a warning instead of failing the whole deck.
 */
export function resolveConfig(
  headmatter: Record<string, unknown>,
  line: number,
  diagnostics: Diagnostic[],
): DeckConfig {
  const config: DeckConfig = { ...headmatter, ...DEFAULT_CONFIG, defaults: {} };
  const warn = (message: string) =>
    diagnostics.push({ severity: "warning", message, line, slide: 0 });

  const { title, theme, colorScheme, aspectRatio, canvasWidth, defaults } =
    headmatter;

  if (title !== undefined) {
    if (typeof title === "string") config.title = title;
    else warn("`title` must be a string.");
  }

  if (theme !== undefined) {
    if (typeof theme === "string" && theme.trim()) config.theme = theme.trim();
    else warn("`theme` must be a non-empty string.");
  }

  if (colorScheme !== undefined) {
    if (COLOR_SCHEMES.has(colorScheme as ColorScheme)) {
      config.colorScheme = colorScheme as ColorScheme;
    } else {
      warn("`colorScheme` must be one of `light`, `dark` or `auto`.");
    }
  }

  if (aspectRatio !== undefined) {
    const ratio = parseAspectRatio(aspectRatio);
    if (ratio) config.aspectRatio = ratio;
    else warn("`aspectRatio` must look like `16/9`, `4:3` or `1.6`.");
  }

  if (canvasWidth !== undefined) {
    if (
      typeof canvasWidth === "number" &&
      Number.isFinite(canvasWidth) &&
      canvasWidth > 0
    ) {
      config.canvasWidth = canvasWidth;
    } else {
      warn("`canvasWidth` must be a positive number.");
    }
  }

  if (defaults !== undefined) {
    if (isPlainObject(defaults)) config.defaults = defaults;
    else warn("`defaults` must be a mapping of frontmatter keys.");
  }

  return config;
}

export function parseAspectRatio(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== "string") return undefined;

  const match = /^\s*(\d+(?:\.\d+)?)\s*(?:[/:x]\s*(\d+(?:\.\d+)?))?\s*$/.exec(
    value,
  );
  if (!match) return undefined;

  const width = Number(match[1]);
  const height = match[2] === undefined ? 1 : Number(match[2]);
  return width > 0 && height > 0 ? width / height : undefined;
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
