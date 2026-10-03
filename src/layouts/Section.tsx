import { styled } from "styled-components";
import type { ReactNode } from "react";

export function SectionLayout({ children }: { children: ReactNode }) {
  return (
    <Container>
      <Accent />
      <Content>{children}</Content>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  padding: ${({ theme }) => theme.slide.padding};
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  background: ${({ theme }) => theme.colors.surface};
`;

const Accent = styled.div`
  width: 60px;
  height: 4px;
  background: ${({ theme }) => theme.colors.primary};
  border-radius: 2px;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Content = styled.div`
  max-width: 70%;
`;
