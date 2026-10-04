import type { Root } from "hast";

/** A 1-based, inclusive range of lines in the deck source. */
export interface LineRange {
  start: number;
  end: number;
}

export interface Diagnostic {
  severity: "error" | "warning";
  message: string;
  /** 1-based line in the deck source. */
  line: number;
  /** Index of the slide the diagnostic belongs to, when there is one. */
  slide?: number;
}

export type ColorScheme = "light" | "dark" | "auto";

/**
 * Deck-wide settings, read from the headmatter (the frontmatter block at the
 * top of the file). Unknown keys are kept so renderers and plugins can read
 * their own settings.
 */
export interface DeckConfig {
  [key: string]: unknown;
  title?: string;
  /** Theme name. Interpreted by the renderer. */
  theme: string;
  colorScheme: ColorScheme;
  /** Width divided by height, e.g. `16 / 9`. */
  aspectRatio: number;
  /** Width of the slide canvas in CSS pixels. Height follows the aspect ratio. */
  canvasWidth: number;
  /** Frontmatter applied to every slide unless the slide overrides it. */
  defaults: Record<string, unknown>;
}

export interface Slide {
  /** 0-based position in the deck. */
  index: number;
  /** Slide settings: `defaults` from the config merged with the slide's own frontmatter. */
  frontmatter: Record<string, unknown>;
  /** Layout name, `"default"` when not set. */
  layout: string;
  /** `title` from the frontmatter, otherwise the text of the first heading. */
  title?: string;
  /** Markdown body with frontmatter and notes removed. */
  content: string;
  /**
   * Speaker notes as Markdown, `[step]` lines included: `splitNotes` divides
   * them by step. Empty when the slide has none.
   */
  notes: string;
  /** Lines covered by the slide, from its separator to the line before the next one. */
  range: LineRange;
  /** Lines covered by the slide's own frontmatter block, if it has one. */
  frontmatterRange?: LineRange;
}

export interface Deck {
  config: DeckConfig;
  slides: Slide[];
  diagnostics: Diagnostic[];
}

/** A slide body compiled to an HTML syntax tree. */
export interface CompiledSlide {
  tree: Root;
  /** Number of steps (reveals) on the slide. Step `0` is the initial state. */
  steps: number;
}

/** One stage of a code block's line highlighting. */
export interface HighlightRange {
  /** Step at which this range becomes active. */
  step: number;
  lines: number[] | "all";
}
