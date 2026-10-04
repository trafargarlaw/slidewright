# @slidewright/cli

Present and build Markdown decks from the command line. A project needs only
the deck file: no config, no `index.html`, no React code.

The deck format is documented in [docs/syntax.md](../../docs/syntax.md).

## Usage

```sh
npm install --save-dev @slidewright/cli

npx slidewright              # present slides.md
npx slidewright build        # build slides.md into dist/
```

Or run it once without installing:

```sh
npx @slidewright/cli talk.md
```

`slidewright dev` serves the deck on <http://localhost:3030>. Saved edits
show at once, on the same slide and step. The position is kept in the URL
hash, and the keyboard works anywhere on the page.

`slidewright build` writes a static site that can be hosted anywhere.

Requires Node.js 20.19 or 22.12 and later.

## Commands

```text
slidewright [command] [deck] [options]
```

| Command        | What it does                           |
| -------------- | -------------------------------------- |
| `dev [deck]`   | Present the deck. The default command. |
| `build [deck]` | Build the deck into a static site.     |

The deck is `slides.md` by default. Give a file, or a folder that contains
`slides.md`. Without a command, a `.md` file is presented:
`slidewright talk.md`.

| Option            | Command | Description                                                     |
| ----------------- | ------- | --------------------------------------------------------------- |
| `--port <port>`   | `dev`   | Port to listen on. Default `3030`; the next free port if taken. |
| `--host`          | `dev`   | Listen on all addresses, to open the deck from another device.  |
| `--open`          | `dev`   | Open the deck in the browser.                                   |
| `--out <dir>`     | `build` | Output folder. Default `dist` next to the deck.                 |
| `--base <path>`   | `build` | Base path of the site. Default `/`. `./` works from any folder. |
| `-h`, `--help`    |         | Show the help.                                                  |
| `-v`, `--version` |         | Show the version.                                               |

## Project files

```text
talk/
├── slides.md    # the deck
├── style.css    # optional: theme properties and slide styles
└── public/      # optional: images and other files, served at /
```

- `style.css` next to the deck loads after the default theme. See
  [Styling](../vite/README.md#styling).
- Files in `public/` are served at the site root: `![Diagram](/diagram.png)`.

The CLI ignores `vite.config.*` files. To change the Vite config, use the
[Vite plugin](../vite/README.md) directly.
