# Layout Guide — When to Use What

This guide helps you pick the right layout for each slide. Every layout serves a distinct purpose — choosing correctly keeps your presentation visually consistent and easy to follow.

---

## Quick Reference

| Layout | Best For | Avoid When |
|--------|----------|------------|
| `default` | General content, bullet points, lists | Content needs visual emphasis or centering |
| `center` | Single key message, short statements | Long content or multiple sections |
| `cover` | Title slides, opening slides | Regular content slides |
| `section` | Chapter breaks, topic transitions | Detailed content — it's a divider, not a content slide |
| `full` | Full-bleed content, centered with no padding | You need padding or standard text flow |
| `two-cols` | Comparisons, side-by-side content | Content that doesn't naturally split into two |
| `image-left` | Image with explanation to its right | Text-only slides or full-screen images |
| `image-right` | Image with explanation to its left | Text-only slides or full-screen images |
| `code` | Code snippets with explanation | Slides without code |

---

## Detailed Breakdown

### `default`

**The workhorse.** Use this for any slide that doesn't need special treatment.

**When to choose it:**
- Bullet-point slides
- Mixed content (headings + text + lists)
- Any slide where content flows top-to-bottom naturally

**What it does:** Content starts at the top-left with standard padding. No centering, no effects — just clean, readable content flow.

**Example use cases:**
- "Here are the 5 steps..."
- Agenda slides
- Any explanatory content

---

### `center`

**One thing, front and center.** Use when the slide has a single focused message.

**When to choose it:**
- A short quote or statement (1-3 lines)
- A single key takeaway
- A question you want the audience to sit with

**When NOT to choose it:**
- Long content — centered text becomes hard to read past 2-3 lines
- Bullet lists — they look awkward centered

**vs `cover`:** Center is neutral (no background styling). Use it mid-presentation for emphasis. Use `cover` for branding/title slides.

---

### `cover`

**The opening act.** A visually distinct slide with a dark gradient background and white text.

**When to choose it:**
- The very first slide (title, your name, date)
- A dramatic re-introduction mid-deck (e.g., "Part 2: The Solution")

**When NOT to choose it:**
- Regular content — the gradient background is too heavy for everyday slides
- Anything after the first few slides unless you're intentionally resetting the visual pace

**Design details:** All text is forced white. Paragraph text (`<p>`) renders at 70% opacity to create a visual hierarchy — headings stand out, supporting text recedes. Inline code gets a semi-transparent white background.

**vs `section`:** Cover is bold and full-screen — it says "this is the presentation." Section is subtler — it says "we're moving on to a new topic."

---

### `section`

**The chapter break.** Signals a shift to a new topic or part of the presentation.

**When to choose it:**
- Between major parts of your talk ("Background → Approach → Results")
- When the audience needs a mental reset
- Topic headers that don't need detailed content

**What it does:** Left-aligned content with an accent bar (uses your theme color). Content is capped at 70% width — it's designed for short text, not paragraphs.

**vs `cover`:** Section is lighter and meant to appear multiple times. Cover is a one-time visual statement.

**vs `center`:** Section has structure (accent bar, left-aligned, theme surface background). Center is minimal and neutral.

---

### `full`

**A blank canvas.** No padding, no centering, no layout opinions — just a raw `100% x 100%` container.

**When to choose it:**
- Full-bleed images or diagrams that need every pixel
- Custom layouts where you want total control over positioning
- Embedded visualizations or charts that need maximum space
- Content where standard padding gets in the way

**When NOT to choose it:**
- Text-heavy slides — no padding means text hits the edges, no centering means you must position it yourself
- Standard content — `default` exists for a reason

**How it differs from `center`:** `center` adds padding and centers your content. `full` does nothing — you're responsible for all spacing and positioning. Think of it as opting out of the layout system entirely.

---

### `two-cols`

**Side by side.** Splits the slide into two equal columns.

**When to choose it:**
- Before/after comparisons
- Pros vs cons
- Code on the left, explanation on the right
- Two related but distinct pieces of content

**How to use it:** Separate left and right content with `::right::` in your markdown.

```md
---
layout: two-cols
---

# Problem
Users can't find the button

::right::

# Solution
Move it above the fold
```

**When NOT to choose it:**
- Content that doesn't naturally pair — forcing a split makes slides harder to follow
- When one side would be mostly empty

---

### `image-left`

**Show, then tell.** Image fills the left half, your content sits on the right.

**When to choose it:**
- A photo/screenshot with explanation
- Visual evidence supporting a point
- Product screenshots with feature callouts

**Set the image via frontmatter:**
```md
---
layout: image-left
image: /screenshot.png
---

## What you're seeing
The new dashboard redesign...
```

**vs `image-right`:** Choose based on visual flow. In left-to-right reading cultures, `image-left` means the audience sees the image first, then reads. Use `image-right` when the text sets up context and the image is the payoff.

---

### `image-right`

**Tell, then show.** Content on the left, image fills the right half.

**When to choose it:**
- When text provides context the audience needs before seeing the image
- Alternating with `image-left` to create visual variety across consecutive image slides
- When the image is the "reveal" or conclusion of the point

**Same mechanics as `image-left`**, just mirrored.

---

### `code`

**Purpose-built for code.** Optimized spacing and typography for slides featuring code snippets.

**When to choose it:**
- Showing a code example (with optional heading/explanation)
- API examples, config snippets, CLI commands
- Any slide where code is the primary content

**What it does differently from `default`:**
- Content is **vertically centered** — code sits in the middle of the slide, not pinned to the top
- Tighter, more consistent spacing between elements (uses theme `spacing.md` gap)
- Code blocks use a fixed 14px font size
- Headings are slightly smaller (1.4em) to not overpower the code
- Elements don't shrink — code stays readable even on dense slides

**When NOT to choose it:**
- Slides that mention code in passing but aren't about the code itself — `default` is fine for that

---

## Decision Flowchart

```
Is this the title/opening slide?
  → YES → cover

Is this a topic transition with minimal text?
  → YES → section

Does the slide have a full-bleed image or custom visual?
  → YES → full

Is there an image paired with text?
  → YES → image-left or image-right

Is the main content code?
  → YES → code

Are you comparing two things side-by-side?
  → YES → two-cols

Is there a single short message to emphasize?
  → YES → center

Everything else?
  → default
```
