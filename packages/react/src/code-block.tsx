import {
  getHighlightedLines,
  parseHighlights,
  parseLineChanges,
  type LineChange,
} from "@slidewright/core";
import type { Element, ElementContent } from "hast";
import { Fragment, type ComponentProps, type CSSProperties } from "react";
import type { ThemedToken } from "shiki";
import { useSlideContext } from "./context";
import { useTokens } from "./highlighter";

type PreProps = ComponentProps<"pre"> & { node?: Element };

/**
 * Renders a fenced code block: optional title, line numbers, diff markers and
 * per-step line highlighting. Plain text renders immediately (and on the
 * server); syntax colours follow once the highlighter has loaded.
 */
export function CodeBlock({ node, children, ...rest }: PreProps) {
  const { step } = useSlideContext();
  const code = node?.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "code",
  );
  const properties = code?.properties ?? {};
  const lang = stringProperty(properties.dataLang) ?? "";
  const text = code ? textContent(code).replace(/\n$/, "") : "";
  const { tokens, pending } = useTokens(text, lang);

  if (!code) return <pre {...rest}>{children}</pre>;

  const title = stringProperty(properties.dataTitle);
  const highlights = stringProperty(properties.dataHighlights);
  const active = highlights
    ? getHighlightedLines(parseHighlights(highlights), step)
    : null;
  const firstLine =
    properties.dataLineNumbers === undefined
      ? undefined
      : Number(properties.dataLineNumbers);
  const numbered = firstLine !== undefined && Number.isInteger(firstLine);
  const changes = parseLineChanges(stringProperty(properties.dataDiff) ?? "");

  return (
    <figure data-code="" aria-busy={pending || undefined} {...rest}>
      {title ? <figcaption>{title}</figcaption> : null}
      <pre
        data-lang={lang || undefined}
        data-line-numbers={numbered ? "" : undefined}
        style={numbered ? { counterReset: `line ${firstLine - 1}` } : undefined}
      >
        <code>
          {text.split("\n").map((line, index) => {
            const lineTokens = tokens?.[index];
            const change = changes.get(index + 1);
            return (
              <Fragment key={index}>
                {index > 0 ? "\n" : null}
                <span
                  data-line=""
                  data-line-state={lineState(active, index + 1)}
                  data-line-diff={change}
                >
                  {changes.size > 0 ? (
                    <span data-diff-marker="">
                      {change ? DIFF_MARKERS[change] : null}
                    </span>
                  ) : null}
                  {lineTokens ? lineTokens.map(renderToken) : line}
                </span>
              </Fragment>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}

const DIFF_MARKERS: Record<LineChange, string> = { added: "+", removed: "-" };

function lineState(
  active: Set<number> | "all" | null,
  line: number,
): "highlighted" | "dimmed" | undefined {
  if (active === null || active === "all") return undefined;
  return active.has(line) ? "highlighted" : "dimmed";
}

// Shiki's FontStyle flags.
const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;
const STRIKETHROUGH = 8;

function renderToken(token: ThemedToken, index: number) {
  const style: CSSProperties = { color: token.color };
  const flags = token.fontStyle ?? 0;
  if (flags > 0) {
    if (flags & ITALIC) style.fontStyle = "italic";
    if (flags & BOLD) style.fontWeight = "bold";
    const decorations = [
      flags & UNDERLINE ? "underline" : "",
      flags & STRIKETHROUGH ? "line-through" : "",
    ].filter(Boolean);
    if (decorations.length > 0) style.textDecoration = decorations.join(" ");
  }
  return (
    <span key={index} style={style}>
      {token.content}
    </span>
  );
}

function stringProperty(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function textContent(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element") return "";
  return node.children.map(textContent).join("");
}
