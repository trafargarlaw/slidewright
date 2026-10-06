# @slidewright/cli

Present, build and export Markdown decks from the command line. A project
needs only the deck file. It needs no config, no `index.html` and no React
code.

The [deck syntax reference](../../docs/syntax.md) tells the deck format.

## Usage

To start a new project, use
[`npm create @slidewright`](../create/README.md). Its projects have the CLI.
To add the CLI to a project that you have, run this command:

```sh
npm install --save-dev @slidewright/cli
```

To present `slides.md`, run this command:

```sh
npx slidewright
```

To build `slides.md` into a static site in the `dist` folder, run this
command:

```sh
npx slidewright build
```

To export `slides.md` to `slides.pdf`, run this command:

```sh
npx slidewright export
```

To present a deck one time without installing the CLI, run this command:

```sh
npx @slidewright/cli talk.md
```

`slidewright dev` serves the deck at <http://localhost:3030>. When you save
the deck, the page changes immediately, on the same slide and step. The
position stays in the URL hash, and the keys work on all the page.

`slidewright build` writes a static site that works from any folder of any
host. See [Deploy](#deploy).

`slidewright export` saves the deck as a PDF or as PNG images. See
[Export](#export).

You need Node.js 20.19 or later in version 20, or Node.js 22.12 or later.

## Commands

```text
slidewright [command] [deck] [options]
```

| Command         | What it does                           |
| --------------- | -------------------------------------- |
| `dev [deck]`    | Present the deck. This is the default. |
| `build [deck]`  | Build the deck into a static site.     |
| `export [deck]` | Export the deck to PDF or PNG files.   |

The default deck is `slides.md`. Give a file, or a folder that contains
`slides.md`. Without a command, the CLI presents a `.md` file:
`slidewright talk.md`.

Each command prints problems in the deck as warnings, with the file and the
line. See [Problems in the deck](../vite/README.md#problems-in-the-deck).

| Option            | Command  | Description                                                                          |
| ----------------- | -------- | ------------------------------------------------------------------------------------ |
| `--port <port>`   | `dev`    | The port to listen on. The default is `3030`. When it is in use, the next free port. |
| `--host`          | `dev`    | Listen on all addresses, to open the deck from a different device.                   |
| `--open`          | `dev`    | Open the deck in the browser.                                                        |
| `--out <dir>`     | `build`  | The output folder. The default is `dist`, next to the deck.                          |
| `--base <path>`   | `build`  | The base path of the site. The default is `./`: the site works from any folder.      |
| `--format <fmt>`  | `export` | `pdf` (the default) or `png`.                                                        |
| `--out <path>`    | `export` | The output file or folder. See [Export](#export).                                    |
| `--steps`         | `export` | One page for each step, not for each slide.                                          |
| `-h`, `--help`    |          | Show the help.                                                                       |
| `-v`, `--version` |          | Show the version.                                                                    |

## Export

Export uses Chromium through [Playwright](https://playwright.dev). To
install it in the project, with its browser, run this command:

```sh
npm install --save-dev playwright-chromium
```

To export the deck to a PDF file, `slides.pdf`, run this command:

```sh
npx slidewright export
```

To export each slide to a PNG image in the `slides-png` folder, run this
command:

```sh
npx slidewright export --format png
```

To export a page for each step, add `--steps`:

```sh
npx slidewright export --steps
```

The files go next to the deck, with the name of the deck. `talk.md` exports
to `talk.pdf`, or to the folder `talk-png`. To use a different file or
folder, use `--out`.

- **PDF.** One page for each slide, with the size of the slide. All the
  steps show, and code shows its last highlight stage. The text stays text,
  so you can select it and search it.
- **PNG.** One image for each slide, at two times the slide size: 1960 ×
  1102 for the default canvas of 980 px. The name of an image is the slide
  number, with zeros before it to give all names the same length (`01.png`
  … `12.png`). With `--steps`, the step comes after a dash, as in the URL
  hash: `3-2.png` is slide 3 with two steps shown. Before it exports, the
  CLI removes the images with these names from the folder. So the folder
  holds only the current slides.

Export waits until the code has its colours and the images and fonts are
loaded. It waits for a maximum of 30 seconds. Then it stops, and lists what
is still loading.

The CLI loads `playwright-chromium`, `playwright` or `playwright-core`: the
one that the project has. With `playwright-core`, install the browser with
`npx playwright-core install chromium`. When the browser is not downloaded,
export gives the command that downloads it.

To print or save a PDF from the browser, open the deck with `?print` added
to its address. See [Printing](../vite/README.md#printing).

## Deploy

`slidewright build` writes the site into `dist`. Its paths are relative. So
the site works at the root of a domain, and in a folder such as
`https://user.github.io/talk/`. Upload `dist` to any static host, or let the
host build the site:

| Host             | Build command           | Output folder |
| ---------------- | ----------------------- | ------------- |
| Netlify          | `npx slidewright build` | `dist`        |
| Vercel           | `npx slidewright build` | `dist`        |
| Cloudflare Pages | `npx slidewright build` | `dist`        |

In a project made with `npm create @slidewright`, `npm run build` does the
same.

On GitHub Pages, a workflow builds the site. Add this file. Then, in the
**Settings → Pages** of the repository, select **GitHub Actions** as the
source:

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
├── chapters/    # optional: more slides, in files that the deck names
├── style.css    # optional: theme properties and slide styles
├── images/      # optional: images and other files that the deck shows
└── public/      # optional: files to copy into the site with no change
```

- A slide with `src: chapters/why.md` in its frontmatter stands for the
  slides of that file. So a long deck can be in several files. The folder
  can have any name. See [Several files](../../docs/syntax.md#several-files).
- A `style.css` next to the deck loads after the default theme. See
  [Styling](../vite/README.md#styling).
- When the project has Mermaid, the page draws `mermaid` code blocks as
  diagrams. To install Mermaid, run `npm install --save-dev mermaid`. See
  [Diagrams](../vite/README.md#diagrams).
- When the project has the set of an icon, the page draws the icon, such as
  `:lucide:rocket:`. To install a set, run
  `npm install --save-dev @iconify-json/lucide`. See
  [Icons](../vite/README.md#icons).
- To show images and other files, write their path from the folder of the
  deck: `![Diagram](images/diagram.png)`. The build copies each file that the
  deck refers to. See [Files](../vite/README.md#files).
- Files in `public/` go to the root of the site. Refer to them by name:
  `![Logo](logo.svg)` shows `public/logo.svg`.

The CLI ignores `vite.config.*` files. To change the Vite config, use the
[Vite plugin](../vite/README.md).
