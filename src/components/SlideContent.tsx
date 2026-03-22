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
import { computeClickMap } from '../parser/code-highlight'
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
        node.data.hProperties['data-source-line'] = String(node.position.start.line)
      }
    })

    visit(tree, 'listItem', (node: any) => {
      if (node.position) {
        node.data = node.data || {}
        node.data.hProperties = node.data.hProperties || {}
        node.data.hProperties['data-source-line'] = String(node.position.start.line)
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

export function SlideContent({ markdown, clickOffset = 0 }: SlideContentProps) {
  const { currentClick } = useClicks()

  // Compute click map from THIS markdown (not the full slide content)
  // so that line numbers from remark AST always match our map
  const localClickMap = useMemo(() => computeClickMap(markdown), [markdown])

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
            ? localClickMap.lineToClick.get(sourceLine)
            : undefined
          const localStepCount = sourceLine
            ? localClickMap.lineToStepCount.get(sourceLine)
            : undefined

          return (
            <CodeBlock
              language={match[1]}
              code={String(children).replace(/\n$/, '')}
              meta={meta}
              startClick={localClickIndex != null ? clickOffset + localClickIndex : 0}
              stepCount={localStepCount ?? 0}
            />
          )
        }

        return (
          <InlineCode className={className}>
            {children}
          </InlineCode>
        )
      },

      pre({ children }: any) {
        return <>{children}</>
      },

      li({ node: _, children, ...props }: any) {
        const { 'data-source-line': sourceLineStr, ...restProps } = props
        const sourceLine = sourceLineStr
          ? parseInt(sourceLineStr, 10)
          : undefined
        const localClickIndex = sourceLine
          ? localClickMap.lineToClick.get(sourceLine)
          : undefined
        const effectiveClick = localClickIndex != null
          ? clickOffset + localClickIndex
          : undefined

        const visible = effectiveClick == null || currentClick >= effectiveClick

        return (
          <AnimatedLi {...restProps} $visible={visible}>
            {children}
          </AnimatedLi>
        )
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
    [currentClick, localClickMap, clickOffset],
  )

  return (
    <MarkdownWrapper>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </MarkdownWrapper>
  )
}

const MarkdownWrapper = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.foreground};
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

const AnimatedLi = styled.li<{ $visible: boolean }>`
  font-size: 1.1em;
  line-height: 1.7;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.secondaryText};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateX(${({ $visible }) => ($visible ? '0' : '-8px')});
  transition: opacity 0.3s ease, transform 0.3s ease;
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
