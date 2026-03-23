import styled from "styled-components";
import type { ReactNode } from "react";

export function CodeLayout({ children }: { children: ReactNode }) {
  return <Container>{children}</Container>;
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  padding: 32px 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.slideBackground};
  color: ${({ theme }) => theme.colors.foreground};

  h1,
  h2,
  h3 {
    font-family: ${({ theme }) => theme.fonts.heading};
    color: ${({ theme }) => theme.colors.foreground};
    font-size: 1.4em;
    font-weight: 600;
    flex-shrink: 0;
  }

  p {
    color: ${({ theme }) => theme.colors.secondaryText};
    font-size: 0.95em;
    flex-shrink: 0;
  }

  pre {
    margin: 0;
    border-radius: ${({ theme }) => theme.radii.lg};
    font-size: 14px;
    flex-shrink: 0;
  }

  blockquote {
    flex-shrink: 0;
  }
`;
