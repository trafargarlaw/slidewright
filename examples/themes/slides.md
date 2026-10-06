---
title: Themes
# A built-in theme: default, paper, frost, contrast or vivid.
theme: paper
layout: cover
---

# Themes

One deck in each built-in theme. Change `theme:` in the headmatter.

<!-- notes
Each theme has colours for light and for dark. `colorScheme:` in the
headmatter selects one, or `auto` follows the system.
-->

---
layout: section
---

# Text

---

# What a theme changes

- The colours, for light and for dark
- The font of the headings
- The look of some layouts, such as `section` and `quote`

<!-- step -->

A theme keeps the size of the text and the padding. A deck that fits with
one theme fits with all of them.

---

# Code

```ts {2-3} title="greet.ts"
export function greet(name: string): string {
  // The highlight dims the other lines.
  return `Hello, ${name}!`;
}
```

---

# Which theme

| Theme      | For                         |
| ---------- | --------------------------- |
| `default`  | All decks                   |
| `paper`    | Talks that tell a story     |
| `frost`    | Technical talks             |
| `contrast` | Bright rooms and low vision |
| `vivid`    | Keynotes                    |

---
layout: fact
---

# 4.5 : 1

The lowest contrast of text in a theme

---
layout: quote
---

> Design is not just what it looks like and feels like. Design is how it
> works.

Steve Jobs

---
layout: statement
---

# Make it yours

Change any colour of a theme in `style.css`
