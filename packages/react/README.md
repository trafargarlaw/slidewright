# @slidewright/react

Renders Markdown decks in React. Give it a string, and it shows a
presentation:

- one slide at a time, scaled to fit its container
- steps, and code with syntax colours
- navigation with the keyboard and with touch
- an overview of all the slides, and fullscreen
- a presenter view with notes and a timer, on the page or in a second
  window.

The deck follows its `markdown` prop. When you edit the source, the deck
renders again and stays on the same slide and step. So the deck works in
live editors, CMS previews and docs sites, and also to present.

The [deck syntax reference](../../docs/syntax.md) tells the deck format.

## Usage

```tsx
import { Deck } from "@slidewright/react";
import "@slidewright/react/styles.css";

export function Talk({ markdown }: { markdown: string }) {
  return <Deck markdown={markdown} />;
}
```

The deck fills the width of its container. Its height comes from the aspect
ratio of the deck. To fill a box of fixed size, also give the deck a height,
with `className` or `style`. The slide then scales to fit, with bars around
it.

You need React 19. The package has `"use client"`, and renders on the
server. Code gets its colours and maths gets drawn after hydration.

## Props

| Prop               | Default   | Description                                                                                                                         |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `markdown`         |           | The source of the deck.                                                                                                             |
| `position`         |           | `{ slide, step }` for a controlled deck. Use it with `onPositionChange`.                                                            |
| `defaultPosition`  | `{0, 0}`  | The start position of an uncontrolled deck.                                                                                         |
| `onPositionChange` |           | Gets the new position after each move.                                                                                              |
| `hash`             | `false`   | Keeps the position in the URL hash. See [URL hash](#url-hash).                                                                      |
| `layouts`          |           | More layouts, by name. A layout with a built-in name replaces the built-in layout.                                                  |
| `components`       |           | Components for `:::name` and `::name` directives, by name.                                                                          |
| `mermaid`          |           | Loads Mermaid, to draw `mermaid` code blocks: `() => import("mermaid")`. See [Diagrams](#diagrams).                                 |
| `icons`            |           | Icon sets for `:set:name:` icons, in the Iconify format. See [Icons](#icons).                                                       |
| `compileOptions`   |           | Sanitising and remark/rehype plugins, for the compiler. Do not make a new object on each render.                                    |
| `colorScheme`      |           | `light`, `dark` or `auto`. Replaces the value of the headmatter.                                                                    |
| `keyboard`         | `"focus"` | `"focus"`: keys work when the deck has the focus. `"global"`: keys work on all the page. `false`: keys don't work.                  |
| `swipe`            | `true`    | Swipe left and right on touch screens to move.                                                                                      |
| `presenter`        | `true`    | `P` and a button open the presenter view in a second window. See [Presenter window](#presenter-window).                             |
| `controls`         | `true`    | The buttons (previous, next, overview, presenter, fullscreen), the slide counter and the progress bar.                              |
| `className`        |           | A class on the root element of the deck.                                                                                            |
| `style`            |           | A style on the root element of the deck.                                                                                            |
| `ref`              |           | A `DeckHandle`: `next()`, `prev()`, `goTo(slide, step?)`, `focus()`, `toggleOverview()`, `toggleFullscreen()`, `togglePresenter()`. |

Positions start at 0. The deck changes a position outside the deck to the
nearest slide. When you remove slides during an edit, an uncontrolled deck shows the
last slide that is still there. When the slides come back, the deck goes
back to its position.

### Controlled position

Keep the position in your state to sync it with the URL, a presenter window
or the cursor of an editor:

```tsx
const [position, setPosition] = useState({ slide: 0, step: 0 });

<Deck markdown={markdown} position={position} onPositionChange={setPosition} />;
```

## Keyboard

| Keys                         | Action                                        |
| ---------------------------- | --------------------------------------------- |
| `→` `PageDown` `Space`       | Next step, then next slide                    |
| `←` `PageUp` `Shift`+`Space` | Previous step, then previous slide at its end |
| `↓` / `↑`                    | Next / previous slide, without the steps      |
| `Home` / `End`               | First / last slide                            |
| A number, then `Enter`       | Go to that slide                              |
| `O`                          | Open or close the overview                    |
| `F`                          | Go into or out of fullscreen                  |
| `P`                          | Open or close the presenter window            |

When you type a number, the counter shows it. `Backspace` corrects the
number, and `Escape` cancels it. The deck ignores keys that you type in
inputs, text areas and editable content on a slide.

On touch screens, swipe left for the next step and right for the previous
step. Vertical swipes scroll the page.

After each move, screen readers say the slide number and the title, such as
"Slide 2 of 8: Results". When the system asks for reduced motion, steps
show immediately and nothing moves. Only the controls fade in.

The overview shows all the slides in a grid, with all their steps. It
starts at the current slide. To go to a slide, move with the arrow keys and
press `Enter`, or click the slide. `Escape` or `O` closes the overview and
stays on the current slide. In fullscreen, the browser uses `Escape` to
leave fullscreen, so use `O`.

The fullscreen button shows only when the browser lets a page go
fullscreen. iPhones let only videos go fullscreen. In an iframe, the iframe
needs `allow="fullscreen"`. In fullscreen, the controls show only when the
pointer moves to them.

## URL hash

With `hash`, the URL follows the deck. `#3` is slide 3, and `#3.2` is slide
3 with two steps shown.

- When you load the page again or open a shared link, the deck starts at
  that position.
- When the hash changes, the deck moves. You can change the hash by hand,
  or with a link on a slide such as `[demo](#5)`.
- A controlled deck gets the position of the hash through
  `onPositionChange`.
- When the Markdown comes later, such as from a `fetch`, give the deck an
  empty string until then. The deck opens on the slide of the hash when the
  slides come.

The deck replaces the history entry when it moves. So the Back button
leaves the page, and doesn't go back through the talk. The hash is for all
the page, so use `hash` on one deck only. The anchors of the page, such as
`#install`, stay until the deck moves.

## Presenter view

`Presenter` is the view of the speaker. It shows:

- the current slide
- a preview of what the next key press shows
- the notes for the current step
- a timer.

Give it the same position as the deck of the audience. Then the two move
together:

```tsx
import { Deck, Presenter } from "@slidewright/react";

const [position, setPosition] = useState({ slide: 0, step: 0 });

<Deck markdown={markdown} position={position} onPositionChange={setPosition} />;
<Presenter
  markdown={markdown}
  position={position}
  onPositionChange={setPosition}
/>;
```

It takes the props of the deck for the source, the position, the URL hash,
layouts, components, compiling, the colour scheme, the keyboard and the
styling. It also takes the same keys, but not `O`, `F` and `P`. These keys
stay with the deck.

The preview shows the next step of the current slide. After the last step,
it shows the next slide. When `[step]` lines divide the notes, the notes
show in parts. See
[Notes for each step](../../docs/syntax.md#notes-for-each-step). The part
for the current step has a mark, and scrolls into view. The parts before it
are dimmed. The timer starts when the presenter mounts. You can pause it
and set it back to zero.

The presenter fills the height of its container. On a page of its own, give
it the height of the window, and let it take keys from all the page:

```tsx
<Presenter markdown={markdown} keyboard="global" style={{ height: "100dvh" }} />
```

### Presenter window

To open the presenter view in a second window, press `P` on a deck, or use
its presenter button. Put the window on a second screen. The deck and the
window move together. The keys that move, such as `→`, or a number and then
`Enter`, work in the two windows. `O`, `F` and `P` work on the deck only.
To close the window, press `P` or use the button again. The window also
closes with the page.

The window copies these from the page, and follows their changes:

- the `<link rel="stylesheet">` and `<style>` elements in the head of the
  page
- the attributes of the `<html>` element, such as a dark mode class.

The presenter in the window gets the `className` of the deck, and the
custom properties in its `style`, such as `--deck-accent`. So it has the
theme of the deck. It doesn't get the other properties of `style`, because
it fills the window.

The window doesn't copy:

- `<style>` elements in the body of the page
- rules that a script adds with `insertRule`. Some CSS-in-JS libraries add
  rules in this way in production.

The presenter in the window is not in the parent elements of the deck. So
a rule that selects the deck through a parent element, such as
`.page [data-deck]`, doesn't apply in the window.

Browsers open windows only after a click or a key press. A popup blocker
can also stop the window. `presenter={false}` removes the key and the
button. `togglePresenter()` on the `ref` of the deck still opens the window,
so you can use a button of your own.

## Printing

`PrintDeck` renders all the slides of a deck at full size, one after the
other, to print and to export. Each slide prints on its own page, with the
size of the slide. All the steps show, and code shows its last highlight
stage:

```tsx
import { PrintDeck } from "@slidewright/react";

<PrintDeck markdown={markdown} />;
```

With `steps`, it prints a page for each step, not for each slide. It also
takes these props of the deck: `layouts`, `components`, `mermaid`, `icons`,
`compileOptions`, `colorScheme`, `className` and `style`.

On the screen, the pages show one below the other, with a gap and a shadow,
as a preview. In print, each page is on a sheet of its own. The component
sets the size of the printed page to the size of the slide. So put it on a
page of its own, without other content to print.

Code colours and maths load after the first render. A code block has
`aria-busy="true"` until its colours are ready. Maths has it until it is
drawn. So a script that prints or captures the pages can wait until no
element has `[aria-busy="true"]`.

## Layouts

A slide sets its layout with `layout:` in its frontmatter. The built-in
layouts are:

| Layout                      | Arrangement                                                    |
| --------------------------- | -------------------------------------------------------------- |
| `default`                   | Content from the top left.                                     |
| `center`                    | Content in the centre.                                         |
| `cover`                     | A title slide: a large heading and a subtitle.                 |
| `section`                   | The start of a section.                                        |
| `statement`                 | One large heading, in the centre.                              |
| `fact`                      | A large number or word in the accent colour, and a caption.    |
| `quote`                     | A large `>` quote. The text after it is the source.            |
| `full`                      | No padding.                                                    |
| `two-cols`                  | Content at the top, then the `:::left` and `:::right` columns. |
| `image`                     | `image:` fills the slide. The content is at the bottom.        |
| `image-left`, `image-right` | Content next to `image:`.                                      |

The image layouts read the URL of the image from `image:`, and its
description from `imageAlt:`. Without `imageAlt:`, the image is decoration,
and screen readers skip it.

```md
---
layout: quote
---

> Simplicity is prerequisite for reliability.

Edsger W. Dijkstra
```

```md
---
layout: image
image: /photos/harbour.jpg
imageAlt: Fishing boats in a harbour at dawn
---

# Where we started
```

### Custom layouts

A custom layout is a component. Give it a name in the `layouts` prop. It
gets the content of the slide as `children`. Its `slots` list names
container directives. The layout gets these directives in `slots`, not in
`children`, when they are at the top level of the slide:

```tsx
import type { LayoutProps } from "@slidewright/react";

function Sidebar({ children, slots }: LayoutProps) {
  return (
    <>
      <div data-part="main">{children}</div>
      <aside data-part="aside">{slots.aside}</aside>
    </>
  );
}
Sidebar.slots = ["aside"];

<Deck markdown={markdown} layouts={{ sidebar: Sidebar }} />;
```

```md
---
layout: sidebar
---

# Release plan

- Beta in May
- Launch in June

:::aside
Owned by the platform team
:::
```

The layout renders in the `<section data-layout="sidebar">` of the slide.
So CSS can arrange it by name:

```css
[data-layout="sidebar"] {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2em;
}
```

- `slide.frontmatter` has the settings of the slide. So a layout can read
  its own settings, as the image layouts read `image:`.
- A layout with a built-in name replaces the built-in layout in the deck,
  the overview and the presenter view.
- A layout name without a component renders as `default`, and keeps the
  name in `data-layout`. So a layout that only changes the look needs only
  CSS:

```css
[data-layout="agenda"] :where(ol) {
  font-size: 1.3em;
}
```

## Components

Give components for directives in the `components` prop. A component gets
the attributes of the directive as string props, and its content as
`children`:

```tsx
function Callout({
  tone = "info",
  children,
}: {
  tone?: string;
  children?: ReactNode;
}) {
  return <aside className={`callout ${tone}`}>{children}</aside>;
}

<Deck markdown={markdown} components={{ callout: Callout }} />;
```

```md
:::callout{tone="warning"}
Mind the **gap**.
:::
```

When sanitising is on, which is the default, a component doesn't get event
handlers (`on…`), `srcdoc`, or `javascript:` and `vbscript:` URLs. The other
attributes are text that the author of the deck wrote. Use them as text
only.

Each directive renders as a `div` with `data-directive="name"`. The `div`
keeps the id, the classes and the step of the directive. A component
renders in that `div`. Without a component, the content goes directly in
the `div`, so you can style a directive with CSS only. When a component
throws, only its slide breaks.

## Diagrams

The deck draws a `mermaid` code block as a diagram when it can load
[Mermaid](https://mermaid.js.org). Mermaid is a large package, so
`@slidewright/react` doesn't depend on it. Install it:

```sh
npm install mermaid
```

Then give the deck a function that loads it:

```tsx
// Outside the component, or the deck gets a new function on each render.
const loadMermaid = () => import("mermaid");

<Deck markdown={markdown} mermaid={loadMermaid} />;
```

Mermaid loads in its own chunk, with the first diagram that a deck shows.
Without the `mermaid` prop, the block stays a code block. `Presenter` and
`PrintDeck` take the same prop.

The deck draws a diagram in the colours and the font of its slide: its
`--deck-bg`, `--deck-fg`, `--deck-accent` and the other colour properties.
When these change, for example with the colour scheme, the deck draws the
diagram again. The config of the diagram, in the
[frontmatter or a directive](https://mermaid.js.org/config/configuration.html)
of its source, can set other `themeVariables`.

A diagram has the size that Mermaid gives it. It is not wider than its
container. At the top level of a slide and in the columns of `two-cols`, it
gets smaller when the slide has no more room. To set a size, use CSS:

```css
[data-diagram] > svg {
  max-height: 300px;
}
```

The source shows until the diagram is drawn, and on the server. When the
source has a mistake, the source stays, with the message of Mermaid below
it. Mermaid runs with `securityLevel: "strict"`. So labels can't have
scripts, and diagrams have no click handlers.

## Icons

`:set:name:` in the text of a deck is an icon: `:lucide:rocket:` is the
`rocket` of the set `lucide`. The deck draws the icons of the sets in its
`icons` prop. The sets use the [Iconify](https://iconify.design) format. So
the `icons.json` of all `@iconify-json/*` packages works. Install a set:

```sh
npm install @iconify-json/lucide
```

Then give it to the deck:

```tsx
import lucide from "@iconify-json/lucide/icons.json";

<Deck markdown={markdown} icons={[lucide]} />;
```

Find the sets and the names of their icons at
[icon-sets.iconify.design](https://icon-sets.iconify.design). A set has
thousands of icons. To keep a set out of the first script of the page, load
it with `import()`. Give it to the deck when it comes. Until then, the deck
shows the source text. It also shows the source text for an icon that no
set has. `Presenter` and `PrintDeck` take the same prop. With the Vite
plugin or the CLI, the page gets only the icons that the deck uses. See
[Icons](../vite/README.md#icons) in the README of the plugin.

To add your own icons, make a set with the same shape. A `body` is the
content of the `<svg>` of the icon:

```tsx
const brand: IconSet = {
  prefix: "brand",
  width: 24,
  height: 24,
  icons: { logo: { body: '<path fill="currentColor" d="M3 3h18v18H3z"/>' } },
};

<Deck markdown=":brand:logo: Acme" icons={[lucide, brand]} />;
```

The deck puts a `body` in the page with no change. So use only sets that
you trust.

An icon is an `<svg data-icon="set:name">`. It is as tall as the text
around it. When the set draws with `currentColor`, the icon has the colour
of the text. To change the size and the colour, style the element around
the icon, or select the icon:

```css
[data-slide] h1 svg[data-icon] {
  color: var(--deck-accent);
}
```

Screen readers skip icons. To give an icon a name, write its element with a
`title`: `<span data-icon="lucide:rocket" title="Launch"></span>`.

## Transitions

A slide with `transition:` in its frontmatter comes in with an animation.
The theme has `fade`, `slide`, `slide-up` and `zoom`. The
[syntax reference](../../docs/syntax.md#transitions) tells what each one
does. `<Deck>` plays them. `<Presenter>` and `<PrintDeck>` change slides
immediately.

During a move, the canvas holds two slides: the slide that goes out, then
the slide that comes in. Each slide has these attributes until the
animations of the two slides end:

| Attribute                   | Value                                        |
| --------------------------- | -------------------------------------------- |
| `data-transition`           | The name, from the later of the two slides   |
| `data-transition-state`     | `entering` or `leaving`                      |
| `data-transition-direction` | `forward`, or `backward` to an earlier slide |

The slide that goes out doesn't change. It stays at its step, and its
components keep their state. It is `inert`, and screen readers don't see
it.

The theme properties `--deck-transition-duration` and
`--deck-transition-easing` set the speed of all transitions.

### Your own transitions

A name that the theme doesn't have does nothing until your CSS gives an
animation to each of the two slides:

```md
---
transition: turn
---
```

```css
[data-slide][data-transition="turn"][data-transition-state="entering"] {
  animation-name: turn-in;
}

[data-slide][data-transition="turn"][data-transition-state="leaving"] {
  animation-name: turn-out;
}

@keyframes turn-in {
  from {
    opacity: 0;
    rotate: calc(12deg * var(--deck-transition-direction));
  }
}

@keyframes turn-out {
  to {
    opacity: 0;
    rotate: calc(-12deg * var(--deck-transition-direction));
  }
}
```

- The theme gives the two slides the duration, the easing and
  `animation-fill-mode: both`. To change the speed of one transition, set
  `animation-duration`.
- `--deck-transition-direction` is `1` towards a later slide and `-1`
  towards an earlier slide. So one pair of animations can play in the two
  directions.
- An animation for only one of the slides is sufficient. The other slide
  waits. The deck removes the slide that goes out when the two slides have
  no more animations. An animation that repeats with no end doesn't count.
- With reduced motion, the theme gives the animations no duration. So the
  slides change immediately.

## Styling

`styles.css` has the deck controls, the built-in layouts and the default
theme. All of them are in the `slidewright` cascade layer. A rule in your
own CSS that is not in a layer has priority over them.

For maths, `styles.css` imports the stylesheet and the fonts of KaTeX
(`katex/dist/katex.min.css`) into the same layer. Your bundler finds that
import in `node_modules`. KaTeX loads with the first slide that has maths.

This rule also applies to resets. A global `* { margin: 0; padding: 0 }`
that is not in a layer removes the padding and the spacing of the slides.
So put resets in a layer that comes before `slidewright`. With Tailwind,
give the sequence of the layers before you import Tailwind. Then the
preflight reset comes first, and the utilities still have priority:

```css
@layer theme, base, slidewright, components, utilities;
@import "tailwindcss";
```

To give a deck a theme, set custom properties on `[data-deck]`, or on a
class that you give to the deck:

```css
.my-deck {
  --deck-bg: #0b1020;
  --deck-fg: #f3f4f8;
  --deck-accent: #ffb000;
  --deck-font-sans: "Inter", sans-serif;
  --deck-font-size: 26px;
}
```

```tsx
<Deck markdown={markdown} className="my-deck" />
```

Don't set them on a parent element of the deck. The default theme sets
them on `[data-deck]`, so the deck doesn't get the values of its parent.

| Property                                   | Controls                                      |
| ------------------------------------------ | --------------------------------------------- |
| `--deck-bg`, `--deck-fg`, `--deck-muted`   | The background, the text and the second text  |
| `--deck-accent`                            | Links, the focus ring, progress and quotes    |
| `--deck-border`, `--deck-surface`          | Rules and tables; code backgrounds            |
| `--deck-code-foreground`                   | Code text (`--deck-fg` by default)            |
| `--deck-code-background`                   | Code blocks (`--deck-surface` by default)     |
| `--deck-backdrop`                          | The bars around the slide                     |
| `--deck-font-sans`, `--deck-font-heading`  | The body and heading fonts                    |
| `--deck-font-mono`                         | The code font                                 |
| `--deck-font-size`, `--deck-line-height`   | The base text size on the canvas              |
| `--deck-padding`, `--deck-radius`          | The slide padding and the corner radius       |
| `--deck-step-duration`                     | The step animation (0 with reduced motion)    |
| `--deck-transition-duration`               | The transition between slides (400ms)         |
| `--deck-transition-easing`                 | The timing function of the transition         |
| `--deck-dim-opacity`                       | The opacity of the code lines not highlighted |
| `--deck-notes-font-size`                   | The notes text in the presenter view          |
| `--deck-code-token-*`                      | Syntax colours (`keyword`, `string`, …)       |
| `--deck-code-added`, `--deck-code-removed` | Added and removed lines in diffs              |

The colours use `light-dark()`. So a theme can give the colours of the two
schemes in one value.

### Selectors

The content of a slide is usual HTML, and usual selectors style it. The
renderer adds data attributes for all other parts:

| Selector                | Element                                               |
| ----------------------- | ----------------------------------------------------- |
| `[data-deck]`           | The root. `data-theme`, `data-color-scheme`           |
| `[data-slide]`          | A slide. `data-layout`, and the `class:` value        |
| `[data-transition]`     | A slide in a [transition](#transitions)               |
| `[data-part]`           | Layout parts (`content`, `image`, `left`…)            |
| `[data-slot]`           | Content in a layout slot                              |
| `[data-directive]`      | A directive, by name                                  |
| `[data-step-state]`     | Step content: `future`, `current` or `past`           |
| `[data-code]`           | A code block figure. `aria-busy` while it loads       |
| `[data-line-state]`     | A code line: `highlighted` or `dimmed`                |
| `[data-line-diff]`      | A code line: `added` or `removed`                     |
| `[data-diff-marker]`    | The `+` or `-` before a diff line                     |
| `[data-math]`           | Maths: `inline` or `display`                          |
| `[data-diagram]`        | A diagram figure. `aria-busy` until it is drawn       |
| `svg[data-icon]`        | An icon, by `set:name`                                |
| `[data-deck-controls]`  | The buttons and the slide counter                     |
| `[data-deck-progress]`  | The progress bar                                      |
| `[data-deck-overview]`  | The overview grid                                     |
| `[data-deck-thumbnail]` | A slide in the overview. `data-current`               |
| `[data-presenter]`      | The presenter root, with `data-deck`                  |
| `[data-presenter-note]` | A part of the notes. With `[step]`, `data-note-state` |
| `[data-deck-print]`     | The `PrintDeck` root, with `data-deck`                |
| `[data-deck-page]`      | A printed page. `data-page-slide`, `-step`            |
| `[data-slide-error]`    | A slide that didn't compile or render                 |

The thumbnails in the overview are also slides. So slide CSS styles them in
the same way. To style only the slide that you present, put
`[data-deck-viewport]` in the selector. The current slide of the presenter
is also in a `[data-deck-viewport]`.

`data-page-slide` starts at 0, as positions do. `data-page-step` is there
only with `steps`.

The slide canvas has a fixed size: `canvasWidth` in the headmatter, 980px
by default. The deck scales it to fit. So sizes in slide CSS are canvas
pixels, and look the same on all screen sizes.

## Types

| Type                  | What it is                                                                     |
| --------------------- | ------------------------------------------------------------------------------ |
| `DeckProps`           | The props of `Deck`. See [Props](#props).                                      |
| `DeckHandle`          | The `ref` of `Deck`: `next()`, `goTo(slide, step?)`, `togglePresenter()`, …    |
| `DeckPosition`        | `{ slide, step }`. `slide` starts at 0, and step `0` is before the first step. |
| `PresenterProps`      | The props of `Presenter`: the props of the deck that it takes.                 |
| `PrintDeckProps`      | The props of `PrintDeck`. See [Printing](#printing).                           |
| `Layout`              | A layout component, with its optional `slots` list.                            |
| `LayoutProps`         | The props that a layout gets: `slide`, `children` and `slots`.                 |
| `DirectiveComponents` | The `components` prop: components by directive name.                           |
| `MermaidLoader`       | The `mermaid` prop: a function that loads Mermaid. See [Diagrams](#diagrams).  |
| `IconSet`             | A set of the `icons` prop: icons in the Iconify format. See [Icons](#icons).   |
