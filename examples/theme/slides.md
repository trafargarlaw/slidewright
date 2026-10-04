---
title: Field notes
# style.css defines light and dark colours. Try light or auto.
colorScheme: dark
layout: cover
---

# Field notes

A deck with its own look: colours, fonts and a layout, all in `style.css`

---
layout: agenda
---

# Agenda

1. Where we are
2. What we learned
3. What comes next

<!-- notes
`agenda` is not a built-in layout. The slide renders like `default`, and
style.css arranges it by its name.
-->

---
layout: section
class: inverse
---

# Where we are

---

# Three numbers

| Service  | Deploys a week | Time to restore |
| -------- | -------------: | --------------: |
| Checkout |             14 |          18 min |
| Search   |              9 |          42 min |
| Accounts |              2 |         3 hours |

:::callout
**Note:** A directive without a component is a `div`. This one is styled
with `[data-directive="callout"]`.
:::

---
layout: quote
---

> Most of the time went to waiting, not to work.

The team retrospective

---

# What comes next

- Smaller releases

<!-- step -->

- One owner for each service

<!-- step -->

- A review every month

<!-- notes
Steps slide up as they appear: style.css adds a transform to the built-in
fade.
-->

---
layout: statement
---

# Thank you

Questions are welcome
