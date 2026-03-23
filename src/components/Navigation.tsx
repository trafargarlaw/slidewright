import styled from "styled-components";

interface NavigationProps {
  slideIndex: number;
  totalSlides: number;
  currentClick: number;
  maxClicks: number;
  onNext: () => void;
  onPrev: () => void;
}

export function Navigation({
  slideIndex,
  totalSlides,
  currentClick,
  maxClicks,
  onNext,
  onPrev,
}: NavigationProps) {
  const progress = ((slideIndex + 1) / totalSlides) * 100;

  return (
    <NavContainer>
      <ProgressBar>
        <ProgressFill style={{ width: `${progress}%` }} />
      </ProgressBar>

      <Controls>
        <NavButton onClick={onPrev} aria-label="Previous">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
          </svg>
        </NavButton>

        <SlideInfo>
          {slideIndex + 1} / {totalSlides}
          {maxClicks > 0 && (
            <ClickInfo>
              {" "}
              ({currentClick}/{maxClicks})
            </ClickInfo>
          )}
        </SlideInfo>

        <NavButton onClick={onNext} aria-label="Next">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
          </svg>
        </NavButton>
      </Controls>
    </NavContainer>
  );
}

const NavContainer = styled.div`
  flex-shrink: 0;
`;

const ProgressBar = styled.div`
  height: 3px;
  background: rgba(0, 0, 0, 0.08);
  width: 100%;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.colors.primary};
  transition: width 0.3s ease;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.sm} 0;
  background: ${({ theme }) => theme.colors.background};
`;

const NavButton = styled.button`
  background: none;
  border: none;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.radii.sm};
  display: flex;
  align-items: center;
  transition: color 0.2s;

  &:hover {
    color: rgba(0, 0, 0, 0.85);
  }
`;

const SlideInfo = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  min-width: 80px;
  text-align: center;
`;

const ClickInfo = styled.span`
  color: rgba(0, 0, 0, 0.3);
`;
