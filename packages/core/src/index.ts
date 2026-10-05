export { parseDeck, getSlideAtLine } from "./parse-deck";
export {
  joinDeck,
  type DeckFiles,
  type FileDiagnostic,
  type FileLine,
  type JoinedDeck,
} from "./join";
export {
  createCompiler,
  compileSlide,
  type CompileOptions,
  type SlideCompiler,
} from "./compile";
export { parseHighlights, getHighlightedLines } from "./highlights";
export { parseLineChanges, type LineChange } from "./diff";
export { splitNotes } from "./notes";
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
