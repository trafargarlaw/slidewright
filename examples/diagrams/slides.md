---
title: Diagrams
layout: cover
---

# Diagrams

Mermaid diagrams, written in the deck

---

# A flowchart

A `mermaid` code block is drawn as a diagram, in the deck's colours and font:

```mermaid
flowchart LR
  deck[slides.md] --> parse(Parse) --> compile(Compile)
  compile --> page{{Page}}
  compile --> pdf{{PDF}}
```

<!-- notes
The source of this diagram is five lines in slides.md. The project has
`mermaid` installed: without it, the block shows as code.
-->

---

# A sequence diagram

```mermaid
sequenceDiagram
  participant Speaker
  participant Deck
  participant Presenter as Presenter window
  Speaker->>Deck: Press P
  Deck->>Presenter: Open
  Speaker->>Presenter: Next slide
  Presenter-->>Deck: Same slide and step
  Note over Deck,Presenter: The two windows move together
```

---
layout: two-cols
---

# Next to text

:::left

A diagram goes where a code block can go: in a column, in a slot of a
layout, or in a step.

<!-- step -->

It gets smaller when the slide has no more room.

:::

:::right

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Review: Open a pull request
  Review --> Draft: Changes requested
  Review --> Merged: Approved
  Merged --> [*]
```

:::

---
class: night
---

# Its colours follow the slide

```mermaid
pie title Time on a talk
  "Slides" : 45
  "Rehearsal" : 35
  "Demo" : 20
```

This slide sets other colours in `style.css`, and the diagram takes them.
