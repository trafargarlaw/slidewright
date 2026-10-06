---
name: slidewright
description: Write presentations as Markdown with Slidewright. Use when creating or editing a Slidewright deck (a `slides.md` with `---` between slides), its layouts, steps, speaker notes or theme, or when turning notes or a document into slides.
---

# Slidewright decks

A Slidewright deck is a Markdown file, `slides.md` by default.
`@slidewright/cli` presents it, builds it into a static site and exports it
to PDF or PNG. A project needs nothing else: no HTML page, no config and no
React code.

## Steps

1. **Find the deck, or start one.** In a project with `@slidewright/cli` in
   its `package.json`, the deck is `slides.md`, or the file that the scripts
   name. For a new project, run `npm create @slidewright my-talk`, then
   `npm install` in `my-talk`: it has a starter `slides.md` to replace, a
   `style.css`, and `dev`, `build` and `export` scripts. Done when you know
   the path of the deck.
2. **Outline the talk.** List the slides before you write them. Done when
   each slide has one point, and its heading says it ("Builds take 40 s,
   not 6 min").
3. **Write the slides** in [the format](#the-format), each within
   [what fits](#what-fits-on-a-slide). What the speaker says goes in the
   notes, not on the slide.
4. **Check the deck.** Install the packages of the icons and diagrams that
   the deck uses, then run `npx slidewright build` in the project. It prints
   each problem as `slides.md:9: warning: …`, with the file and the line,
   and writes the site into `dist/`. The build succeeds with problems too,
   so read its output. Done when it prints no warning and no error.
5. **Check what the build can't see**: a slide with too much on it, and
   money that became maths. When you can read images, and the project has
   `playwright-chromium` in its dev dependencies, run
   `npx slidewright export --format png` and look at each image in
   `slides-png/`. Otherwise, count each slide against
   [what fits](#what-fits-on-a-slide), and search the deck for a `$` without
   a `\` before it. Done when no slide loses content at its bottom edge.
6. **Hand over.** `npx slidewright` presents the deck on
   <http://localhost:3030> and runs until it is stopped, so give the user
   the command. Arrows and space move, `O` shows every slide, `F` is
   fullscreen and `P` opens the presenter view with the notes.

## The format

````md
---
title: Shipping faster
defaults:
  transition: fade
layout: cover
---

# Shipping faster

Ada Lovelace, 12 May

<!-- notes
Notes are Markdown. Only the presenter view shows them.
-->

---

# Three reasons

- Speed

<!-- step -->

- Cost

<!-- step -->

- Safety

---
layout: two-cols
---

# Before and after

:::left
By hand, once a week
:::

:::right
On merge, 30 times a day
:::

---

# One function

```ts {1|3-4|all} lines title="deploy.ts"
const target = pick(regions);

await build();
await ship(target);
```

---
layout: fact
---

# 40 s

From merge to production
````

### Slides and settings

- A line with only `---` starts a slide. A horizontal rule is `***`.
- A slide's frontmatter is YAML on the lines right after its `---`, closed
  by another `---`. Its first `key:` is on the very next line: after a
  blank line, the keys are text on a slide of their own, and the build
  doesn't report it.
- The frontmatter at the top of the file also holds the deck settings:
  `title` (the name of the deck, and of its first slide), `theme`,
  `colorScheme` (`light` by default, `dark` or `auto`), `aspectRatio`
  (`16/9`), `canvasWidth` (`980`) and `defaults`, the frontmatter of every
  slide.
- Slide keys: `layout`, `class` (CSS classes on the slide), `transition`
  (`fade`, `slide`, `slide-up` or `zoom`), `title`, and `image` with
  `imageAlt` for the image layouts.
- `title` names the slide for screen readers, in the deck and in its
  overview. By default it is the first heading as written, so give a `title`
  to a slide without a heading, such as a `quote`, and to one whose heading
  has `\$` or an icon.

### Layouts

| Layout                      | Write in the slide                                    |
| --------------------------- | ----------------------------------------------------- |
| `default`                   | A `#` heading and content, from the top left.         |
| `center`                    | The same, centred.                                    |
| `cover`                     | The first slide: a `#` title and a subtitle line.     |
| `section`                   | A `#` heading that opens a part of the talk.          |
| `statement`                 | One `#` sentence, large and centred.                  |
| `fact`                      | A `#` number or word, and a caption under it.         |
| `quote`                     | A `>` quote, then its source as a paragraph.          |
| `two-cols`                  | A `#` heading, then `:::left` and `:::right` blocks.  |
| `image`                     | `image:` fills the slide; the content is at its foot. |
| `image-left`, `image-right` | The content beside `image:`.                          |
| `full`                      | Content with no padding, to reach every edge.         |

### Steps, notes and code

- `<!-- step -->` on a line of its own hides what follows it until the next
  step. A slide shows its steps one by one before the deck moves on.
- `<!-- notes … -->`, starting on a line of its own, holds the speaker
  notes. A `[step]` line in them starts the notes of the next step.
- After the language of a code block: `{2,4}` highlights lines and dims the
  others, `{1|3-4|all}` highlights in stages that take one step each,
  `lines` shows line numbers, `title="deploy.ts"` shows a title, and `diff`
  marks lines that start with `+` or `-`. Every line of the code shows from
  the start. To make code appear part by part, write several code blocks
  with `<!-- step -->` between them.

### Text, images and more

- An image is `![What it shows](images/chart.png)`, with a path from the
  folder of the deck and no `/` in front. Put the file in the project.
- Money is `\$5`: two `$` on a line make maths of the text between them.
  Maths is LaTeX, `$E = mc^2$` in a line and `$$` lines around a block.
- `:lucide:rocket:` is an icon from an [Iconify](https://icon-sets.iconify.design)
  set, and a `mermaid` code block is a diagram, which shrinks to fit its
  slide. Each needs a package in the project:
  `npm install --save-dev @iconify-json/lucide` for the `lucide` icons,
  and `npm install --save-dev mermaid`. Without the package, the source text shows and the
  build prints a warning. With it, the build reports a name that the set
  doesn't have.
- HTML works, with `class` and `style`. Leave a blank line between an HTML
  tag and the Markdown inside it.
- A deck is Markdown, not MDX: no `import`, no JSX, no `{expressions}` and
  no React components. A block between `:::callout{.warning}` and `:::` is
  a `div` to style in `style.css`, with the selector
  `[data-directive="callout"]`. See
  [Directives](references/syntax.md#directives).
- A long deck can be several files. A slide whose frontmatter is
  `src: chapters/why.md` stands for the slides of that file. See
  [Several files](references/syntax.md#several-files).

### Style

`style.css` next to the deck loads after the theme. Set the theme on
`[data-deck]`, and style slides with ordinary selectors:

```css
[data-deck] {
  /* Links, quotes, the number of a `fact` slide and the progress bar. */
  --deck-accent: #b45309;
  --deck-font-sans: "Inter", sans-serif;
}

/* A slide with `class: dense` in its frontmatter. */
[data-slide].dense {
  font-size: 20px;
}

[data-layout="cover"] h1 {
  letter-spacing: -0.02em;
}
```

The slide is light by default: `--deck-bg` and `--deck-fg` are its
background and its text, so choose an accent that reads on the background.
Sizes are pixels of the slide, which is 980 × 551 and scaled to the screen.
Every theme property and selector is in
[Styling](references/react.md#styling).

## What fits on a slide

A slide cuts off what doesn't fit, and the build doesn't report it. With
the default theme, a slide has room for a `#` heading of one line, about 30
characters, and under it one of:

- 8 bullets of one line, about 60 characters each,
- 12 lines of code of about 70 characters, 11 with a `title`,
- a table of 6 rows under its header, or
- two columns of 8 lines, about 30 characters to a line.

A heading of two lines takes the room of one bullet or two. The heading of
a `cover` or `statement` slide has about 20 characters to a line. A `quote`
has about 33: keep it to 5 lines.

A slide with more becomes two slides, or keeps its point and moves the rest
to the notes. `class` with a smaller `font-size` is for the rare table or
listing that must stay whole.

## References

Each file is the full text of a part of the Slidewright docs, so search it
for the heading you need. Read one when this file only names what you need.

- [references/syntax.md](references/syntax.md): the whole deck format. Step
  numbers, notes for each step, diffs, transitions, directives, the rules of
  icons, several files, and what sanitising removes.
- [references/react.md](references/react.md): what a deck writer needs is
  under [Layouts](references/react.md#layouts),
  [Diagrams](references/react.md#diagrams),
  [Transitions](references/react.md#transitions) and
  [Styling](references/react.md#styling), with every theme property and CSS
  selector. Read Styling before writing more CSS than [Style](#style)
  shows. The rest is for a deck inside a React app.
- [references/vite.md](references/vite.md): where
  [images and other files](references/vite.md#files) go, and the
  [problems](references/vite.md#problems-in-the-deck) that a build prints.
- [references/cli.md](references/cli.md): the commands and their options,
  export to PDF and PNG, and putting the built site online.

The references describe the newest Slidewright. When something in them does
nothing in a project, its installed version is older: the README files in
`node_modules/@slidewright/` describe that one.
