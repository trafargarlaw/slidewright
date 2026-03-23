import styled from "styled-components";

export function CheatSheet() {
  return (
    <Container>
      <Section>
        <H2>Slide Structure</H2>
        <P>
          Slides are separated by <Code>---</Code> on its own line.
          Each slide can have optional YAML frontmatter.
        </P>
        <Pre>{`---
layout: cover
title: My Title
---

# Slide content here

---

# Next slide (no frontmatter)`}</Pre>
      </Section>

      <Section>
        <H2>Frontmatter Keys</H2>
        <Table>
          <thead>
            <tr><Th>Key</Th><Th>Description</Th><Th>Example</Th></tr>
          </thead>
          <tbody>
            <tr><Td><Code>layout</Code></Td><Td>Slide layout</Td><Td><Code>layout: cover</Code></Td></tr>
            <tr><Td><Code>title</Code></Td><Td>Slide title text</Td><Td><Code>title: Introduction</Code></Td></tr>
            <tr><Td><Code>image</Code></Td><Td>Image URL (for image layouts)</Td><Td><Code>image: https://...</Code></Td></tr>
            <tr><Td><Code>level</Code></Td><Td>Heading level (number)</Td><Td><Code>level: 2</Code></Td></tr>
          </tbody>
        </Table>
      </Section>

      <Section>
        <H2>Layouts</H2>
        <Table>
          <thead>
            <tr><Th>Layout</Th><Th>Description</Th></tr>
          </thead>
          <tbody>
            <tr><Td><Code>default</Code></Td><Td>Standard slide with top-aligned content</Td></tr>
            <tr><Td><Code>cover</Code></Td><Td>Centered title slide with dark gradient</Td></tr>
            <tr><Td><Code>center</Code></Td><Td>Vertically &amp; horizontally centered</Td></tr>
            <tr><Td><Code>section</Code></Td><Td>Section header with accent bar</Td></tr>
            <tr><Td><Code>two-cols</Code></Td><Td>Two columns, split by <Code>::right::</Code></Td></tr>
            <tr><Td><Code>image-right</Code></Td><Td>Content left, image right</Td></tr>
            <tr><Td><Code>image-left</Code></Td><Td>Image left, content right</Td></tr>
            <tr><Td><Code>code</Code></Td><Td>Code-focused, tighter padding</Td></tr>
            <tr><Td><Code>full</Code></Td><Td>Full-screen, no padding</Td></tr>
          </tbody>
        </Table>
      </Section>

      <Section>
        <H2>Two-Column Layout</H2>
        <P>
          Use <Code>::right::</Code> on its own line to split content
          into left and right columns.
        </P>
        <Pre>{`---
layout: two-cols
---

## Left Side

Content on the left

::right::

## Right Side

Content on the right`}</Pre>
      </Section>

      <Section>
        <H2>Click / Step Reveal</H2>
        <P>
          Use <Code>&lt;!-- step --&gt;</Code> to create sections that
          appear on successive clicks. Content before the first marker is
          always visible.
        </P>
        <Pre>{`Always visible text

<!-- step -->

Appears on first click

<!-- step -->

Appears on second click`}</Pre>

        <H3>Explicit Click Numbers</H3>
        <P>
          Add a number to control exactly when a section appears.
          Set <Code>clicks</Code> in frontmatter to declare the total.
        </P>
        <Pre>{`---
clicks: 3
---

Always visible

<!-- step 2 -->

Appears at click 2

<!-- step 3 -->

Appears at click 3`}</Pre>
      </Section>

      <Section>
        <H2>Code Blocks</H2>
        <P>Standard fenced code blocks with language highlighting.</P>
        <Pre>{`\`\`\`python
def hello():
    print("Hello, world!")
\`\`\``}</Pre>

        <H3>Line Highlight Steps</H3>
        <P>
          Add <Code>{'{lines}'}</Code> after the language to highlight
          lines progressively on each click. Separate steps
          with <Code>|</Code>.
        </P>
        <Table>
          <thead>
            <tr><Th>Syntax</Th><Th>Meaning</Th></tr>
          </thead>
          <tbody>
            <tr><Td><Code>{'{1}'}</Code></Td><Td>Highlight line 1</Td></tr>
            <tr><Td><Code>{'{1-3}'}</Code></Td><Td>Highlight lines 1 through 3</Td></tr>
            <tr><Td><Code>{'{1,4,6}'}</Code></Td><Td>Highlight lines 1, 4, and 6</Td></tr>
            <tr><Td><Code>{'{all}'}</Code></Td><Td>Highlight all lines</Td></tr>
            <tr><Td><Code>{'{1|3-5|all}'}</Code></Td><Td>3 auto steps: line 1, then 3-5, then all</Td></tr>
          </tbody>
        </Table>
        <Pre>{`\`\`\`r {1-2|4|all}
# Step 1: these two lines
weekly <- c(100, 200, 300)

# Step 2: this line
print(weekly)
\`\`\``}</Pre>

        <H3>Explicit Click on Code</H3>
        <P>
          Use <Code>@N</Code> after each step to bind it to a specific click.
          This lets you sync code highlights with other elements.
        </P>
        <Pre>{`\`\`\`python {1@1|3-5@2|all@4}
x = 1          # highlighted at click 1
y = 2
z = x + y      # lines 3-5 at click 2
print(z)       # all at click 4
\`\`\``}</Pre>
      </Section>

      <Section>
        <H2>Text Highlighting</H2>
        <P>
          Use <Code>&lt;mark&gt;</Code> for always-on highlights.
          Add <Code>at="N"</Code> to highlight at a specific click.
        </P>
        <Pre>{`Always <mark>highlighted</mark> text.

<mark at="1">Highlights at click 1</mark>, then
<mark at="3">highlights at click 3</mark>.`}</Pre>
      </Section>

      <Section>
        <H2>Choreographing Clicks</H2>
        <P>
          Combine <Code>clicks</Code>, <Code>&lt;!-- step N --&gt;</Code>,
          code <Code>@N</Code>, and <Code>&lt;mark at="N"&gt;</Code> to
          control exactly what happens at each click. Multiple elements
          can share the same click number.
        </P>
        <Pre>{`---
clicks: 3
---

The answer is <mark at="2">42</mark>

\`\`\`python {1@1|all@2}
x = 42
print(x)
\`\`\`

<!-- step 3 -->

Both the mark and code highlight
fired together at click 2!`}</Pre>
      </Section>

      <Section>
        <H2>Math (KaTeX)</H2>
        <P>
          Inline math with single dollars, block math with double dollars.
        </P>
        <Pre>{`Inline: $E = mc^2$

Block:
$$
\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$`}</Pre>
      </Section>

      <Section>
        <H2>Markdown Basics</H2>
        <Pre>{`# Heading 1
## Heading 2
### Heading 3

**bold** and *italic*

- Bullet list
- Another item

1. Numbered list
2. Second item

> Blockquote

\`inline code\`

[Link text](https://example.com)

![Alt text](image-url.png)`}</Pre>
      </Section>

      <Section>
        <H2>Presenter Notes (Script)</H2>
        <P>
          Add notes at the end of a slide with a <Code>&lt;!-- notes</Code> block.
          These appear in the Script tab, not in the slide.
        </P>
        <Pre>{`# My Slide

Content here

<!-- notes
This is what I'd say when presenting.
Supports multiple lines.
-->`}</Pre>

        <H3>Click Markers in Notes</H3>
        <P>
          Use <Code>[click]</Code> in your speaker script to mark where you
          should advance to the next step. Helps you stay in sync with your
          slide animations while reading the script.
        </P>
        <Pre>{`<!-- notes
So first let me show you the overview.
[click]
Now notice how the chart changes — this is the key insight.
[click]
And finally, here are the takeaways.
-->`}</Pre>
      </Section>

      <Section>
        <H2>Image Layouts</H2>
        <P>
          Use <Code>image-right</Code> or <Code>image-left</Code> layouts
          with the <Code>image</Code> frontmatter key.
        </P>
        <Pre>{`---
layout: image-right
image: https://example.com/photo.jpg
---

## My Content

Text appears on the opposite side
of the image.`}</Pre>
      </Section>
    </Container>
  );
}

const Container = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: ${({ theme }) => theme.colors.background};
`;

const Section = styled.section`
  margin-bottom: 28px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const H2 = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.foreground};
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const H3 = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.foreground};
  margin-top: 12px;
  margin-bottom: 6px;
`;

const P = styled.p`
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.secondaryText};
  margin-bottom: 8px;
`;

const Code = styled.code`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12px;
  background: ${({ theme }) => theme.colors.codeBg};
  color: ${({ theme }) => theme.colors.accent};
  padding: 1px 5px;
  border-radius: 3px;
`;

const Pre = styled.pre`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 12px;
  line-height: 1.6;
  background: ${({ theme }) => theme.colors.codeBg};
  color: ${({ theme }) => theme.colors.codeText};
  padding: 12px 14px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 8px;
  white-space: pre-wrap;
  word-break: break-word;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: 13px;
`;

const Th = styled.th`
  text-align: left;
  padding: 6px 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.foreground};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Td = styled.td`
  padding: 5px 10px;
  color: ${({ theme }) => theme.colors.secondaryText};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;
