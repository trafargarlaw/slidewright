# Slidewright

[![npm](https://img.shields.io/npm/v/@slidewright/react?label=npm)](https://www.npmjs.com/org/slidewright)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Write presentations in Markdown, render them with React.

![The playground: Markdown on the left, the slide it makes on the right](docs/playground.png)

- **Markdown first.** A deck is one Markdown file. A line with only `---`
  starts a new slide, and a YAML block gives the settings of a slide.
  Speaker notes and step markers are HTML comments, so the file is also easy
  to read on GitHub.
- **All that a talk needs.** Steps, code with highlighted lines, LaTeX
  maths, Mermaid diagrams, icons from Iconify, and transitions between
  slides. A long deck can have its chapters in different files.
- **In any React app.** `<Deck markdown={markdown} />` shows a deck. When
  the Markdown changes, the deck changes too. So the deck works in live
  editors, docs sites and CMS previews.
- **A full toolchain.** A command line tool presents a deck, builds it into
  a static site, and exports it to PDF or PNG files. A browser editor shows
  the slides as you type.

> [!WARNING]
> This is an early release. Every API can change before version 1.0. The
> [roadmap](docs/ROADMAP.md) shows the work that is planned and in progress.
> The [changelog](CHANGELOG.md) shows the changes in each version.

## Quick start

Run these commands. They make a project in the `my-talk` folder, install its
packages and present its deck at http://localhost:3030:

```sh
npm create @slidewright my-talk
cd my-talk
npm install
npm run dev
```

You need Node.js 20.19 or later in version 20, or Node.js 22.12 or later.

The [deck syntax](docs/syntax.md) tells what a deck can hold. The
[examples](examples) show each feature on slides.

## With an AI agent

The packages have no AI in them. A skill teaches the deck format to an AI
agent, such as Claude Code, Codex or Cursor. Then the agent can write and
edit decks. To add the skill to your project, run this command:

```sh
npx skills add trafargarlaw/slidewright
```

The skill is the [`skills/slidewright`](skills/slidewright) folder. It has
the steps to make a deck, a short guide to the format, and the quantity of
text that fits on a slide. It also has the reference docs.

## Repository layout

| Path              | What it is                                                 |
| ----------------- | ---------------------------------------------------------- |
| `packages/core`   | [Deck parser and slide compiler](packages/core) (no React) |
| `packages/react`  | [`<Deck>` component](packages/react), layouts and themes   |
| `packages/vite`   | [Vite plugin](packages/vite): serve and build a deck file  |
| `packages/cli`    | [`slidewright` command](packages/cli): dev, build, export  |
| `packages/create` | [`npm create @slidewright`](packages/create) template      |
| `apps/playground` | [Browser editor](apps/playground) with a live preview      |
| `apps/docs`       | [Documentation site](apps/docs)                            |
| `examples/`       | [Example decks](examples) and a React app                  |
| `docs/`           | [Syntax reference](docs/syntax.md), roadmap and decisions  |
| `skills/`         | The deck format as a skill for AI agents                   |

## Development

You need [Bun](https://bun.sh) 1.3 or later. To install the dependencies,
run this command at the root of the repository:

```sh
bun install
```

Then run a script at the root:

| Script              | What it does                                           |
| ------------------- | ------------------------------------------------------ |
| `bun run dev`       | Starts the playground at http://localhost:3000         |
| `bun run docs`      | Starts the documentation site at http://localhost:4321 |
| `bun run typecheck` | Checks the types of every workspace                    |
| `bun run test`      | Runs the unit tests                                    |
| `bun run lint`      | Finds problems in the code with oxlint                 |
| `bun run fmt`       | Formats the code with oxfmt                            |
| `bun run build`     | Builds every workspace                                 |

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open a pull request.

## License

[MIT](LICENSE)
