import { stringify } from "yaml";
import { isPlainObject } from "./config";
import { isBlankLine, markCodeLines } from "./lines";
import {
  DECK_KEYS,
  FRONTMATTER_START,
  findHeadmatter,
  readFrontmatter,
  splitSlides,
  type Chunk,
} from "./parse-deck";
import type { Diagnostic } from "./types";

type Frontmatter = Record<string, unknown>;

/** How `joinDeck` gets at the files of a deck. */
export interface DeckFiles {
  /** The text of a file, or `undefined` when there is no such file. */
  read(file: string): string | undefined;
  /**
   * The file that `src` names in the file `from`. By default, a path from
   * the folder of `from`, with `/` between its parts.
   */
  resolve?(src: string, from: string): string;
}

/** A 1-based line of a file. */
export interface FileLine {
  file: string;
  line: number;
}

/** A problem in one of the files of a deck. `line` is a line of `file`. */
export interface FileDiagnostic extends Diagnostic {
  file: string;
}

export interface JoinedDeck {
  /** The deck as one Markdown source, for `parseDeck` and for renderers. */
  source: string;
  /**
   * The files that the deck asks for, the first one being the deck file.
   * Files that don't exist are here too, so a tool can wait for them.
   */
  files: string[];
  /** The file and the line that a 1-based line of `source` comes from. */
  locate(line: number): FileLine;
  /**
   * Problems with the files: one that is missing, or one that includes
   * itself. `parseDeck` reports the problems of the slides.
   */
  diagnostics: FileDiagnostic[];
}

/**
 * Joins the files of a deck into one source. A slide whose frontmatter has
 * `src` stands for the slides of that file:
 *
 * ```md
 * ---
 * src: chapters/intro.md
 * ---
 * ```
 *
 * The other keys of that frontmatter go to each of those slides, unless the
 * slide sets them. A file's own `defaults` apply to its slides; its other
 * deck settings, such as `theme`, are those of the deck file.
 *
 * Never throws. A deck without `src` comes back as it is.
 */
export function joinDeck(entry: string, files: DeckFiles): JoinedDeck {
  const resolve = (src: string, from: string) =>
    files.resolve ? files.resolve(src, from) : resolvePath(src, from);
  const out: string[] = [];
  const origins: FileLine[] = [];
  const diagnostics: FileDiagnostic[] = [];
  const asked = new Set([entry]);
  const state: {
    included: boolean;
    // The settings of the deck, when the slide that has them stands for a
    // file. They go to the first slide of the joined deck.
    head?: { keys: Frontmatter; file: string; line: number };
  } = { included: false };

  const push = (text: string, file: string, line: number) => {
    out.push(text);
    origins.push({ file, line });
  };
  const pushFrontmatter = (keys: Frontmatter, file: string, line: number) => {
    if (Object.keys(keys).length === 0) return false;
    for (const text of stringify(keys).trimEnd().split("\n")) {
      push(text, file, line);
    }
    push("---", file, line);
    return true;
  };

  const add = (
    file: string,
    source: string,
    given: Frontmatter,
    parents: readonly string[],
  ) => {
    const lines = source.split(/\r?\n/);
    const drafts = splitSlides(lines, markCodeLines(lines));
    const headmatter = findHeadmatter(lines, drafts);
    const nested = parents.length > 0;
    // The `defaults` of an included file. Those of the deck file stay in
    // its headmatter, where `parseDeck` reads them.
    let defaults: Frontmatter = {};

    for (const draft of drafts) {
      const problems: Diagnostic[] = [];
      const own = draft.frontmatter
        ? readFrontmatter(lines, draft.frontmatter, 0, problems)
        : {};
      const start = (draft.separator ?? draft.body.from) + 1;
      const frontmatterLine = draft.frontmatter
        ? draft.frontmatter.from + 1
        : start;

      const deckKeys: Frontmatter = {};
      const slideKeys: Frontmatter = {};
      for (const [key, value] of Object.entries(own)) {
        const forDeck = draft.frontmatter === headmatter && DECK_KEYS.has(key);
        (forDeck ? deckKeys : slideKeys)[key] = value;
      }
      if (nested && isPlainObject(deckKeys.defaults)) {
        defaults = deckKeys.defaults;
      }
      const inherited = { ...defaults, ...given };

      const { src, ...rest } = slideKeys;
      if (typeof src === "string" && src.trim() !== "") {
        state.included = true;
        const srcLine = findKey(lines, draft.frontmatter!, "src");
        const report = (severity: Diagnostic["severity"], message: string) =>
          diagnostics.push({ severity, message, line: srcLine, file });

        const content = findContent(lines, draft.body);
        if (content !== undefined) {
          diagnostics.push({
            severity: "warning",
            message:
              "A slide with `src` shows the slides of that file, not its own content. Move this content to another slide.",
            line: content,
            file,
          });
        }

        const pass = { ...inherited, ...rest };
        if (!nested && draft.frontmatter === headmatter) {
          // The title of the headmatter is the title of the deck, not one
          // for each slide of the file.
          const keys = { ...deckKeys };
          if (pass.title !== undefined) keys.title = pass.title;
          delete pass.title;
          if (Object.keys(keys).length > 0) {
            state.head = { keys, file, line: frontmatterLine };
          }
        }

        const target = resolve(src.trim(), file);
        asked.add(target);
        if (target === file || parents.includes(target)) {
          report(
            "error",
            `A file can't include itself, or a file that includes it. The slides of \`${src.trim()}\` are left out here.`,
          );
          continue;
        }
        const text = files.read(target);
        if (text === undefined) {
          report(
            "error",
            `No file \`${src.trim()}\`: its slides are left out. The path is from the folder of this file.`,
          );
          continue;
        }
        add(target, text, pass, [...parents, file]);
        continue;
      }

      if (src !== undefined) {
        diagnostics.push({
          severity: "warning",
          message: "`src` must be the path of a Markdown file.",
          line: findKey(lines, draft.frontmatter!, "src"),
          file,
        });
      }

      push("---", file, start);
      let hasFrontmatter = false;
      const changed =
        Object.keys(inherited).length > 0 ||
        state.head !== undefined ||
        (nested && Object.keys(deckKeys).length > 0);
      if (changed) {
        // The frontmatter is written again, so `parseDeck` doesn't see what
        // was wrong with the slide's own.
        for (const { severity, message, line } of problems) {
          diagnostics.push({ severity, message, line, file });
        }
        hasFrontmatter = pushFrontmatter(
          {
            ...inherited,
            ...slideKeys,
            ...(nested ? undefined : deckKeys),
            ...state.head?.keys,
          },
          file,
          frontmatterLine,
        );
        state.head = undefined;
      } else if (draft.frontmatter) {
        hasFrontmatter = true;
        for (let i = draft.frontmatter.from; i < draft.frontmatter.to; i++) {
          push(lines[i]!, file, i + 1);
        }
        push("---", file, draft.frontmatter.to + 1);
      }

      // Content that starts like frontmatter stays content, as in its file,
      // where no `---` followed it.
      const { from, to } = draft.body;
      if (!hasFrontmatter && FRONTMATTER_START.test(lines[from] ?? "")) {
        push("", file, from + 1);
      }
      for (let i = from; i < to; i++) push(lines[i]!, file, i + 1);
    }
  };

  const source = files.read(entry);
  if (source === undefined) {
    return {
      source: "",
      files: [entry],
      locate: (line) => ({ file: entry, line }),
      diagnostics: [
        {
          severity: "error",
          message: "The deck file doesn't exist.",
          line: 1,
          file: entry,
        },
      ],
    };
  }

  add(entry, source, {}, []);
  if (!state.included) {
    return {
      source,
      files: [entry],
      locate: (line) => ({ file: entry, line }),
      diagnostics,
    };
  }
  // No slide took the settings of the deck: they make a slide of their own.
  if (state.head) {
    const { keys, file, line } = state.head;
    push("---", file, line);
    pushFrontmatter(keys, file, line);
  }

  return {
    source: out.join("\n"),
    files: [...asked],
    locate: (line) =>
      origins[Math.min(Math.max(line, 1), origins.length) - 1] ?? {
        file: entry,
        line: 1,
      },
    diagnostics,
  };
}

/** The 1-based line of a key in a frontmatter block, or its first line. */
function findKey(lines: string[], chunk: Chunk, key: string): number {
  for (let i = chunk.from; i < chunk.to; i++) {
    if (
      lines[i]!.startsWith(key) &&
      /^[ \t]*:/.test(lines[i]!.slice(key.length))
    ) {
      return i + 1;
    }
  }
  return chunk.from + 1;
}

/** The 1-based line of the first line of a chunk that isn't blank. */
function findContent(lines: string[], chunk: Chunk): number | undefined {
  for (let i = chunk.from; i < chunk.to; i++) {
    if (!isBlankLine(lines[i]!)) return i + 1;
  }
  return undefined;
}

/** `src` from the folder of `from`. A `src` that starts with `/` is whole. */
function resolvePath(src: string, from: string): string {
  const parts = src.startsWith("/") ? [""] : from.split("/").slice(0, -1);
  for (const part of src.split("/")) {
    if (part === "" || part === ".") continue;
    const last = parts.at(-1);
    if (part !== "..") parts.push(part);
    else if (last === undefined || last === "..") parts.push(part);
    else if (last !== "") parts.pop();
  }
  return parts.join("/");
}
