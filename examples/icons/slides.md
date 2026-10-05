---
title: Icons
layout: cover
---

# :lucide:shapes: Icons

Any icon of an Iconify set, written `:set:name:`

---

# In the text

An icon is as tall as the text around it, and has its colour.

- :lucide:rocket: A list item starts with one
- A sentence has one :lucide:arrow-right: in the middle
- **:lucide:triangle-alert: Bold text** and [:lucide:link: a link](https://icon-sets.iconify.design) keep their colour

```md
- :lucide:rocket: A list item starts with one
```

<!-- notes
:lucide:mic: The icons are from `@iconify-json/lucide`, a dev dependency of
the project. The page gets only the icons that the deck uses.
-->

---

# Size and colour

An icon takes the size and the colour of its element, so a class is all it
needs:

<div class="reasons">
  :lucide:zap:
  <span class="accent">:lucide:heart:</span>
  :lucide:sparkles:
</div>

```md
<span class="accent">:lucide:heart:</span>
```

```css
.reasons {
  font-size: 3em;
}
```

---
layout: two-cols
---

# Sets with their own colours

:::left

The `logos` set draws each icon in its colours. Its icons don't change with
the text.

:logos:react: :logos:vitejs: :logos:typescript-icon: :logos:firefox:

:::

:::right

```md
:logos:react: :logos:vitejs:
```

Every set installs in the same way:

```sh
npm install --save-dev @iconify-json/logos
```

:::

---

# One at a time

Icons take steps like any other content.

<div class="reasons">

:lucide:pencil-line:

<!-- step -->

:lucide:arrow-right: :lucide:presentation:

<!-- step -->

:lucide:arrow-right: :lucide:party-popper:

</div>

<!-- notes
Write.
[step]
Present.
[step]
Celebrate.
-->
