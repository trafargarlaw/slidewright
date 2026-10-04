# @slidewright/cli

Present, build and export Markdown decks from the command line. A project
needs only the deck file: no config, no `index.html`, no React code.

The deck format is documented in [docs/syntax.md](../../docs/syntax.md).

## Usage

Start a project with [`npm create @slidewright`](../create/README.md), or
add the CLI to an existing one:

```sh
npm install --save-dev @slidewright/cli

npx slidewright              # present slides.md
npx slidewright build        # build slides.md into dist/
npx slidewright export       # export slides.md to slides.pdf
```

Or run it once without installing:

```sh
npx @slidewright/cli talk.md
```

`slidewright dev` serves the deck on <http://localhost:3030>. Saved edits
show at once, on the same slide and step. The position is kept in the URL
hash, and the keyboard works anywhere on the page.

`slidewright build` writes a static site that can be hosted anywhere.

`slidewright export` saves the deck as a PDF or as PNG images. See
[Export](#export).

Requires Node.js 20.19 or 22.12 and later.

## Commands

```text
slidewright [command] [deck] [options]
```

| Command         | What it does                           |
| --------------- | -------------------------------------- |
| `dev [deck]`    | Present the deck. The default command. |
| `build [deck]`  | Build the deck into a static site.     |
| `export [deck]` | Export the deck to PDF or PNG files.   |

The deck is `slides.md` by default. Give a file, or a folder that contains
`slides.md`. Without a command, a `.md` file is presented:
`slidewright talk.md`.

| Option            | Command  | Description                                                     |
| ----------------- | -------- | --------------------------------------------------------------- |
| `--port <port>`   | `dev`    | Port to listen on. Default `3030`; the next free port if taken. |
| `--host`          | `dev`    | Listen on all addresses, to open the deck from another device.  |
| `--open`          | `dev`    | Open the deck in the browser.                                   |
| `--out <dir>`     | `build`  | Output folder. Default `dist` next to the deck.                 |
| `--base <path>`   | `build`  | Base path of the site. Default `/`. `./` works from any folder. |
| `--format <fmt>`  | `export` | `pdf` (default) or `png`.                                       |
| `--out <path>`    | `export` | Output file or folder. See [Export](#export).                   |
| `--steps`         | `export` | One page per step, not one per slide.                           |
| `-h`, `--help`    |          | Show the help.                                                  |
| `-v`, `--version` |          | Show the version.                                               |

## Export

Export uses Chromium through [Playwright](https://playwright.dev). Install it
in the project, with its browser:

```sh
npm install --save-dev playwright-chromium
```

Then:

```sh
npx slidewright export                 # slides.pdf
npx slidewright export --format png    # slides-png/1.png, 2.png, …
npx slidewright export --steps         # a page for every step
```

The files go next to the deck and take its name: `talk.md` exports to
`talk.pdf`, or to the folder `talk-png`. `--out` gives another file or
folder.

- **PDF.** One page per slide, the size of the slide, with every step
  revealed and code at its last highlight stage. The text stays text: it can
  be selected and searched.
- **PNG.** One image per slide at twice the slide size: 1960 × 1102 for the
  default 980 px canvas. Images are named by slide number, padded to the same
  length (`01.png` … `12.png`). With `--steps`, the step comes after a dash,
  as in the URL hash: `3-2.png` is slide 3 with two steps revealed. Export
  removes images with these names from the folder first, so the folder holds
  only the current slides.

Export waits until code is highlighted and images and fonts are loaded.

The CLI loads `playwright-chromium`, `playwright` or `playwright-core`,
whichever the project has. With `playwright-core`, install the browser with
`npx playwright-core install chromium`.

To print or save a PDF from the browser instead, open the deck with `?print`
added to its address. See [Printing](../vite/README.md#printing).

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
