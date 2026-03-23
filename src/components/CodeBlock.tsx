import { useMemo } from "react";
import styled from "styled-components";
import { useShiki } from "../context/ShikiContext";
import { useClicks } from "../hooks/useClicks";
import { parseHighlightMeta } from "../parser/code-highlight";

interface CodeBlockProps {
  code: string;
  language: string;
  meta: string;
  startClick: number;
  stepCount: number;
}

export function CodeBlock({
  code,
  language,
  meta,
  startClick,
  stepCount,
}: CodeBlockProps) {
  const highlighter = useShiki();
  const { currentClick } = useClicks();

  const steps = useMemo(() => parseHighlightMeta(meta), [meta]);
  const hasSteps = steps.length > 0;

  const tokens = useMemo(() => {
    if (!highlighter) return null;
    try {
      return highlighter.codeToTokens(code, {
        lang: language as any,
        theme: "github-light",
      });
    } catch {
      return null;
    }
  }, [highlighter, code, language]);

  // Determine which step is active based on click state
  const hasExplicitClicks = steps.some((s) => s.click != null);
  let activeStepIndex = -1;
  if (hasExplicitClicks) {
    // Explicit mode: find the last step whose click <= currentClick
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].click != null && currentClick >= steps[i].click!) {
        activeStepIndex = i;
      }
    }
  } else if (hasSteps && stepCount > 0) {
    // Auto mode (backward compat)
    const relativeClick = currentClick - startClick;
    if (relativeClick >= 0) {
      activeStepIndex = Math.min(relativeClick, steps.length - 1);
    }
  }

  const activeStep = activeStepIndex >= 0 ? steps[activeStepIndex] : null;

  function isLineHighlighted(lineNum: number): boolean | null {
    if (!activeStep) return null;
    if (activeStep.lines === "all") return true;
    return activeStep.lines.includes(lineNum);
  }

  if (!tokens) {
    return (
      <Pre>
        <Code>{code}</Code>
      </Pre>
    );
  }

  return (
    <Pre>
      <Code>
        {tokens.tokens.map((line, i) => {
          const lineNum = i + 1;
          const highlighted = isLineHighlighted(lineNum);
          const dimmed = highlighted !== null && !highlighted;

          return (
            <Line key={i} $dimmed={dimmed}>
              {line.map((token, j) => (
                <span key={j} style={{ color: token.color }}>
                  {token.content}
                </span>
              ))}
              {"\n"}
            </Line>
          );
        })}
      </Code>
    </Pre>
  );
}

const Pre = styled.pre`
  background: ${({ theme }) => theme.colors.codeBg};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  overflow-x: auto;
  font-size: 12px;
  line-height: 18px;
  margin: 4px 0;
`;

const Code = styled.code`
  font-family: ${({ theme }) => theme.fonts.mono};
`;

const Line = styled.span<{ $dimmed: boolean }>`
  display: inline;
  opacity: ${({ $dimmed }) => ($dimmed ? 0.3 : 1)};
  transition: opacity 0.3s ease;
`;
