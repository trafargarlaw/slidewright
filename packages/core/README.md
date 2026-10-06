# @slidewright/core

Parses Markdown decks into slides. Compiles each slide into an HTML syntax
tree ([hast](https://github.com/syntax-tree/hast)), with its steps. The
package doesn't use React, and runs in Node and in the browser.

Most people need the React renderer, not this package. Use this package
when you make your own renderer, editor integration or tools.

The [deck syntax reference](../../docs/syntax.md) tells the deck format.

## Usage

```ts
import { createCompiler, parseDeck } from "@slidewright/core";

const deck = parseDeck(markdown);
// deck.config       → headmatter settings (theme, aspectRatio, …)
// deck.slides       → [{ index, layout, frontmatter, content, notes, title, range }]
// deck.diagnostics  → problems found while parsing, with line numbers

const compile = createCompiler(); // make it one time, use it for every slide
const { tree, steps } = compile(deck.slides[0]);
```

`parseDeck` never throws. It reports problems in `diagnostics`, such as
frontmatter that is not valid or notes that have no end. The rest of the
deck continues to parse.

A compiler takes a slide from `parseDeck`, or the Markdown of a slide as a
string. `steps` is the number of steps of the slide. The `steps` key in the
frontmatter of the slide changes this number. To compile one slide with the
default options, use `compileSlide(slide)`.

### Decks in several files

`parseDeck` takes one source and never reads a file. Some decks have slides
that [name other files with `src`](../../docs/syntax.md#several-files). For
these decks, `joinDeck` makes the source. You give it the function that
reads a file:

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

`read` gets the deck file with the name that you gave. It gets the other
files as paths from the folder of the file that names them, with `/`
between their parts. When paths work in a different way, also give
`resolve(src, from)`. For example, use it on Windows, or in an editor that
keeps the files in memory.

The lines of `deck.diagnostics` and of each `slide.range` are lines of
`joined.source`. `joined.locate` changes them into a file and a line.
`joinDeck` never throws. It gives back a deck without `src` with no change.

### Compiler options

```ts
createCompiler({
  sanitize: true, // the default; `false` for trusted decks, or a custom schema
  remarkPlugins: [], // run after the built-in Markdown extensions
  rehypePlugins: [], // run last, after sanitising
});
```

`sanitizeSchema` is the default schema. Extend it to make a custom schema.
As on GitHub, the schema adds `user-content-` before `id` and `name`
attributes.

The schema doesn't apply to the attributes of directives, which go to
components as JSON. When sanitising is on, the compiler removes these from
the attributes of directives:

- event handlers, which are attributes such as `onclick`
- `srcdoc`
- `javascript:` and `vbscript:` URLs.

## Output contract for renderers

The compiled tree is plain hast, with these annotations:

| Where                    | Property                    | Meaning                                                                   |
| ------------------------ | --------------------------- | ------------------------------------------------------------------------- |
| Any element              | `dataStep`                  | The element shows when the current step is this value or more.            |
| `code` in `pre`          | `dataLang`                  | The language of the fence.                                                |
|                          | `dataHighlights`            | The highlight stages. Read them with `parseHighlights()`.                 |
|                          | `dataLineNumbers`           | The first line number, when line numbers are on.                          |
|                          | `dataTitle`                 | The title to show above the code.                                         |
|                          | `dataDiff`                  | In `diff` blocks: the changed lines. Read them with `parseLineChanges()`. |
|                          | `dataMeta`                  | The raw meta of the fence, for custom renderers.                          |
| `code`                   | `className` `language-math` | LaTeX maths. In a `pre`, display maths; alone, inline maths.              |
| `span`                   | `dataIcon`                  | An icon, as `set:name` of Iconify.                                        |
| Directive `div` elements | `dataDirective`             | The name of the directive.                                                |
|                          | `dataDirectiveKind`         | `container` or `leaf`.                                                    |
|                          | `dataDirectiveAttributes`   | A JSON object with the attributes of the directive.                       |

Some attribute values are set before the compiler parses raw HTML. These
values come back as strings, so read numbers with `Number(...)`.

`getHighlightedLines(parseHighlights(value), step)` tells a code renderer
the lines to highlight at a step.

In a `diff` block, the compiler removes the `+` and `-` markers from the
code text. `parseLineChanges(value)` gives a map from line numbers to
`added` or `removed`. The first line is 1.

The text of a maths element is its LaTeX source. A diagram is a `code`
element in `pre` with the `dataLang` `mermaid`. Its text is the source of
the diagram. The text of an icon `span` is the source, such as
`:lucide:rocket:`. A renderer that doesn't have the icon can show this
text. The compiler doesn't change maths, diagrams or icons into HTML or
SVG: that is the work of the renderer.

`getSlideAtLine(deck, line)` gives the index of the slide at a line of the
source, for example at the cursor of an editor.

`splitNotes(notes)` divides the notes of a slide at their `[step]` lines.
It gives one part for each step, for a presenter view. See
[Notes for each step](../../docs/syntax.md#notes-for-each-step).

## Types

| Type             | What it is                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `Deck`           | What `parseDeck` returns: `config`, `slides` and `diagnostics`.                               |
| `DeckConfig`     | The headmatter settings, with their defaults. Unknown keys stay, for renderers to read.       |
| `Slide`          | A slide: `index`, `layout`, `frontmatter`, `title`, `content`, `notes` and `range`.           |
| `Diagnostic`     | A problem in the deck: `severity`, `message`, `line` and, when there is one, `slide`.         |
| `LineRange`      | The `start` and `end` lines of a part of the deck source, both included. The first line is 1. |
| `DeckFiles`      | How `joinDeck` gets files: `read` and, when the paths need it, `resolve`.                     |
| `JoinedDeck`     | What `joinDeck` returns: `source`, `files`, `locate` and `diagnostics`.                       |
| `FileLine`       | A `file` and a `line` in it: what `locate` returns. The first line is 1.                      |
| `FileDiagnostic` | A `Diagnostic` with the `file` that its `line` is in.                                         |
| `ColorScheme`    | `"light"`, `"dark"` or `"auto"`.                                                              |
| `CompileOptions` | The options of `createCompiler`. See [Compiler options](#compiler-options).                   |
| `SlideCompiler`  | What `createCompiler` returns: a function from a `Slide` or Markdown to a `CompiledSlide`.    |
| `CompiledSlide`  | `tree`, the hast root of the slide, and `steps`.                                              |
| `HighlightRange` | A highlight stage from `parseHighlights`: the `step` that starts it, and its `lines`.         |
| `LineChange`     | `"added"` or `"removed"`: the values of the map from `parseLineChanges`.                      |
