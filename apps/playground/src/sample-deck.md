---
title: Markdown in, slides out
layout: cover
---

# Markdown in, slides out

A live playground for Slidewright

<!-- notes
Everything on the right is rendered from the Markdown on the left. Edit it and
the preview follows.
-->

---

# A deck is one Markdown file

- Slides are separated by `---`
- Frontmatter picks a layout

<!-- step -->

- Step markers reveal content bit by bit

<!-- step -->

- Arrow keys move through steps and slides

<!-- notes
Each slide is plain Markdown, so the file reads well anywhere.
[step]
Step markers are HTML comments, invisible on GitHub.
[step]
Click the preview and use the arrow keys to present. Press P to see these
notes in a second window.
-->

---
layout: section
---

# Code

---

# Walk through code

```ts {1|3-4|all} lines title="outline.ts"
import { parseDeck } from "@slidewright/core";

const deck = parseDeck(markdown);
const outline = deck.slides.map((slide) => slide.title);
```

<!-- notes
Highlight stages take one step each.
[step]
Parse the deck, then read each slide's title.
[step]
That's the whole outline.
-->

---
layout: two-cols
---

# Two columns

:::left
### Before

- One long document
- Formatting by hand
:::

:::right
### After

- One slide per `---`
- Layouts do the arranging
:::

---

# Tables and maths

| Feature | Syntax                     |
| ------- | -------------------------- |
| Steps   | `<!-- step -->`            |
| Notes   | `<!-- notes … -->`         |
| Columns | `:::left` and `:::right`   |

Inline maths like $e^{i\pi} + 1 = 0$ works too.

---
layout: center
---

# Your turn

Edit the Markdown, or ask the AI below it.
