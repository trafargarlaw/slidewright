import { styled } from "styled-components";
import type { ReactNode } from "react";

export function FullLayout({ children }: { children: ReactNode }) {
  return <Container>{children}</Container>;
}

const Container = styled.div`
  width: 100%;
  height: 100%;
`;
