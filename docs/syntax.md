# Deck syntax

A deck is one Markdown file. This page is the reference for everything the
parser understands on top of
[GitHub Flavored Markdown](https://github.github.com/gfm/).

Design goals:

- **Reads well as plain Markdown.** Notes and steps are HTML comments, so a
  deck still looks sensible on GitHub or in any Markdown viewer.
- **Forgiving while you type.** Mistakes produce diagnostics instead of
  errors, and the rest of the deck keeps rendering.

## Slides

Slides are separated by a line containing only `---`.

```md
# First slide

---

# Second slide
```

- `---` inside a fenced code block is not a separator.
- Because `---` always separates slides, use `***` or `___` for a horizontal
  rule.
- A `---` at the end of the file does not create an empty slide.

## Frontmatter

A slide can start with a YAML block, written directly after its separator and
closed by another `---`:

```md
---
layout: two-cols
class: dense
---

# Comparing options
```

The block counts as frontmatter only if its **first line, immediately after
the separator, is a `key:` pair**. To start a slide with text such as
`Note: …`, leave a blank line after the separator.

Frontmatter is full YAML: nesting, lists and quoted strings all work. Invalid
YAML is reported as a diagnostic and the slide renders without settings.

### Slide keys

| Key      | Type   | Meaning                                                    |
| -------- | ------ | ---------------------------------------------------------- |
| `layout` | string | Layout to render the slide with. Defaults to `default`.    |
| `title`  | string | Slide title for navigation. Defaults to the first heading. |
| `steps`  | number | Overrides the number of steps counted on the slide.        |

Other keys are passed to the layout and renderer (for example `class` or
`image`). Their meaning is defined by the renderer: the README of
`@slidewright/react` lists its layouts and the keys they read.

## Headmatter

The frontmatter of the **first** slide, when the file starts with `---`,
configures the whole deck:

```md
---
title: Shipping faster
theme: default
aspectRatio: 16/9
defaults:
  layout: center
layout: cover
---

# Shipping faster
```

| Key           | Type                        | Default   | Meaning                                   |
| ------------- | --------------------------- | --------- | ----------------------------------------- |
| `title`       | string                      |           | Deck title.                               |
| `theme`       | string                      | `default` | Theme name.                               |
| `colorScheme` | `light` \| `dark` \| `auto` | `light`   | Colour scheme.                            |
| `aspectRatio` | `16/9`, `4:3`, `1.6`, …     | `16/9`    | Slide aspect ratio.                       |
| `canvasWidth` | number                      | `980`     | Slide width in CSS pixels before scaling. |
| `defaults`    | mapping                     | `{}`      | Frontmatter applied to every slide.       |

Slide keys in the headmatter (such as `layout` above) also apply to the first
slide. Unknown keys are kept for renderers and plugins.

## Speaker notes

Put notes in a `<!-- notes … -->` comment anywhere in the slide. Notes are
Markdown, and several notes comments on one slide are joined together.

```md
# Results

Revenue grew 40%.

<!-- notes
Pause here. Mention the churn numbers only if asked.
-->
```

### Notes for each step

A `[step]` line divides the notes by step. The text before the first marker
is for step 0, the text after the first marker for step 1, and so on, so a
presenter view can show what to say as each step appears.

```md
# Three reasons

- It's fast

<!-- step -->

- It's small

<!-- notes
There are two reasons, and the second one surprises people.
[step]
It's under 10 kB.
-->
```

A marker must be on its own line, outside code blocks. The number of markers
doesn't have to match the slide's steps.

## Steps

Steps reveal a slide bit by bit. Step `0` is what the audience sees first;
each "next" shows one more step before moving to the next slide.

### Step markers

`<!-- step -->` hides everything after it, up to the next marker, until the
next step:

```md
# Three reasons

- Speed

<!-- step -->

- Cost

<!-- step -->

- Safety
```

Markers apply **within their parent element**, so they also work inside raw
HTML and in the middle of a paragraph:

```md
<div class="grid grid-cols-2">

Always visible

<!-- step -->

Revealed on step 1

</div>

The answer is <!-- step --> **42**.
```

`<!-- step N -->` reveals at step `N` instead of the next step. Explicit
numbers don't affect automatic numbering. The slide's step count is the
highest step used, unless `steps` in the frontmatter overrides it.

### Code highlighting

A `{…}` block after the language highlights lines. Separate stages with `|`.
The first stage shows when the code block appears, and each later stage takes
one step:

````md
```ts {1|3-4|all}
const a = 1;

const b = 2;
const c = a + b;
```
````

- Lines: `3`, `3-5`, `1,3-5`, or `all` (also `*`).
- A single stage (`{2,4}`) is a static highlight and takes no steps.
- `@N` pins a stage to step `N`: `{1@2|3@4}`.

## Code blocks

Other options go after the language, in any order:

| Option         | Meaning                                              |
| -------------- | ---------------------------------------------------- |
| `{…}`          | Highlight stages (see above).                        |
| `lines`        | Show line numbers. `lines=10` starts counting at 10. |
| `title="name"` | Show a title, such as a file name, above the code.   |

````md
```ts {2} lines title="server.ts"
import { serve } from "./http";
serve({ port: 3000 });
```
````

## Directives

Block directives give names to regions of a slide. The renderer decides what a
name means:

- a **slot** of the slide's layout (for example `left` and `right` in a
  two-column layout),
- a **component** registered with the renderer,
- otherwise a plain `div` that you can style with CSS.

```md
---
layout: two-cols
---

# Before and after

:::left
Old checkout flow
:::

:::right{.highlight}
New checkout flow
:::

::video{src="/demo.mp4"}
```

- `:::name` … `:::` wraps Markdown content. Nest by using more colons on the
  outer directive.
- `::name` is a single-line directive with no content.
- `{…}` holds attributes: `#id`, `.class`, `key="value"`.

Inline directives (`:name`) are **not** part of the syntax, so text like
`Note:this` or `10:30` stays as written.

## HTML

Inline and block HTML work as in GitHub Flavored Markdown, and any element can
carry `class`, `style` and `data-*` attributes.

When a deck comes from an untrusted source, renderers sanitise the output by
default: scripts, event handlers, iframes and `javascript:` URLs are removed.
Trusted local decks can turn sanitising off.

## Maths

Inline maths uses `$…$` and display maths uses `$$…$$` (LaTeX syntax).
