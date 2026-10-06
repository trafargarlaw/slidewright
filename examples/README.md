# Examples

| Example                    | Shows                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| [layouts](layouts)         | Each built-in layout on one slide, with an image next to the deck                              |
| [code](code)               | Code blocks: titles, line numbers, highlight stages, diffs and notes for each step             |
| [themes](themes)           | One deck in a built-in theme. Change `theme:` to see the others                                |
| [theme](theme)             | A deck with its own look: colours, fonts, a layout made in CSS and slide classes               |
| [diagrams](diagrams)       | Mermaid diagrams in the colours of the deck, in a column, and on a slide with its own colours  |
| [icons](icons)             | Icons from two Iconify sets: in text, with a size and a colour from CSS, and shown in steps    |
| [transitions](transitions) | Each transition between slides, for the deck and for one slide, and one made in CSS            |
| [chapters](chapters)       | A deck in several files: chapters with their own settings, and a file that a chapter brings in |
| [react](react)             | `<Deck>` in a React app: a live editor, a custom layout and a directive component              |

The [deck syntax reference](../docs/syntax.md) tells the deck format.

## Run them

First, install and build the packages. Run these commands one time, at the
root of the repository:

```sh
bun install
bun run build
```

`bun install` also downloads Chromium, which `export` needs. This workspace
has `playwright-chromium`.

Then run the commands below in this folder. Put the name of an example in
place of `layouts`, `code` or `theme`.

To present a deck at http://localhost:3030, run this command:

```sh
bun run dev layouts
```

To export a deck to a PDF file, such as `code/slides.pdf`, run this command:

```sh
bun run export code
```

To export each slide of a deck to a PNG image, such as in
`theme/slides-png`, run this command:

```sh
bun run export theme --format png
```

To start the React app, run this command:

```sh
bun run react
```

`dev` and `export` run the [`slidewright` command](../packages/cli/README.md)
with the folder of a deck. Each deck also works alone. Copy the files of its
folder into a project made with `npm create @slidewright`. The `diagrams`
deck also needs the `mermaid` package. The `icons` deck also needs the
`@iconify-json/lucide` and `@iconify-json/logos` packages.

## The React app

[`react/src/app.tsx`](react/src/app.tsx) shows a text area and a `<Deck>`
next to each other. When the Markdown changes, the deck renders again. The
deck shows the slide at the cursor, through a controlled `position`.
[`react/src/parts.tsx`](react/src/parts.tsx) has a `sidebar` layout and a
`callout` component. [`react/src/parts.css`](react/src/parts.css) arranges
them. The [`@slidewright/react` README](../packages/react/README.md) tells
all the props.
