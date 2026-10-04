# Roadmap

This document records the direction of the project and the order we plan to
build things in. It changes as we learn; pull requests that update it are
welcome.

## Principles

- **Markdown is the source of truth.** A deck is a plain `.md` file that reads
  well on its own and degrades gracefully in any Markdown viewer.
- **Our own format.** We take inspiration from existing tools (Slidev, Marp,
  reveal.js) but define our own syntax and don't aim for compatibility with
  any of them. We build on the same open ecosystem (unified/remark, YAML,
  Shiki).
- **Embeddable and reactive.** `<Deck markdown={md} />` works in any React app
  and re-renders as `md` changes, keeping the current slide and step.
- **Plain CSS.** Styling ships as CSS files themed with CSS custom properties.
  Nothing to configure in the consumer's bundler, and slide content can be
  styled with ordinary selectors.
- **No AI in the libraries.** The playground may demo AI-assisted editing, but
  the packages stay provider-free. Instead we publish agent "skills" that teach
  any AI tool the deck format.
- **Small, deliberate public API.** Internals are not exported. Every export is
  documented.

## Packages

| Package  | Purpose                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------ |
| `core`   | Deck parser and slide model: frontmatter, notes, slots, steps. No React. Runs in Node and the browser. |
| `react`  | `<Deck>`, layouts, navigation, presenter mode, themes.                                                 |
| `vite`   | Vite plugin: deck file loading, HMR, build-time highlighting.                                          |
| `cli`    | `dev`, `build` and `export` commands, plus the `create` scaffolder.                                    |
| `editor` | Embeddable editor with live preview.                                                                   |

## Milestones

### 0 — Foundation

- [x] Monorepo, CI, licence and contributor docs
- [x] `core`: one parser for browser and Node, a written syntax spec, tests
- [x] `react`: reactive `<Deck>`, layouts, step reveals, code highlighting,
      CSS-variable themes
- [x] Playground switched to the new packages

### 1 — Presenting (v0.1)

- [x] Navigation: keyboard (scoped when embedded), touch, URL sync, overview
      grid, go-to-slide, fullscreen, aspect ratios
- [x] Presenter mode: notes, next-slide preview, timer, synced windows
- [x] Complete layout set and custom layouts
- [ ] Code: line numbers, diff and focus notation, titles
- [ ] Vite plugin and CLI (`dev`, `build`), project template
- [ ] Export to PDF and PNG
- [ ] Documentation site and examples
- [ ] First release on npm, under the `@slidewright` scope

### 2 — Components and polish (v0.2)

- [ ] Components in Markdown through a registry (directive syntax)
- [ ] MDX support through the Vite plugin, if it fits cleanly
- [ ] Transitions, diagrams (Mermaid), maths (KaTeX), icons
- [ ] Multi-file decks
- [ ] Agent skills describing the deck format

### 3 — Editor (v0.3)

- [ ] Redesigned editor package and playground: new UX, not a port of the
      prototype
- [ ] Drawing and annotations, animated code transitions, PPTX export
