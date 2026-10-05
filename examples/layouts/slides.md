---
title: Built-in layouts
layout: cover
---

# Built-in layouts

Every layout that comes with Slidewright, one slide each

<!-- notes
Each slide is named after its layout. Press O for the overview to compare
them side by side.
-->

---

# default

Content starts at the top left. A slide without `layout:` uses this one.

- Headings, lists and tables
- Code blocks and images
- Anything else Markdown can say

---
layout: center
---

# center

Content in the middle of the slide, on both axes.

---
layout: section
---

# section

A divider between the parts of a talk

---
layout: statement
---

# statement

One idea, large and centred

---
layout: fact
---

# 12

fact: a large number or word, with a caption

---
layout: quote
title: quote
---

> Simplicity is prerequisite for reliability.

Edsger W. Dijkstra, the source after the quote

---
layout: two-cols
---

# two-cols

Content on top, then two columns.

:::left
**`:::left`**

- Fills the left column
- Any Markdown
:::

:::right
**`:::right`**

- Fills the right column
- Any Markdown
:::

---
layout: image-right
image: hills.svg
imageAlt: Hills under an evening sky
---

# image-right

Content on the left, and the picture from `image:` on the right.

`imageAlt:` describes the picture for screen readers.

---
layout: image-left
image: hills.svg
imageAlt: Hills under an evening sky
---

# image-left

The picture on the left, and the content on the right.

---
layout: image
image: hills.svg
imageAlt: Hills under an evening sky
---

# image

The picture fills the slide. The content sits at the bottom, over a shade.

---
layout: full
---

<div class="poster">

# full

No padding: the content can reach every edge.

</div>
