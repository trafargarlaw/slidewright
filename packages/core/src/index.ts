export { parseDeck, getSlideAtLine } from "./parse-deck";
export {
  createCompiler,
  compileSlide,
  type CompileOptions,
  type SlideCompiler,
} from "./compile";
export { parseHighlights, getHighlightedLines } from "./highlights";
export { sanitizeSchema } from "./sanitize";
export type {
  ColorScheme,
  CompiledSlide,
  Deck,
  DeckConfig,
  Diagnostic,
  HighlightRange,
  LineRange,
  Slide,
} from "./types";
