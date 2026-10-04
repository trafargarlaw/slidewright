import { createFileRoute } from '@tanstack/react-router';
import { CompletionCopilot, type CompletionRequestBody } from 'monacopilot';
import { generateText } from 'ai';
 

const copilot = new CompletionCopilot(undefined, {
    model: async (prompt) => {
        const { text } = await generateText({
            model: 'mistral/codestral',
            instructions: prompt.context,
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
                            context: `You are completing a slide deck written as one Markdown file. Slides are separated by \`---\` lines.

SLIDE STRUCTURE:
A slide can start with a YAML frontmatter block, directly after its separator:
---
layout: <layout-name>
---

## Slide Heading

Content here...

LAYOUTS: default, center, cover, section, statement, fact, quote, full, two-cols, image, image-left, image-right

SPECIAL SYNTAX:
- \`<!-- step -->\` or \`<!-- step N -->\` reveals what follows on the next step
- \`<!-- notes ... -->\` holds speaker notes
- Code blocks: \`\`\`lang {1|2-3|all} lines title="file.ts"\`\`\` where \`|\` separates highlight steps; add \`diff\` to mark lines that start with \`+\` (added) or \`-\` (removed)
- Directives: \`:::name\` ... \`:::\` wraps content (\`:::left\` and \`:::right\` are the two-cols columns); \`::name{key="value"}\` is a single line
- Math: inline \`$...$\` and block \`$$...$$\`
- Standard Markdown and HTML with \`class\` and \`style\`

FRONTMATTER KEYS:
- layout: slide layout
- title: slide title
- class: CSS classes on the slide
- steps: number of steps on the slide
- image, imageAlt: image for the image, image-left and image-right layouts

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
