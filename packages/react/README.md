# @react-slides/react

Renders Markdown decks in React. Pass a string, get a presentation: one slide
at a time, scaled to fit its container, with step reveals, syntax-highlighted
code and keyboard navigation.

The deck follows its `markdown` prop. Edit the source and the deck
re-renders in place, staying on the current slide and step, so it works for
live editors, CMS previews and docs sites as well as plain presenting.

The deck format is documented in [docs/syntax.md](../../docs/syntax.md).

## Usage

```tsx
import { Deck } from "@react-slides/react";
import "@react-slides/react/styles.css";

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

| Prop               | Default   | Description                                                                           |
| ------------------ | --------- | ------------------------------------------------------------------------------------- |
| `markdown`         |           | The deck source.                                                                      |
| `position`         |           | `{ slide, step }` for a controlled deck. Use with `onPositionChange`.                 |
| `defaultPosition`  | `{0, 0}`  | Starting position for an uncontrolled deck.                                           |
| `onPositionChange` |           | Called with the new position on every navigation.                                     |
| `layouts`          |           | Extra layouts by name. A built-in name replaces the built-in layout.                  |
| `components`       |           | Components for `:::name` and `::name` directives, by name.                            |
| `compileOptions`   |           | Sanitising and remark/rehype plugins, passed to the compiler. Keep the object stable. |
| `colorScheme`      |           | `light`, `dark` or `auto`. Overrides the deck's headmatter.                           |
| `keyboard`         | `"focus"` | `"focus"`: keys work while the deck has focus. `"global"`: anywhere. `false`: off.    |
| `controls`         | `true`    | Previous and next buttons, slide counter and progress bar.                            |
| `className`        |           | Class on the deck's root element.                                                     |
| `style`            |           | Style on the deck's root element.                                                     |
| `ref`              |           | A `DeckHandle`: `next()`, `prev()`, `goTo(slide, step?)`, `focus()`.                  |

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

Keys typed into inputs, text areas and editable content on a slide are left
alone.

## Layouts

A slide picks its layout with `layout:` in its frontmatter. Built in:

| Layout                      | Arrangement                                            |
| --------------------------- | ------------------------------------------------------ |
| `default`                   | Content from the top left.                             |
| `center`                    | Content centred.                                       |
| `cover`                     | Title slide: large heading, subtitle.                  |
| `section`                   | Section divider.                                       |
| `full`                      | No padding.                                            |
| `two-cols`                  | Content on top, then `:::left` and `:::right` columns. |
| `image-left`, `image-right` | Content beside `image:` (with optional `imageAlt:`).   |

Unknown layout names render with `default`, keeping the name in
`data-layout` so CSS can still target them.

A custom layout is a component. Container directives named in its `slots`
are lifted out of the content and passed separately:

```tsx
import type { LayoutProps } from "@react-slides/react";

function Quote({ children, slots }: LayoutProps) {
  return (
    <figure>
      <blockquote>{children}</blockquote>
      <figcaption>{slots.author}</figcaption>
    </figure>
  );
}
Quote.slots = ["author"];

<Deck markdown={markdown} layouts={{ quote: Quote }} />;
```

```md
---
layout: quote
---

Simplicity is prerequisite for reliability.

:::author
Edsger W. Dijkstra
:::
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
theme, all inside the `react-slides` cascade layer. Any rule in your own CSS
outside a layer wins over it.

That includes resets. A global `* { margin: 0; padding: 0 }` outside a layer
strips the slide padding and spacing, so put resets in a layer declared before
`react-slides`. With Tailwind, declare the order before importing it, so the
preflight reset comes first and utilities still win:

```css
@layer theme, base, react-slides, components, utilities;
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

| Property                                  | Controls                                 |
| ----------------------------------------- | ---------------------------------------- |
| `--deck-bg`, `--deck-fg`, `--deck-muted`  | Slide background, text, secondary text   |
| `--deck-accent`                           | Links, focus ring, progress, quotes      |
| `--deck-border`, `--deck-surface`         | Rules and tables; code backgrounds       |
| `--deck-backdrop`                         | Letterbox around the slide               |
| `--deck-font-sans`, `--deck-font-heading` | Body and heading fonts                   |
| `--deck-font-mono`                        | Code font                                |
| `--deck-font-size`, `--deck-line-height`  | Base text size on the canvas             |
| `--deck-padding`, `--deck-radius`         | Slide padding, corner radius             |
| `--deck-step-duration`                    | Reveal animation (0 with reduced motion) |
| `--deck-dim-opacity`                      | Opacity of lines not highlighted in code |
| `--deck-code-token-*`                     | Syntax colours (`keyword`, `string`, …)  |

Colours use `light-dark()`, so a theme can define both schemes in one value.

### Selectors

Slide content is ordinary HTML, styled with ordinary selectors. The renderer
adds data attributes for everything else:

| Selector               | Element                                      |
| ---------------------- | -------------------------------------------- |
| `[data-deck]`          | Root. `data-theme`, `data-color-scheme`      |
| `[data-slide]`         | Current slide. `data-layout`, plus `class:`  |
| `[data-part]`          | Layout regions (`columns`, `left`, `image`…) |
| `[data-slot]`          | Content placed in a layout slot              |
| `[data-directive]`     | A directive, by name                         |
| `[data-step-state]`    | Step content: `future`, `current` or `past`  |
| `[data-code]`          | Code block figure                            |
| `[data-line-state]`    | Code line: `highlighted` or `dimmed`         |
| `[data-deck-controls]` | Previous/next buttons and counter            |
| `[data-deck-progress]` | Progress bar                                 |

The slide canvas has a fixed size (`canvasWidth` in the headmatter, 980px by
default) and is scaled to fit, so sizes in slide CSS are canvas pixels and
look the same at any screen size.
