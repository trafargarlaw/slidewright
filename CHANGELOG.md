# Changelog

All the packages, `@slidewright/core`, `react`, `vite`, `cli` and `create`,
have the same version. Each entry gives the packages that it changes.

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
