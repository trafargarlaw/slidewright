# @slidewright/core

Parses Markdown decks into slides and compiles each slide into an HTML syntax
tree ([hast](https://github.com/syntax-tree/hast)) with steps resolved. Has no
React dependency and runs in Node and the browser.

Most people want the React renderer instead. Use this package directly when
you build your own renderer, editor integration or tooling.

The deck format is documented in the [deck syntax reference](../../docs/syntax.md).

## Usage

```ts
import { createCompiler, parseDeck } from "@slidewright/core";

const deck = parseDeck(markdown);
// deck.config       → headmatter settings (theme, aspectRatio, …)
// deck.slides       → [{ index, layout, frontmatter, content, notes, title, range }]
// deck.diagnostics  → problems found while parsing, with line numbers

const compile = createCompiler(); // build once, reuse for every slide
const { tree, steps } = compile(deck.slides[0]);
```

`parseDeck` never throws. Invalid frontmatter, unclosed notes and similar
problems are reported in `diagnostics`, and the rest of the deck still parses.

A compiler takes a slide from `parseDeck` or a slide's Markdown as a string.
`steps` is the number of steps on the slide, unless its frontmatter sets
`steps`. For a one-off, `compileSlide(slide)` compiles with the default
options.

### Decks in several files

`parseDeck` takes one source and never reads a file. For a deck whose slides
[name other files with `src`](../../docs/syntax.md#several-files), `joinDeck`
makes that source. You give it the way to read a file:

```ts
import { readFileSync } from "node:fs";
import { joinDeck, parseDeck } from "@slidewright/core";

const joined = joinDeck("talk/slides.md", {
  read(file) {
    try {
      return readFileSync(file, "utf8");
    } catch {
      return undefined; // no such file
    }
  },
});

const deck = parseDeck(joined.source);
// joined.files        → every file that the deck asks for, to watch them
// joined.diagnostics  → files that are missing or that include themselves
// joined.locate(line) → the file and the line that a line of `source` is from
```

`read` gets the deck file as you named it, and other files as paths from the
folder of the file that names them, with `/` between their parts. Give
`resolve(src, from)` too when paths work another way, such as on Windows or
in an editor that keeps files in memory.

The lines of `deck.diagnostics` and of each `slide.range` are lines of
`joined.source`. `joined.locate` turns them into a file and a line.
`joinDeck` never throws, and a deck without `src` comes back as it is.

### Compiler options

```ts
createCompiler({
  sanitize: true, // default; `false` for trusted decks, or a custom schema
  remarkPlugins: [], // run after the built-in Markdown extensions
  rehypePlugins: [], // run last, after sanitising
});
```

`sanitizeSchema` is the default schema, to extend for a custom one. Like
GitHub's, it prefixes `id` and `name` attributes with `user-content-`.

The schema doesn't apply to the attributes of directives, which go to
components as JSON. With sanitising on, event handlers (attributes such as
`onclick`), `srcdoc`, and `javascript:` and `vbscript:` URLs are removed from
them.

## Output contract for renderers

The compiled tree is plain hast with these annotations:

| Where            | Property                  | Meaning                                                          |
| ---------------- | ------------------------- | ---------------------------------------------------------------- |
| Any element      | `dataStep`                | Visible once the current step is at least this value.            |
| `code` in `pre`  | `dataLang`                | Language from the fence.                                         |
|                  | `dataHighlights`          | Resolved highlight stages; read with `parseHighlights()`.        |
|                  | `dataLineNumbers`         | First line number, when line numbers are on.                     |
|                  | `dataTitle`               | Title shown above the code.                                      |
|                  | `dataDiff`                | In `diff` blocks: changed lines; read with `parseLineChanges()`. |
|                  | `dataMeta`                | Raw fence meta, for custom renderers.                            |
| Directive `div`s | `dataDirective`           | Directive name.                                                  |
|                  | `dataDirectiveKind`       | `container` or `leaf`.                                           |
|                  | `dataDirectiveAttributes` | JSON object of the directive's attributes.                       |

Attribute values set before raw HTML is parsed come back as strings, so read
numbers with `Number(...)`.

`getHighlightedLines(parseHighlights(value), step)` tells a code renderer
which lines to emphasise at a given step.

In a `diff` block the `+` and `-` markers are taken out of the code text.
`parseLineChanges(value)` maps 1-based line numbers to `added` or `removed`.

`getSlideAtLine(deck, line)` maps a source line (for example an editor
cursor) to a slide index.

`splitNotes(notes)` divides a slide's notes at their `[step]` lines, one part
per step, for a presenter view. See
[Notes for each step](../../docs/syntax.md#notes-for-each-step).

## Types

| Type             | What it is                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `Deck`           | What `parseDeck` returns: `config`, `slides` and `diagnostics`.                            |
| `DeckConfig`     | The headmatter settings, with their defaults. Unknown keys stay, for renderers to read.    |
| `Slide`          | A slide: `index`, `layout`, `frontmatter`, `title`, `content`, `notes` and `range`.        |
| `Diagnostic`     | A problem in the deck: `severity`, `message`, `line` and, when there is one, `slide`.      |
| `LineRange`      | The 1-based `start` and `end` lines of a part of the deck source, both included.           |
| `DeckFiles`      | How `joinDeck` gets at files: `read` and, when paths need it, `resolve`.                   |
| `JoinedDeck`     | What `joinDeck` returns: `source`, `files`, `locate` and `diagnostics`.                    |
| `FileLine`       | A `file` and a 1-based `line` in it: what `locate` returns.                                |
| `FileDiagnostic` | A `Diagnostic` with the `file` that its `line` is in.                                      |
| `ColorScheme`    | `"light"`, `"dark"` or `"auto"`.                                                           |
| `CompileOptions` | The options of `createCompiler`. See [Compiler options](#compiler-options).                |
| `SlideCompiler`  | What `createCompiler` returns: a function from a `Slide` or Markdown to a `CompiledSlide`. |
| `CompiledSlide`  | `tree`, the slide's hast root, and `steps`.                                                |
| `HighlightRange` | A highlight stage from `parseHighlights`: the `step` that starts it, and its `lines`.      |
| `LineChange`     | `"added"` or `"removed"`: the values of the map from `parseLineChanges`.                   |
