import styled from 'styled-components'
import type { ReactNode } from 'react'

export function CoverLayout({ children }: { children: ReactNode }) {
  return <Container>{children}</Container>
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  padding: ${({ theme }) => theme.slide.padding};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: linear-gradient(135deg, #05192D 0%, #0A2540 100%);
  color: white;

  h1, h2, h3, p, li, span, code {
    color: white;
  }

  p {
    color: rgba(255, 255, 255, 0.7);
  }
`
