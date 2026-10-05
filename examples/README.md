# Examples

| Example                    | Shows                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| [layouts](layouts)         | Every built-in layout, one slide each, with an image next to the deck                    |
| [code](code)               | Code blocks: titles, line numbers, highlight stages, diffs and notes for each step       |
| [theme](theme)             | A deck with its own look: colours, fonts, a layout made in CSS and slide classes         |
| [components](components)   | React components for directives, in a `components.tsx` next to the deck                  |
| [diagrams](diagrams)       | Mermaid diagrams in the deck's colours, in a column and on a slide with its own colours  |
| [icons](icons)             | Icons from two Iconify sets: in text, sized and coloured with CSS, and revealed in steps |
| [transitions](transitions) | Every transition between slides, for the deck and for one slide, and one made in CSS     |
| [react](react)             | `<Deck>` in a React app: a live editor, a custom layout and a directive component        |

The deck format is documented in [docs/syntax.md](../docs/syntax.md).

## Run them

From the repository root, install and build the packages once:

```sh
bun install
bun run build
```

Then, in this folder:

```sh
bun run dev layouts               # present a deck on http://localhost:3030
bun run export code               # save it as code/slides.pdf
bun run export theme --format png # or as images in theme/slides-png
bun run react                     # start the React app
```

`dev` and `export` run the [`slidewright` command](../packages/cli/README.md)
with the folder of a deck. Each deck also works on its own: copy the files of
its folder into a project made with `npm create @slidewright`.

## The React app

[`react/src/app.tsx`](react/src/app.tsx) renders a text area and a `<Deck>`
side by side. The deck re-renders as the Markdown changes and shows the slide
under the cursor, through a controlled `position`.
[`react/src/parts.tsx`](react/src/parts.tsx) defines a `sidebar` layout and a
`callout` component, and [`react/src/parts.css`](react/src/parts.css) arranges
them. See the [`@slidewright/react` README](../packages/react/README.md) for
every prop.
