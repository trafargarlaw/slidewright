import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";
import type { Schema } from "hast-util-sanitize";
import { visit } from "unist-util-visit";
import styled from "styled-components";
import { CodeBlock } from "./CodeBlock";
import { useClicks } from "../hooks/useClicks";
import { parseSteps, computeCodeClicks } from "../parser/code-highlight";
import type { Components } from "react-markdown";

function remarkPreserveMeta() {
  return (tree: any) => {
    visit(tree, "code", (node: any) => {
      node.data = node.data || {};
      node.data.hProperties = node.data.hProperties || {};
      if (node.meta) {
        node.data.hProperties["data-meta"] = node.meta;
      }
      if (node.position) {
        node.data.hProperties["data-source-line"] = String(
          node.position.start.line,
        );
      }
    });
  };
}

const remarkPlugins = [remarkGfm, remarkMath, remarkPreserveMeta];

/**
 * Sanitization schema: default safe HTML + our custom features.
 * Blocks <script>, <iframe>, on* handlers, javascript: URLs, etc.
 */
const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "mark"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] || []), "style", "className"],
    mark: ["at"],
    code: [
      ...(Array.isArray(defaultSchema.attributes?.code)
        ? defaultSchema.attributes.code
        : []),
      "dataMeta",
      "dataSourceLine",
    ],
  },
};

// Order matters: parse raw HTML → sanitize it → then render math (trusted output)
const rehypePlugins = [
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
  rehypeKatex,
] as any;

interface SlideContentProps {
  markdown: string;
  clickOffset?: number;
}

interface ProcessedSegment {
  content: string;
  isInitial: boolean;
  appearClick: number;
  codeClickOffset: number;
  localCodeClicks: ReturnType<typeof computeCodeClicks>;
}

function processSegments(
  markdown: string,
  baseOffset: number,
): { segments: ProcessedSegment[]; totalClicks: number } {
  const rawSegments = parseSteps(markdown);
  const segments: ProcessedSegment[] = [];
  let maxClick = baseOffset;

  for (const seg of rawSegments) {
    const localCode = computeCodeClicks(seg.content);

    if (seg.isInitial) {
      // Step 0: always visible, code highlights start at maxClick
      const codeClickOffset = maxClick;
      segments.push({
        content: seg.content,
        isInitial: true,
        appearClick: -1,
        codeClickOffset,
        localCodeClicks: localCode,
      });
      maxClick += Math.max(0, localCode.totalSteps - 1);
    } else if (seg.click != null) {
      // Explicit click — appears at the declared click number
      segments.push({
        content: seg.content,
        isInitial: false,
        appearClick: seg.click,
        codeClickOffset: seg.click,
        localCodeClicks: localCode,
      });
      // Don't advance maxClick — explicit clicks are independent
    } else {
      // Auto-numbered step
      maxClick += 1;
      const appearClick = maxClick;
      segments.push({
        content: seg.content,
        isInitial: false,
        appearClick,
        codeClickOffset: appearClick,
        localCodeClicks: localCode,
      });
      maxClick += Math.max(0, localCode.totalSteps - 1);
    }
  }

  return { segments, totalClicks: maxClick - baseOffset };
}

export function SlideContent({ markdown, clickOffset = 0 }: SlideContentProps) {
  const { currentClick } = useClicks();

  const { segments } = useMemo(
    () => processSegments(markdown, clickOffset),
    [markdown, clickOffset],
  );

  return (
    <MarkdownWrapper>
      {segments.map((seg, i) => {
        const visible = seg.isInitial || currentClick >= seg.appearClick;

        return (
          <StepWrapper key={i} $visible={visible}>
            <SegmentMarkdown
              markdown={seg.content}
              codeClickOffset={seg.codeClickOffset}
              localCodeClicks={seg.localCodeClicks}
              currentClick={currentClick}
            />
          </StepWrapper>
        );
      })}
    </MarkdownWrapper>
  );
}

/** Render a single step segment's markdown */
function SegmentMarkdown({
  markdown,
  codeClickOffset,
  localCodeClicks,
  currentClick,
}: {
  markdown: string;
  codeClickOffset: number;
  localCodeClicks: ReturnType<typeof computeCodeClicks>;
  currentClick: number;
}) {
  const components: Components = useMemo(
    () => ({
      code({ node: _, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "");
        const meta = props["data-meta"] || "";
        const sourceLine = props["data-source-line"]
          ? parseInt(props["data-source-line"], 10)
          : undefined;

        if (match) {
          const localClickIndex = sourceLine
            ? localCodeClicks.lineToClick.get(sourceLine)
            : undefined;
          const localStepCount = sourceLine
            ? localCodeClicks.lineToStepCount.get(sourceLine)
            : undefined;

          // startClick = codeClickOffset + localClickIndex - 1
          // so that localClickIndex=1 maps to codeClickOffset
          const startClick =
            localClickIndex != null ? codeClickOffset + localClickIndex - 1 : 0;

          return (
            <CodeBlock
              language={match[1]}
              code={String(children).replace(/\n$/, "")}
              meta={meta}
              startClick={startClick}
              stepCount={localStepCount ?? 0}
            />
          );
        }

        return <InlineCode className={className}>{children}</InlineCode>;
      },

      pre({ children }: any) {
        return <>{children}</>;
      },

      h1({ node: _, children, ...props }: any) {
        return <H1 {...props}>{children}</H1>;
      },
      h2({ node: _, children, ...props }: any) {
        return <H2 {...props}>{children}</H2>;
      },
      h3({ node: _, children, ...props }: any) {
        return <H3 {...props}>{children}</H3>;
      },
      p({ node: _, children, ...props }: any) {
        return <P {...props}>{children}</P>;
      },
      ul({ node: _, children, ...props }: any) {
        return <Ul {...props}>{children}</Ul>;
      },
      ol({ node: _, children, ...props }: any) {
        return <Ol {...props}>{children}</Ol>;
      },
      li({ node: _, children, ...props }: any) {
        return <Li {...props}>{children}</Li>;
      },
      blockquote({ node: _, children, ...props }: any) {
        return <Blockquote {...props}>{children}</Blockquote>;
      },
      img({ node: _, src, alt, ...props }: any) {
        return <Img src={src} alt={alt} {...props} />;
      },
      a({ node: _, children, href, ...props }: any) {
        return (
          <A href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </A>
        );
      },

      table({ node: _, children, ...props }: any) {
        return <Table {...props}>{children}</Table>;
      },
      thead({ node: _, children, ...props }: any) {
        return <Thead {...props}>{children}</Thead>;
      },
      tbody({ node: _, children, ...props }: any) {
        return <Tbody {...props}>{children}</Tbody>;
      },
      tr({ node: _, children, ...props }: any) {
        return <Tr {...props}>{children}</Tr>;
      },
      th({ node: _, children, ...props }: any) {
        return <Th {...props}>{children}</Th>;
      },
      td({ node: _, children, ...props }: any) {
        return <Td {...props}>{children}</Td>;
      },

      mark({ node: _, children, ...props }: any) {
        const atAttr = props.at;
        const clickNum =
          atAttr != null ? parseInt(String(atAttr), 10) : null;
        const highlighted = clickNum == null || currentClick >= clickNum;
        return <HighlightMark $highlighted={highlighted}>{children}</HighlightMark>;
      },
    }),
    [currentClick, localCodeClicks, codeClickOffset],
  );

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {markdown}
    </ReactMarkdown>
  );
}

const MarkdownWrapper = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.foreground};
`;

const StepWrapper = styled.div<{ $visible: boolean }>`
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? "0" : "8px")});
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
`;

const H1 = styled.h1`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.foreground};
`;

const H2 = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.875rem;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.foreground};
`;

const H3 = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.foreground};
`;

const P = styled.p`
  font-size: 1.1rem;
  line-height: 1.5rem;
  margin: ${({ theme }) => theme.spacing.md} 0;
  color: ${({ theme }) => theme.colors.secondaryText};
`;

const Ul = styled.ul`
  margin-left: 1.1em;
  padding-left: 0.2em;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  list-style: square;
`;

const Ol = styled.ol`
  margin-left: 1.1em;
  padding-left: 0.2em;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  list-style: decimal;
`;

const Li = styled.li`
  font-size: 1.1rem;
  line-height: 1.8em;
  color: ${({ theme }) => theme.colors.secondaryText};
`;

const InlineCode = styled.code`
  background: ${({ theme }) => theme.colors.codeBg};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 2px 6px;
  font-size: 0.9em;
  font-weight: 300;
  color: ${({ theme }) => theme.colors.codeText};
`;

const Blockquote = styled.blockquote`
  background: ${({ theme }) => theme.colors.codeBg};
  color: ${({ theme }) => theme.colors.codeText};
  border-left: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 4px 8px;
  margin: ${({ theme }) => theme.spacing.md} 0;
  font-size: 0.875rem;

  p {
    margin: 0;
  }
`;

const Img = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: ${({ theme }) => theme.radii.md};
`;

const A = styled.a`
  color: currentColor;
  border-bottom: 1px dashed currentColor;
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-bottom-style: solid;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: ${({ theme }) => theme.spacing.md} 0;
  font-size: 0.95rem;
  line-height: 1.5;
`;

const Thead = styled.thead`
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const Tbody = styled.tbody``;

const Tr = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: ${({ theme }) => theme.colors.secondaryText};
`;

const Td = styled.td`
  padding: 8px 12px;
  color: ${({ theme }) => theme.colors.foreground};
`;

const HighlightMark = styled.mark<{ $highlighted: boolean }>`
  background: ${({ $highlighted, theme }) =>
    $highlighted ? `${theme.colors.primary}30` : "transparent"};
  color: inherit;
  padding: 1px 4px;
  border-radius: 3px;
  transition: background 0.3s ease;
`;
