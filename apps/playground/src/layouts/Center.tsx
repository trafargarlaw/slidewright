import { styled } from "styled-components";
import type { ReactNode } from "react";

export function CenterLayout({ children }: { children: ReactNode }) {
  return <Container>{children}</Container>;
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
`;
