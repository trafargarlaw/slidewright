import syntax from "../../../../docs/syntax.md?raw";

/** The deck format, from the repository's syntax reference. */
export const SYNTAX_REFERENCE = syntax;

/** Layouts available in the playground, which uses the built-in ones. */
export const LAYOUT_REFERENCE = `## Layouts

Pick a layout with \`layout:\` in a slide's frontmatter.

| Layout | Arrangement |
| --- | --- |
| \`default\` | Content from the top left. |
| \`center\` | Content centred. Best for one short message. |
| \`cover\` | Title slide: large heading, the paragraph after it as a subtitle. |
| \`section\` | Section divider: large heading with an accent bar. |
| \`full\` | No padding. |
| \`two-cols\` | Content on top, then \`:::left\` and \`:::right\` columns. |
| \`image-left\`, \`image-right\` | Content beside \`image:\` (with optional \`imageAlt:\`). |

\`\`\`md
---
layout: two-cols
---

# Before and after

:::left
Old checkout flow
:::

:::right
New checkout flow
:::
\`\`\`

In the playground, slides can also use utility classes (\`class="flex gap-4"\`)
and maths (\`$E = mc^2$\`). Pasted images are inserted as
\`<img data-paste-id="paste-1" />\` and only last for the session.
`;
