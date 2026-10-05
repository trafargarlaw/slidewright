---
title: Transitions
layout: cover
defaults:
  transition: fade
---

# Transitions

How one slide gives way to the next

<!-- notes
The transition of a slide plays as the slide comes in. Press the right arrow
to see each one, and the left arrow to see it play the other way.
-->

---

# Fade

The slide before fades out while this one fades in.

Every slide of this deck fades, unless it asks for something else: the
transition is in the `defaults` of the headmatter.

```md
---
defaults:
  transition: fade
---
```

---
transition: slide
---

# Slide

This slide came in from the right and pushed the one before away.

```md
---
transition: slide
---
```

Go back, and it leaves the way it came.

---
transition: slide-up
---

# Slide up

The same, from the bottom.

```md
---
transition: slide-up
---
```

---
layout: statement
transition: zoom
---

# Zoom

---
transition: none
---

# None

This slide was there at once.

```md
---
transition: none
---
```

A deck without `transition` anywhere moves like this.

---
transition: turn
---

# Your own

A name that the theme doesn't know is yours. This slide asks for `turn`,
and `style.css` has its two animations:

```css
[data-slide][data-transition="turn"][data-transition-state="entering"] {
  animation-name: turn-in;
}

[data-slide][data-transition="turn"][data-transition-state="leaving"] {
  animation-name: turn-out;
}
```

<!-- notes
The duration and the easing are theme properties:
`--deck-transition-duration` and `--deck-transition-easing`.
-->
