import {
  createCompiler,
  parseDeck,
  type CompileOptions,
  type Deck as ParsedDeck,
  type DeckConfig,
  type Slide,
} from "@slidewright/core";
import type { Root } from "hast";
import {
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { builtinLayouts, type Layout } from "./layouts";
import { LruCache } from "./lru";
import {
  clampPosition,
  move,
  type DeckPosition,
  type NavigationAction,
  type StepCounter,
} from "./navigation";
import type { CompiledEntry } from "./slide";

// Enough for every slide of a large deck plus recent edits.
const CACHE_LIMIT = 200;
const EMPTY_TREE: Root = { type: "root", children: [] };
const EMPTY_ENTRY: CompiledEntry = { tree: EMPTY_TREE, steps: 0 };
const START: DeckPosition = { slide: 0, step: 0 };

export interface CompiledDeck {
  deck: ParsedDeck;
  /** A slide by index, compiled. */
  getSlide: (index: number) => CompiledEntry;
  getSteps: StepCounter;
  /** Compiles other Markdown, such as speaker notes, the same way. */
  compile: (markdown: string) => CompiledEntry;
}

/** Parses a deck source and compiles its slides as they are needed. */
export function useCompiledDeck(
  markdown: string,
  options: CompileOptions | undefined,
): CompiledDeck {
  // Parsing and compiling stay off the typing path when the source changes
  // on every keystroke.
  const source = useDeferredValue(markdown);
  const deck = useMemo(() => parseDeck(source), [source]);
  const compile = useCompiler(options);
  const getSlide = useCallback(
    (index: number) => {
      const slide = deck.slides[index];
      return slide ? compile(slide) : EMPTY_ENTRY;
    },
    [deck, compile],
  );
  const getSteps = useCallback(
    (index: number) => getSlide(index).steps,
    [getSlide],
  );
  return { deck, getSlide, getSteps, compile };
}

/**
 * Compiles slides and Markdown on demand and caches them by content, so an
 * edit only recompiles the slide that changed.
 */
function useCompiler(
  options: CompileOptions | undefined,
): (input: Slide | string) => CompiledEntry {
  const compiler = useMemo(
    () => ({
      compile: createCompiler(options),
      cache: new LruCache<string, CompiledEntry>(CACHE_LIMIT),
    }),
    [options],
  );

  return useCallback(
    (input: Slide | string) => {
      const markdown = typeof input === "string" ? input : input.content;
      const override =
        typeof input === "string" ? undefined : input.frontmatter.steps;
      const key = `${typeof override === "number" ? override : ""}\u0000${markdown}`;
      let entry = compiler.cache.get(key);
      if (!entry) {
        try {
          entry = compiler.compile(input);
        } catch (error) {
          // Thrown by a user plugin; show it on the slide instead.
          entry = { tree: EMPTY_TREE, steps: 0, error };
        }
        compiler.cache.set(key, entry);
      }
      return entry;
    },
    [compiler],
  );
}

interface PositionProps {
  position?: DeckPosition;
  defaultPosition?: DeckPosition;
  onPositionChange?: (position: DeckPosition) => void;
}

/**
 * The position of a controlled or uncontrolled deck, clamped to the deck,
 * and `go` to move it.
 */
export function useDeckPosition(
  { position, defaultPosition, onPositionChange }: PositionProps,
  slideCount: number,
  getSteps: StepCounter,
) {
  // An uncontrolled deck remembers the requested position and clamps it on
  // render, so deleting and re-adding a slide while editing returns to it.
  const [internal, setInternal] = useState(defaultPosition ?? START);
  const current = clampPosition(position ?? internal, slideCount, getSteps);

  const latest = useRef({
    current,
    slideCount,
    getSteps,
    controlled: position !== undefined,
    onPositionChange,
  });
  useLayoutEffect(() => {
    latest.current = {
      current,
      slideCount,
      getSteps,
      controlled: position !== undefined,
      onPositionChange,
    };
  });

  const go = useCallback((target: DeckPosition | NavigationAction) => {
    const { current, slideCount, getSteps, controlled, onPositionChange } =
      latest.current;
    const next =
      typeof target === "string"
        ? move(current, target, slideCount, getSteps)
        : clampPosition(target, slideCount, getSteps);
    if (next.slide === current.slide && next.step === current.step) return;
    if (!controlled) setInternal(next);
    onPositionChange?.(next);
  }, []);

  return { current, go };
}

/** The built-in layouts, with custom ones added or replacing them. */
export function useLayouts(
  layouts: Readonly<Record<string, Layout>> | undefined,
): Readonly<Record<string, Layout>> {
  return useMemo(
    () => (layouts ? { ...builtinLayouts, ...layouts } : builtinLayouts),
    [layouts],
  );
}

/** Custom properties that size the slide canvas, set on the root. */
export function canvasProperties({
  aspectRatio,
  canvasWidth,
}: DeckConfig): CSSProperties {
  return {
    "--deck-aspect-ratio": aspectRatio,
    "--deck-canvas-width": `${canvasWidth}px`,
    "--deck-canvas-height": `${canvasWidth / aspectRatio}px`,
  } as CSSProperties;
}
