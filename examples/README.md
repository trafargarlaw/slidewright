# Examples

| Example            | Shows                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- |
| [layouts](layouts) | Every built-in layout, one slide each, with images from `public/`                  |
| [code](code)       | Code blocks: titles, line numbers, highlight stages, diffs and notes for each step |
| [theme](theme)     | A deck with its own look: colours, fonts, a layout made in CSS and slide classes   |
| [react](react)     | `<Deck>` in a React app: a live editor, a custom layout and a directive component  |

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
`callout` component, and [`react/src/app.css`](react/src/app.css) arranges
them. See the [`@slidewright/react` README](../packages/react/README.md) for
every prop.
