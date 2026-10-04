import { styled } from "styled-components";
import type { ReactNode } from "react";

export function DefaultLayout({ children }: { children: ReactNode }) {
  return <Container>{children}</Container>;
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  padding: ${({ theme }) => theme.slide.padding};
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
`;
