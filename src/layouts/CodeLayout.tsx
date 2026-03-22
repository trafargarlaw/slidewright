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
  background: ${({ theme }) => theme.colors.codeBg};
  color: ${({ theme }) => theme.colors.codeText};

  h1, h2, h3 {
    color: ${({ theme }) => theme.colors.codeText};
    font-size: 1.2em;
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }

  p {
    color: rgba(255, 255, 255, 0.6);
  }

  pre {
    flex: 1;
    margin: 0;
    border-radius: ${({ theme }) => theme.radii.md};
  }
`
