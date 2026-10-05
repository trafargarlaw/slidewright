# @slidewright/vite

A Vite plugin that turns a Markdown deck into a presentation. The plugin
provides the page, so a project needs only the deck: no `index.html` and no
React code.

- `vite` serves the deck. Edits to the deck update the open page in place,
  on the same slide and step.
- `vite build` writes a static site that can be hosted anywhere.

The deck format is documented in the [deck syntax reference](../../docs/syntax.md).

## Usage

```sh
npm install --save-dev vite @slidewright/vite
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { slidewright } from "@slidewright/vite";

export default defineConfig({
  plugins: [slidewright({ deck: "slides.md", css: "style.css" })],
});
```

Then run `vite` to present, and `vite build` to build. The page renders
the deck with [`@slidewright/react`](../react/README.md), keeps the position
in the URL hash and listens to the keyboard anywhere on the page.

Requires Vite 8.

### Problems in the deck

The plugin prints problems in the deck as warnings, with the file and line:
invalid frontmatter, unknown layouts, and highlight ranges that code blocks
skip. It prints them when Vite starts and again when a saved change gives
different problems. The deck still renders, and the build still succeeds.

```text
slides.md:9: warning: Unknown layout "two-columns": the slide shows with the default layout. The layouts are default, center, …
```

## Options

| Option | Default     | Description                                                                                                 |
| ------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `deck` | `slides.md` | The deck file, relative to the Vite root.                                                                   |
| `css`  |             | One or more stylesheets loaded after the default theme, relative to the Vite root. See [Styling](#styling). |

## Styling

Stylesheets in `css` load after the default theme, so they can set theme
properties and style slide content with ordinary selectors:

```css
/* style.css */
[data-deck] {
  --deck-accent: #e11d48;
  --deck-font-sans: "Inter", sans-serif;
}

[data-slide] h1 {
  letter-spacing: -0.02em;
}
```

The theme properties and selectors are listed in the
[`@slidewright/react` README](../react/README.md#styling).

## Printing

Add `?print` to the address of the deck to see every slide at full size,
one after the other. Print the page, or save it as a PDF, from the browser:
each slide gets its own page, sized to the slide. `?print=steps` gives each
step its own page.

To export a PDF or PNG files from the command line, use
[`slidewright export`](../cli/README.md#export).

## Static files

Files in the project's `public` folder are served at the site root, as in
any Vite project. Reference them from the deck with a root path:

```md
![Architecture](/architecture.png)
```

The plugin replaces any `index.html` in the project with its own page.
