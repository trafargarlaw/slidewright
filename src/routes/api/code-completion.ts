import { createFileRoute } from '@tanstack/react-router';
import { CompletionCopilot, type CompletionRequestBody } from 'monacopilot';
import { generateText } from 'ai';
 

const copilot = new CompletionCopilot(undefined, {
    model: async (prompt) => {
        const { text } = await generateText({
            model: 'mistral/codestral',
            system: prompt.context,
            prompt: `${prompt.instruction}\n\n${prompt.fileContent}`,
          });
        return {
            text,
        };
    },
});
export const Route = createFileRoute('/api/code-completion')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const body: CompletionRequestBody = await request.json();
                const completion = await copilot.complete({
                    body,
                    options: {
                        customPrompt: (completionMetadata) => ({
                            context: `You are completing code inside a Slidev-style presentation markdown file. The file uses a custom format where slides are separated by \`---\` lines.

SLIDE STRUCTURE:
Each slide has an optional YAML frontmatter block followed by markdown content:
---
layout: <layout-name>
title: "Optional title"
image: "url (for image-left/image-right layouts)"
---

## Slide Heading

Content here...

AVAILABLE LAYOUTS: default, cover, section, center, two-cols, image-right, image-left, code, full

SPECIAL SYNTAX:
- \`::right::\` splits content into two columns (used with two-cols layout)
- \`<!-- step -->\` or \`<!-- step N -->\` marks incremental reveal points
- \`<!-- notes ... -->\` at the end of a slide defines presenter notes
- Code blocks support line highlighting: \`\`\`lang {1|2-3|all}\`\`\` where \`|\` separates reveal steps
- Math: inline \`$...$\` and block \`$$...$$\` (KaTeX)
- HTML tags like \`<mark>\`, \`<mark at="2">\` for highlighted text
- Standard markdown: headers, bold, italic, lists, blockquotes, links, inline code

FRONTMATTER KEYS:
- layout: slide layout type
- title: slide title (string, quoted)
- image: image URL for image-left/image-right layouts
- level: heading level (number)

The presentation content is typically educational/instructional. Complete the markdown naturally, maintaining the slide's style and topic.`,
                            instruction: `Continue the slide content naturally. If inside a code block, complete the code. If inside frontmatter (between --- lines), suggest valid YAML keys and values. If in regular markdown, continue the prose or structure. Match the existing formatting, indentation, and style. Keep completions concise — suggest one logical unit at a time (a line, a bullet, a code statement). Language context: ${completionMetadata.language}.`,
                            fileContent: completionMetadata.textBeforeCursor + '<CURSOR>' + completionMetadata.textAfterCursor,
                        }),
                    },
                });

                return new Response(JSON.stringify(completion));
            },
        },
    },
});
