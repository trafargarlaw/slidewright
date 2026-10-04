import { styled } from "styled-components";
import type { ReactNode } from "react";

interface ImageLeftLayoutProps {
  children: ReactNode;
  image?: string;
}

export function ImageLeftLayout({ children, image }: ImageLeftLayoutProps) {
  return (
    <Container>
      {image && (
        <ImageSide>
          <img src={image} alt="" />
        </ImageSide>
      )}
      <Content>{children}</Content>
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
