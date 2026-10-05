# @slidewright/cli

Present, build and export Markdown decks from the command line. A project
needs only the deck file: no config, no `index.html`, no React code.

The deck format is documented in the [deck syntax reference](../../docs/syntax.md).

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

`slidewright build` writes a static site that works from any folder of any
host. See [Deploy](#deploy).

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

Each command prints problems in the deck as warnings, with the file and
line. See [Problems in the deck](../vite/README.md#problems-in-the-deck).

| Option            | Command  | Description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `--port <port>`   | `dev`    | Port to listen on. Default `3030`; the next free port if taken.      |
| `--host`          | `dev`    | Listen on all addresses, to open the deck from another device.       |
| `--open`          | `dev`    | Open the deck in the browser.                                        |
| `--out <dir>`     | `build`  | Output folder. Default `dist` next to the deck.                      |
| `--base <path>`   | `build`  | Base path of the site. Default `./`: the site works from any folder. |
| `--format <fmt>`  | `export` | `pdf` (default) or `png`.                                            |
| `--out <path>`    | `export` | Output file or folder. See [Export](#export).                        |
| `--steps`         | `export` | One page per step, not one per slide.                                |
| `-h`, `--help`    |          | Show the help.                                                       |
| `-v`, `--version` |          | Show the version.                                                    |

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

Export waits until code is highlighted and images and fonts are loaded, for
up to 30 seconds. After that, it stops and lists what is still loading.

The CLI loads `playwright-chromium`, `playwright` or `playwright-core`,
whichever the project has. With `playwright-core`, install the browser with
`npx playwright-core install chromium`. When the browser isn't downloaded,
export gives the command that downloads it.

To print or save a PDF from the browser instead, open the deck with `?print`
added to its address. See [Printing](../vite/README.md#printing).

## Deploy

`slidewright build` writes the site into `dist`. Its paths are relative, so
the site works at the root of a domain and in a folder, such as
`https://user.github.io/talk/`. Upload `dist` to any static host, or let the
host build the site:

| Host             | Build command           | Output folder |
| ---------------- | ----------------------- | ------------- |
| Netlify          | `npx slidewright build` | `dist`        |
| Vercel           | `npx slidewright build` | `dist`        |
| Cloudflare Pages | `npx slidewright build` | `dist`        |

In a project made with `npm create @slidewright`, `npm run build` does the
same.

On GitHub Pages, a workflow builds the site. Add this file, then select
**GitHub Actions** as the source in the repository's **Settings → Pages**:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
      - run: npm ci
      - run: npx slidewright build
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v5
```

## Project files

```text
talk/
├── slides.md    # the deck
├── style.css    # optional: theme properties and slide styles
├── images/      # optional: images and other files that the deck shows
└── public/      # optional: files to copy into the site as they are
```

- `style.css` next to the deck loads after the default theme. See
  [Styling](../vite/README.md#styling).
- Refer to images and other files with a path from the deck's folder:
  `![Diagram](images/diagram.png)`. The build copies each file that the deck
  refers to. See [Files](../vite/README.md#files).
- Files in `public/` go to the root of the site. Refer to them by name:
  `![Logo](logo.svg)` shows `public/logo.svg`.

The CLI ignores `vite.config.*` files. To change the Vite config, use the
[Vite plugin](../vite/README.md) directly.
