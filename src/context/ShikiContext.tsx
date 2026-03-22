import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Highlighter } from 'shiki'
import { createHighlighter } from 'shiki'

const ShikiContext = createContext<Highlighter | null>(null)

const PRELOAD_LANGS = [
  'typescript',
  'javascript',
  'python',
  'r',
  'css',
  'html',
  'json',
  'bash',
  'sql',
  'jsx',
  'tsx',
  'markdown',
  'yaml',
] as const

export function ShikiProvider({ children }: { children: ReactNode }) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null)

  useEffect(() => {
    createHighlighter({
      themes: ['github-light'],
      langs: [...PRELOAD_LANGS],
    }).then(setHighlighter)
  }, [])

  return (
    <ShikiContext.Provider value={highlighter}>
      {children}
    </ShikiContext.Provider>
  )
}

export function useShiki() {
  return useContext(ShikiContext)
}
