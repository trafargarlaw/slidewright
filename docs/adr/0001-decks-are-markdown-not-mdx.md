---
status: accepted
---

# Decks are Markdown, not MDX

The v0.2 roadmap had "MDX support through the Vite plugin, if it fits
cleanly". It doesn't fit, so a deck stays plain Markdown. React components
belong to a React app, which gives them to `<Deck>` for the deck's
directives. A deck of the CLI or the Vite plugin has none: it is Markdown,
HTML and CSS. MDX would be a second deck format with a second way to render
it.

## Why it doesn't fit

**The deck format is not MDX.** We compiled the deck syntax with
`@mdx-js/mdx` 3, slide by slide:

| In a deck                               | With MDX                                       |
| --------------------------------------- | ---------------------------------------------- |
| `<!-- step -->`, `<!-- notes … -->`     | Syntax error: MDX has no HTML comments.        |
| `<br>`, `<img src="a.png">`             | Syntax error: every tag must be closed.        |
| `Latency is <5 ms`                      | Syntax error: `<` starts a tag.                |
| `<https://example.com>`                 | Syntax error: no autolinks.                    |
| `Use {curly} braces`                    | Compiles, then throws when the slide renders.  |
| `<p style="color: red">`                | Compiles, then React refuses the string style. |
| `---`, `layout: center`, `---` mid-file | A rule and a heading, not frontmatter.         |
| `:::callout{tone="warning"}`            | Fine, with the same remark plugin.             |

So an MDX deck would not be today's deck with JSX added. It would be a
dialect with its own steps and notes, and a deck that exists now would
rarely be valid in it.

**Mistakes would stop the slide.** The rule of the parser is that a mistake
gives a diagnostic and the rest of the deck still renders. An MDX mistake is
a compile error for the whole slide, and some mistakes only show when the
slide renders.

**It needs a second way to render.** `<Deck markdown={md}>` compiles each
slide in the browser to a syntax tree, where sanitising, steps, code
highlights, icons and diagrams are worked out, and renders again as the
string changes. MDX compiles to JavaScript modules at build time. `<Deck>`
would have to take compiled components as well as Markdown, and steps,
highlights and the rest would have to be done a second time on JSX. The
embeddable `<Deck>` and the editor planned for v0.3 could have MDX only by
shipping its compiler and running deck text as code in the page, which
goes against sanitising by default.

**A React app already has components.** A directive renders a React
component with attributes and Markdown children, from the `components` prop
of `<Deck>`.

## Considered options

- **`slides.mdx` as a second deck format in the Vite plugin.** Rejected for
  the reasons above.
- **MDX for single slides, through `src: demo.mdx`.** A smaller surface, but
  the same second way to render, and such slides would have no steps or
  notes until those were built again.
- **A `components` module for decks of the CLI.** A `components.tsx` next
  to the deck, which the Vite plugin loaded for the deck's directives. It
  was built, and removed before a release: we don't think that a deck of
  the CLI needs React components.
- **Stay Markdown, with components only in a React app.** Chosen.

## Consequences

A deck of the CLI or the Vite plugin can't use a React component. A deck
that needs one is rendered by a React app, with `<Deck components>`.

Three things that MDX has are not in a deck of a React app either: props
that aren't strings, JavaScript expressions in text, and `import` lines. A
component can hold any logic and import anything, so these are about
convenience. If they are asked for, the answer should be a small addition
to directives, not a second format.
