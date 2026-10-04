# @slidewright/core

Parses Markdown decks into slides and compiles each slide into an HTML syntax
tree ([hast](https://github.com/syntax-tree/hast)) with steps resolved. Has no
React dependency and runs in Node and the browser.

Most people want the React renderer instead. Use this package directly when
you build your own renderer, editor integration or tooling.

The deck format is documented in [docs/syntax.md](../../docs/syntax.md).

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

### Compiler options

```ts
createCompiler({
  sanitize: true, // default; `false` for trusted decks, or a custom schema
  remarkPlugins: [], // run after the built-in Markdown extensions
  rehypePlugins: [], // run last, after sanitising
});
```

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
