# @slidewright/react

Renders Markdown decks in React. Pass a string, get a presentation: one slide
at a time, scaled to fit its container, with step reveals, syntax-highlighted
code, keyboard and touch navigation, an overview of every slide, fullscreen,
and a presenter view with notes and a timer, on the page or in a second
window.

The deck follows its `markdown` prop. Edit the source and the deck
re-renders in place, staying on the current slide and step, so it works for
live editors, CMS previews and docs sites as well as plain presenting.

The deck format is documented in [docs/syntax.md](../../docs/syntax.md).

## Usage

```tsx
import { Deck } from "@slidewright/react";
import "@slidewright/react/styles.css";

export function Talk({ markdown }: { markdown: string }) {
  return <Deck markdown={markdown} />;
}
```

The deck fills the width of its container and takes its height from the
deck's aspect ratio. Give it a height as well (through `className` or `style`)
to fill a fixed box; the slide scales to fit and is letterboxed.

Requires React 19. The package ships with `"use client"` and renders on the
server; code is highlighted after hydration.

## Props

| Prop               | Default   | Description                                                                                                                         |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `markdown`         |           | The deck source.                                                                                                                    |
| `position`         |           | `{ slide, step }` for a controlled deck. Use with `onPositionChange`.                                                               |
| `defaultPosition`  | `{0, 0}`  | Starting position for an uncontrolled deck.                                                                                         |
| `onPositionChange` |           | Called with the new position on every navigation.                                                                                   |
| `hash`             | `false`   | Keeps the position in the URL hash. See [URL hash](#url-hash).                                                                      |
| `layouts`          |           | Extra layouts by name. A built-in name replaces the built-in layout.                                                                |
| `components`       |           | Components for `:::name` and `::name` directives, by name.                                                                          |
| `compileOptions`   |           | Sanitising and remark/rehype plugins, passed to the compiler. Keep the object stable.                                               |
| `colorScheme`      |           | `light`, `dark` or `auto`. Overrides the deck's headmatter.                                                                         |
| `keyboard`         | `"focus"` | `"focus"`: keys work while the deck has focus. `"global"`: anywhere. `false`: off.                                                  |
| `swipe`            | `true`    | Swipe left and right on touch screens to navigate.                                                                                  |
| `presenter`        | `true`    | `P` and a button open the presenter view in a second window. See [Presenter window](#presenter-window).                             |
| `controls`         | `true`    | Previous, next, overview, presenter and fullscreen buttons, slide counter and progress bar.                                         |
| `className`        |           | Class on the deck's root element.                                                                                                   |
| `style`            |           | Style on the deck's root element.                                                                                                   |
| `ref`              |           | A `DeckHandle`: `next()`, `prev()`, `goTo(slide, step?)`, `focus()`, `toggleOverview()`, `toggleFullscreen()`, `togglePresenter()`. |

Positions are 0-based and clamped to the deck. When slides are removed while
editing, an uncontrolled deck shows the last slide that still exists and
returns to the original position if they come back.

### Controlled position

Own the position to sync it with the URL, a presenter window or an editor
cursor:

```tsx
const [position, setPosition] = useState({ slide: 0, step: 0 });

<Deck markdown={markdown} position={position} onPositionChange={setPosition} />;
```

## Keyboard

| Keys                         | Action                                  |
| ---------------------------- | --------------------------------------- |
| `→` `PageDown` `Space`       | Next step, then next slide              |
| `←` `PageUp` `Shift`+`Space` | Previous step; previous slide, revealed |
| `↓` / `↑`                    | Next / previous slide, skipping steps   |
| `Home` / `End`               | First / last slide                      |
| A number, then `Enter`       | Go to that slide                        |
| `O`                          | Open or close the overview              |
| `F`                          | Enter or leave fullscreen               |
| `P`                          | Open or close the presenter window      |

While a number is being typed, the counter shows it; `Backspace` corrects it
and `Escape` cancels it. Keys typed into inputs, text areas and editable
content on a slide are left alone.

On touch screens, swipe left for the next step and right for the previous
one. Vertical swipes still scroll the page.

The overview shows every slide in a grid, fully revealed, starting from the
current one. Move through it with the arrow keys and press `Enter` to go to a
slide, or click one. `Escape` or `O` closes it without moving. In
fullscreen, browsers keep `Escape` for leaving fullscreen, so use `O` there.

The fullscreen button only appears where the browser allows fullscreen:
not on iPhones, which only allow it for videos, and in an iframe only with
`allow="fullscreen"`. In fullscreen, the controls stay hidden until the
pointer reaches them.

## URL hash

With `hash`, the URL follows the deck: `#3` is slide 3, and `#3.2` is slide 3
with two steps revealed. Reloading the page or opening a shared link starts
the deck there, and changing the hash, by hand or through a link such as
`[demo](#5)` on a slide, moves the deck. A controlled deck gets the hash's
position through `onPositionChange`.

The deck replaces the history entry as it moves, so Back leaves the page
instead of stepping back through the talk. The hash belongs to the whole
page, so turn it on for one deck at most; the page's own anchors, such as
`#install`, stay until the deck moves.

## Presenter view

`Presenter` is the speaker's view of a deck: the current slide, a preview of
what the next key press shows, the notes for the current step and a timer.
Give it the same position as the audience's deck and the two move together:

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

It takes the deck's props for the source, position, layouts, components,
compiling, colour scheme, keyboard and styling, and the same keys, except `O`,
`F` and `P`, which stay with the deck.

The preview shows the next step of the current slide, or the next slide once
every step is revealed. Notes divided by `[step]` lines (see
[Notes for each step](../../docs/syntax.md#notes-for-each-step)) show in
parts: the part for the current step is marked and scrolled into view, and
earlier parts are dimmed. The timer starts when the presenter mounts, and can
be paused and reset.

The presenter fills the height of its container. On a page of its own, give
it the window's height and let it take keys from anywhere:

```tsx
<Presenter markdown={markdown} keyboard="global" style={{ height: "100dvh" }} />
```

### Presenter window

Press `P` on a deck, or use its presenter button, to open the presenter view
in a second window, for a second screen. The deck and the window move
together, and keys work in either. `P` or the button again closes the
window, and it closes with the page.

The window copies the page's stylesheets, the `<link rel="stylesheet">` and
`<style>` elements in its head, and the attributes of its `<html>` element,
such as a dark mode class, and follows changes to them. Rules added through
`insertRule`, as some CSS-in-JS libraries do in production, are not copied.

Browsers only open windows in response to a click or key press, and a popup
blocker may still stop it. `presenter={false}` removes the key and the
button; `togglePresenter()` on the deck's `ref` still opens the window, from
a button of your own.

## Layouts

A slide picks its layout with `layout:` in its frontmatter. Built in:

| Layout                      | Arrangement                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `default`                   | Content from the top left.                                  |
| `center`                    | Content centred.                                            |
| `cover`                     | Title slide: large heading, subtitle.                       |
| `section`                   | Section divider.                                            |
| `statement`                 | One large heading, centred.                                 |
| `fact`                      | A large number or word in the accent colour, and a caption. |
| `quote`                     | A large `>` quote, with the text after it as the source.    |
| `full`                      | No padding.                                                 |
| `two-cols`                  | Content on top, then `:::left` and `:::right` columns.      |
| `image`                     | `image:` fills the slide, with the content at the bottom.   |
| `image-left`, `image-right` | Content beside `image:`.                                    |

The image layouts read the image URL from `image:` and its description from
`imageAlt:`. Without `imageAlt:` the image counts as decoration, and screen
readers skip it.

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

A custom layout is a component, registered by name with `layouts`. It gets
the slide's content as `children`. Container directives named in its `slots`
are lifted out of the content and passed in `slots` instead:

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

The layout renders inside the slide's `<section data-layout="sidebar">`, so
CSS can arrange it by name:

```css
[data-layout="sidebar"] {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2em;
}
```

- `slide.frontmatter` holds the slide's settings, so a layout can take its
  own, like `image:` for the image layouts.
- A layout with a built-in name replaces the built-in one, in the deck, the
  overview and the presenter view.
- A layout name with no component renders like `default`, keeping the name in
  `data-layout`. A layout that only changes the look needs CSS alone:

```css
[data-layout="agenda"] :where(ol) {
  font-size: 1.3em;
}
```

## Components

Register components for directives. A component gets the directive's
attributes as string props and its content as `children`:

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

Directives without a registered component render their content in a `div`
with `data-directive="name"`, so they can be styled with CSS alone. A
component that throws only breaks its own slide.

## Styling

`styles.css` contains the deck chrome, the built-in layouts and the default
theme, all inside the `slidewright` cascade layer. Any rule in your own CSS
outside a layer wins over it.

That includes resets. A global `* { margin: 0; padding: 0 }` outside a layer
strips the slide padding and spacing, so put resets in a layer declared before
`slidewright`. With Tailwind, declare the order before importing it, so the
preflight reset comes first and utilities still win:

```css
@layer theme, base, slidewright, components, utilities;
@import "tailwindcss";
```

Theme a deck with custom properties on `[data-deck]` or any parent:

```css
.my-deck {
  --deck-bg: #0b1020;
  --deck-fg: #f3f4f8;
  --deck-accent: #ffb000;
  --deck-font-sans: "Inter", sans-serif;
  --deck-font-size: 26px;
}
```

| Property                                   | Controls                                 |
| ------------------------------------------ | ---------------------------------------- |
| `--deck-bg`, `--deck-fg`, `--deck-muted`   | Slide background, text, secondary text   |
| `--deck-accent`                            | Links, focus ring, progress, quotes      |
| `--deck-border`, `--deck-surface`          | Rules and tables; code backgrounds       |
| `--deck-backdrop`                          | Letterbox around the slide               |
| `--deck-font-sans`, `--deck-font-heading`  | Body and heading fonts                   |
| `--deck-font-mono`                         | Code font                                |
| `--deck-font-size`, `--deck-line-height`   | Base text size on the canvas             |
| `--deck-padding`, `--deck-radius`          | Slide padding, corner radius             |
| `--deck-step-duration`                     | Reveal animation (0 with reduced motion) |
| `--deck-dim-opacity`                       | Opacity of lines not highlighted in code |
| `--deck-notes-font-size`                   | Notes text in the presenter view         |
| `--deck-code-token-*`                      | Syntax colours (`keyword`, `string`, …)  |
| `--deck-code-added`, `--deck-code-removed` | Added and removed lines in diffs         |

Colours use `light-dark()`, so a theme can define both schemes in one value.

### Selectors

Slide content is ordinary HTML, styled with ordinary selectors. The renderer
adds data attributes for everything else:

| Selector                | Element                                      |
| ----------------------- | -------------------------------------------- |
| `[data-deck]`           | Root. `data-theme`, `data-color-scheme`      |
| `[data-slide]`          | A slide. `data-layout`, plus `class:`        |
| `[data-part]`           | Layout regions (`content`, `image`, `left`…) |
| `[data-slot]`           | Content placed in a layout slot              |
| `[data-directive]`      | A directive, by name                         |
| `[data-step-state]`     | Step content: `future`, `current` or `past`  |
| `[data-code]`           | Code block figure                            |
| `[data-line-state]`     | Code line: `highlighted` or `dimmed`         |
| `[data-line-diff]`      | Code line: `added` or `removed`              |
| `[data-diff-marker]`    | The `+` or `-` before a diff line            |
| `[data-deck-controls]`  | Previous/next buttons and counter            |
| `[data-deck-progress]`  | Progress bar                                 |
| `[data-deck-overview]`  | Overview grid                                |
| `[data-deck-thumbnail]` | A slide in the overview. `data-current`      |
| `[data-presenter]`      | Presenter root, alongside `data-deck`        |
| `[data-presenter-note]` | Notes part. `data-note-state`, as for steps  |

Thumbnails in the overview are slides too, so slide CSS styles them the same
way. Scope a rule to `[data-deck-viewport]` to style only the slide being
presented; the presenter's current slide is in one too.

The slide canvas has a fixed size (`canvasWidth` in the headmatter, 980px by
default) and is scaled to fit, so sizes in slide CSS are canvas pixels and
look the same at any screen size.
