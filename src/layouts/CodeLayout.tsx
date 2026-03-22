import styled from 'styled-components'
import type { ReactNode } from 'react'

export function CodeLayout({ children }: { children: ReactNode }) {
  return <Container>{children}</Container>
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  padding: ${({ theme }) => theme.spacing.xl};
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.foreground};

  h1, h2, h3 {
    color: ${({ theme }) => theme.colors.foreground};
    font-size: 1.2em;
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }

  p {
    color: ${({ theme }) => theme.colors.secondaryText};
  }

  pre {
    flex: 1;
    margin: 0;
    border-radius: ${({ theme }) => theme.radii.md};
  }
`
