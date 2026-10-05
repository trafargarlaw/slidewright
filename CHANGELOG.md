# Changelog

All the packages, `@slidewright/core`, `react`, `vite`, `cli` and `create`,
have the same version. Each entry gives the packages that it changes.

## Unreleased

### Added

- `react`, `vite`, `cli`: Maths renders. Inline `$…$`, display `$$…$$` and
  `math` code fences are drawn with KaTeX, which loads with the first slide
  that has maths. Before, a deck showed the LaTeX source as code.
  `styles.css` now imports KaTeX's stylesheet, so a deck that added
  `rehype-katex` through `compileOptions` can drop it.
- `react`, `vite`, `cli`: Diagrams. A `mermaid` code block is drawn with
  Mermaid, in the colours and the font of its slide. Mermaid is not a
  dependency: with the CLI and the Vite plugin, install `mermaid` in the
  project; in a React app, give `<Deck>`, `<Presenter>` and `<PrintDeck>`
  the new `mermaid` prop, `() => import("mermaid")`. Without Mermaid, the
  block shows as code, as before, and the plugin prints a warning.
- `core`, `react`, `vite`, `cli`: Icons. `:set:name:` in text, such as
  `:lucide:rocket:`, is an icon from an Iconify set, as tall as the text and
  in its colour. The sets are not dependencies: with the CLI and the Vite
  plugin, install `@iconify-json/<set>` in the project, and the page gets
  only the icons that the deck uses; in a React app, give `<Deck>`,
  `<Presenter>` and `<PrintDeck>` the new `icons` prop. Without its set, an
  icon shows as its source text, and the plugin prints a warning.
- `react`, `vite`, `cli`: Transitions between slides. `transition:` in the
  frontmatter of a slide tells how it comes in: `fade`, `slide`, `slide-up`
  or `zoom`. Towards an earlier slide, the transition plays the other way.
  `defaults` in the headmatter gives a transition to every slide. Another
  name is a transition of your own, with its animations in CSS. The new
  theme properties `--deck-transition-duration` and
  `--deck-transition-easing` set the pace. Without `transition`, slides
  change at once, as before.
- `core`, `vite`, `cli`: A deck can be several files. A slide with `src` in
  its frontmatter, such as `src: chapters/why.md`, stands for the slides of
  that file. Its other keys go to each of those slides, a chapter's own
  `defaults` apply to its slides, and a file can bring in files of its own.
  The CLI and the Vite plugin follow every file of the deck, and print a
  problem with the file and the line that it is in. `core` has the new
  `joinDeck`, which makes one source from the files and reads them through
  a function that you give, so parsing still needs no file system.

### Changed

- `core`: Text of the form `:set:name:` now compiles to
  `<span data-icon="set:name">`, with the text inside. A deck that shows
  such text as it is can put it in code.

## 0.1.4 - 2026-10-05

### Fixed

- `react`, `vite`, `cli`: The packages install. The 0.1.3 packages were
  published with `workspace:^` in their dependencies, and `npm install`
  stopped with "Unsupported URL Type "workspace:"". Use 0.1.4 in place of
  0.1.3: it has the same code.

## 0.1.3 - 2026-10-05

### Fixed

- `vite`, `cli`: The dev server works on Windows in an installed project,
  such as one made with `npm create @slidewright`. The fix in 0.1.2 did not
  cover a page script in `node_modules\@slidewright`, so the page stayed
  empty, with the same message about `debug`.
- `vite`, `cli`: On Windows, the build makes the deck's page when the
  project has an `index.html` file. Before, the built site showed that file
  in place of the deck.

## 0.1.2 - 2026-10-05

### Fixed

- `vite`, `cli`: The dev server works on Windows, and in a folder with glob
  characters in its name, such as `talk [draft]`. Before, the page stayed
  empty, and the browser showed "The requested module
  '/node_modules/debug/src/browser.js' does not provide an export named
  'default'".

## 0.1.1 - 2026-10-05

### Security

- `core`: Directives get sanitised attributes. Before, the attributes went
  to the directive's component without a check, so a deck could give a
  component a `javascript:` URL, an event handler or an `srcdoc` page. With
  sanitising on, these attributes are removed.

### Fixed

- `vite`: The plugin accepts any React 19. Before, a project with an
  earlier React 19, such as 19.1, got a second copy of React, and the deck
  did not show: "Cannot read properties of null (reading
  'useDeferredValue')".
- `vite`, `cli`: A built deck works from any folder, such as a GitHub Pages
  project site. The build also copies the images, videos and other files
  that the deck refers to. Before, they showed in dev but were missing from
  the built site.
- `vite`, `cli`: The terminal shows the deck's problems as warnings, with
  the file and the line. Before, a deck with incorrect frontmatter lost its
  settings, and the build gave no message.
- `core`: A headmatter `title` that is not a string, such as `title: 1984`,
  is not used. Before, the parser gave a warning but kept the value, and the
  build stopped with "text.replaceAll is not a function".
- `core`: More problems are reported: a `steps` value that is not a number
  of 0 or more, highlight stages and `lines=` values that a code block
  skips, and a canvas width that is not finite. `steps: .inf` no longer
  gives a slide endless steps.
- `cli`: When an export fails, the message tells why: Chromium is not
  downloaded, the deck does not finish loading, or `--out` is the wrong
  kind of path. Before, the message was a stack trace.
- `react`: A deck whose Markdown comes later, such as from a `fetch`, opens
  on the slide in the URL hash. Before, it opened on the first slide.
- `react`: Screen readers announce the slide title with the slide number.
- `react`: When the system asks for reduced motion, nothing moves. The
  controls only fade in.
- All: The package links go to the `trafargarlaw/slidewright` repository.

### Changed

- `vite`, `cli`: The default base is `./`, not `/`, when the Vite config
  or `build --base` does not set one. A site built with `./` also works at
  the root of a domain.
- `create`: New projects have an `export` script.

## 0.1.0 - 2026-10-04

The first release.

- `core`: Parses a Markdown deck into slides with frontmatter, layouts,
  steps and speaker notes, and compiles each slide to HTML.
- `react`: The `<Deck>` component, with keyboard and touch navigation, an
  overview, a presenter window, layouts, themes and code highlighting. Also
  `<PrintDeck>` for print and export.
- `vite`: A Vite plugin that serves and builds a deck file as a site.
- `cli`: The `slidewright` command, with `dev`, `build` and `export` to PDF
  or PNG files.
- `create`: `npm create @slidewright`, which makes a new deck project.
