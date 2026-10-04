---
title: A deck in a React app
---

# A deck in a React app

Edit the Markdown on the left: the deck changes as you type, and shows the
slide under the cursor.

- `<Deck markdown={…} />` renders the source
- The deck stays on the same slide and step

---
layout: sidebar
---

# A custom layout

`layout: sidebar` is a component from the `layouts` prop.

- The content goes in the main column
- `:::aside` goes beside it

:::aside
**Sidebar**

The layout lists `aside` in its `slots`, so this block goes here.
:::

---

# A custom component

:::callout
`:::callout` renders the `Callout` component from the `components` prop.
:::

:::callout{tone="warning"}
Attributes such as `tone="warning"` arrive as props.
:::

---

# Steps work as usual

- Press → in the deck to show the next step

<!-- step -->

- Edit this slide: the deck stays on this step
