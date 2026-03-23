import styled from "styled-components";
import type { ReactNode } from "react";

interface ImageRightLayoutProps {
  children: ReactNode;
  image?: string;
}

export function ImageRightLayout({ children, image }: ImageRightLayoutProps) {
  return (
    <Container>
      <Content>{children}</Content>
      {image && (
        <ImageSide>
          <img src={image} alt="" />
        </ImageSide>
      )}
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
`;

const Content = styled.div`
  padding: ${({ theme }) => theme.slide.padding};
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const ImageSide = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;
