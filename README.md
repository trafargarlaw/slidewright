# Slidewright

Write presentations in Markdown, render them with React.

- **Markdown first.** One file, slides separated by `---`, per-slide
  frontmatter, speaker notes, step-by-step reveals and code highlighting.
- **Embeddable.** Drop `<Deck markdown={md} />` into any React app. The deck
  re-renders as the markdown changes, so it works for live editors, docs
  sites and CMS previews alike.
- **A full toolchain.** A CLI to present, build static sites and export PDFs,
  plus a browser editor with live preview.

> [!WARNING]
> Pre-alpha. The packages are not published yet and every API may change.
> See the [roadmap](docs/ROADMAP.md) for what is planned and in progress.

## Repository layout

| Path              | What it is                                  |
| ----------------- | ------------------------------------------- |
| `packages/core`   | Deck parser and slide compiler (no React)   |
| `packages/react`  | `<Deck>` component, layouts and themes      |
| `packages/vite`   | Vite plugin: serve and build a deck file    |
| `apps/playground` | Browser editor with live preview            |
| `docs/`           | [Syntax reference](docs/syntax.md), roadmap |

## Development

Requires [Bun](https://bun.sh) 1.3+.

```sh
bun install
bun run dev        # start the playground on http://localhost:3000
bun run typecheck  # type-check every workspace
bun run test       # run unit tests
bun run lint       # oxlint
bun run fmt        # oxfmt
bun run build      # build every workspace
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

[MIT](LICENSE)
