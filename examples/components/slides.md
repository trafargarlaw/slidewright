---
title: Components
layout: cover
---

# Components

React components in a deck, from `components.tsx` next to it

---

# A component with content

A container directive gives its content to the component as `children`, and
its attributes as props:

:::callout{tone="warning"}
Mind the **gap** between the train and the platform.
:::

```md
:::callout{tone="warning"}
Mind the **gap** between the train and the platform.
:::
```

<!-- notes
The callout is the `Callout` component of components.tsx. style.css gives it
its colours.
-->

---

# A component with state

A leaf directive has no content. This one counts the hands in the room:

::counter{label="Hands up" start="3"}

```md
::counter{label="Hands up" start="3"}
```

<!-- notes
Click the button. The count stays while the deck is on this slide.
-->

---

# Components and steps

A directive takes a step like any other content.

<!-- step -->

:::callout
This callout shows on the first step.
:::

<!-- step -->

::counter{label="Questions"}
