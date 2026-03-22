import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { visit } from 'unist-util-visit'
import styled from 'styled-components'
import { CodeBlock } from './CodeBlock'
import { useClicks } from '../hooks/useClicks'
import { parseSteps, computeCodeClicks } from '../parser/code-highlight'
import type { Components } from 'react-markdown'

function remarkPreserveMeta() {
  return (tree: any) => {
    visit(tree, 'code', (node: any) => {
      node.data = node.data || {}
      node.data.hProperties = node.data.hProperties || {}
      if (node.meta) {
        node.data.hProperties['data-meta'] = node.meta
      }
      if (node.position) {
        node.data.hProperties['data-source-line'] = String(
          node.position.start.line,
        )
      }
    })
  }
}

const remarkPlugins = [remarkGfm, remarkMath, remarkPreserveMeta]
const rehypePlugins = [rehypeKatex, rehypeRaw]

interface SlideContentProps {
  markdown: string
  clickOffset?: number
}

interface ProcessedSegment {
  content: string
  isInitial: boolean
  appearClick: number
  codeClickOffset: number
  localCodeClicks: ReturnType<typeof computeCodeClicks>
}

function processSegments(
  markdown: string,
  baseOffset: number,
): { segments: ProcessedSegment[]; totalClicks: number } {
  const rawSegments = parseSteps(markdown)
  const segments: ProcessedSegment[] = []
  let maxClick = baseOffset

  for (const seg of rawSegments) {
    const localCode = computeCodeClicks(seg.content)

    if (seg.isInitial) {
      // Step 0: always visible, code highlights start at maxClick
      const codeClickOffset = maxClick
      segments.push({
        content: seg.content,
        isInitial: true,
        appearClick: -1,
        codeClickOffset,
        localCodeClicks: localCode,
      })
      maxClick += Math.max(0, localCode.totalSteps - 1)
    } else {
      // Step N: appears on next click
      maxClick += 1
      const appearClick = maxClick
      segments.push({
        content: seg.content,
        isInitial: false,
        appearClick,
        codeClickOffset: appearClick,
        localCodeClicks: localCode,
      })
      maxClick += Math.max(0, localCode.totalSteps - 1)
    }
  }

  return { segments, totalClicks: maxClick - baseOffset }
}

export function SlideContent({ markdown, clickOffset = 0 }: SlideContentProps) {
  const { currentClick } = useClicks()

  const { segments } = useMemo(
    () => processSegments(markdown, clickOffset),
    [markdown, clickOffset],
  )

  return (
    <MarkdownWrapper>
      {segments.map((seg, i) => {
        const visible = seg.isInitial || currentClick >= seg.appearClick

        return (
          <StepWrapper key={i} $visible={visible}>
            <SegmentMarkdown
              markdown={seg.content}
              codeClickOffset={seg.codeClickOffset}
              localCodeClicks={seg.localCodeClicks}
              currentClick={currentClick}
            />
          </StepWrapper>
        )
      })}
    </MarkdownWrapper>
  )
}

/** Render a single step segment's markdown */
function SegmentMarkdown({
  markdown,
  codeClickOffset,
  localCodeClicks,
  currentClick,
}: {
  markdown: string
  codeClickOffset: number
  localCodeClicks: ReturnType<typeof computeCodeClicks>
  currentClick: number
}) {
  const components: Components = useMemo(
    () => ({
      code({ node: _, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '')
        const meta = props['data-meta'] || ''
        const sourceLine = props['data-source-line']
          ? parseInt(props['data-source-line'], 10)
          : undefined

        if (match) {
          const localClickIndex = sourceLine
            ? localCodeClicks.lineToClick.get(sourceLine)
            : undefined
          const localStepCount = sourceLine
            ? localCodeClicks.lineToStepCount.get(sourceLine)
            : undefined

          // startClick = codeClickOffset + localClickIndex - 1
          // so that localClickIndex=1 maps to codeClickOffset
          const startClick =
            localClickIndex != null
              ? codeClickOffset + localClickIndex - 1
              : 0

          return (
            <CodeBlock
              language={match[1]}
              code={String(children).replace(/\n$/, '')}
              meta={meta}
              startClick={startClick}
              stepCount={localStepCount ?? 0}
            />
          )
        }

        return <InlineCode className={className}>{children}</InlineCode>
      },

      pre({ children }: any) {
        return <>{children}</>
      },

      h1({ node: _, children, ...props }: any) {
        return <H1 {...props}>{children}</H1>
      },
      h2({ node: _, children, ...props }: any) {
        return <H2 {...props}>{children}</H2>
      },
      h3({ node: _, children, ...props }: any) {
        return <H3 {...props}>{children}</H3>
      },
      p({ node: _, children, ...props }: any) {
        return <P {...props}>{children}</P>
      },
      ul({ node: _, children, ...props }: any) {
        return <Ul {...props}>{children}</Ul>
      },
      ol({ node: _, children, ...props }: any) {
        return <Ol {...props}>{children}</Ol>
      },
      li({ node: _, children, ...props }: any) {
        return <Li {...props}>{children}</Li>
      },
      blockquote({ node: _, children, ...props }: any) {
        return <Blockquote {...props}>{children}</Blockquote>
      },
      img({ node: _, src, alt, ...props }: any) {
        return <Img src={src} alt={alt} {...props} />
      },
      a({ node: _, children, href, ...props }: any) {
        return (
          <A href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </A>
        )
      },
    }),
    [currentClick, localCodeClicks, codeClickOffset],
  )

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {markdown}
    </ReactMarkdown>
  )
}

const MarkdownWrapper = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.foreground};
`

const StepWrapper = styled.div<{ $visible: boolean }>`
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? '0' : '8px')});
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
`

const H1 = styled.h1`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 2.5em;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.foreground};
`

const H2 = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.8em;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.foreground};
`

const H3 = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.3em;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.foreground};
`

const P = styled.p`
  font-size: 1.1em;
  line-height: 1.7;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.secondaryText};
`

const Ul = styled.ul`
  padding-left: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  list-style-type: disc;
`

const Ol = styled.ol`
  padding-left: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`

const Li = styled.li`
  font-size: 1.1em;
  line-height: 1.7;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.secondaryText};
`

const InlineCode = styled.code`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 2px 6px;
  font-size: 0.9em;
  color: ${({ theme }) => theme.colors.accent};
`

const Blockquote = styled.blockquote`
  border-left: 4px solid ${({ theme }) => theme.colors.primary};
  padding-left: ${({ theme }) => theme.spacing.lg};
  margin: ${({ theme }) => theme.spacing.md} 0;
  font-style: italic;
  color: ${({ theme }) => theme.colors.secondaryText};
`

const Img = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: ${({ theme }) => theme.radii.md};
`

const A = styled.a`
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`
