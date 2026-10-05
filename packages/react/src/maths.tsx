import type { ElementContent, Element } from "hast";
import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type HTMLAttributes,
} from "react";

// KaTeX loads on first use, in its own chunk, so decks without maths stay
// small. Its stylesheet is part of styles.css.

type Renderer = (typeof import("katex"))["renderToString"];
type Status = "idle" | "loading" | "ready" | "failed";

let renderer: Renderer | undefined;
let status: Status = "idle";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function loadKatex(): void {
  if (status !== "idle") return;
  status = "loading";

  void import("katex")
    .then(
      (katex) => {
        renderer = katex.default.renderToString;
        status = "ready";
      },
      () => {
        status = "failed";
      },
    )
    .then(() => {
      for (const listener of listeners) listener();
    });
}

/** A `code` element that holds LaTeX: `$…$`, `$$…$$` or a `math` fence. */
export function isMaths(node: ElementContent): node is Element {
  if (node.type !== "element" || node.tagName !== "code") return false;
  const { className } = node.properties;
  return Array.isArray(className) && className.includes("language-math");
}

interface MathsProps extends HTMLAttributes<HTMLElement> {
  /** The LaTeX source. */
  source: string;
  /** Display maths, on its own line. Inline otherwise. */
  display?: boolean;
}

/**
 * Renders LaTeX with KaTeX. The source shows first (and on the server); the
 * maths follows once KaTeX has loaded. LaTeX with a mistake renders as its
 * source, in KaTeX's error colour.
 */
export function Maths({ source, display = false, ...rest }: MathsProps) {
  // The server snapshot is "nothing loaded", so hydration renders the source
  // like the server did, then upgrades.
  const current = useSyncExternalStore(
    subscribe,
    () => status,
    (): Status => "idle",
  );
  useEffect(loadKatex, []);

  const html = useMemo(() => {
    if (current !== "ready" || !renderer) return null;
    try {
      return renderer(source, { displayMode: display, throwOnError: false });
    } catch {
      return null;
    }
  }, [current, source, display]);

  const Tag = display ? "div" : "span";
  const kind = display ? "display" : "inline";

  if (html === null) {
    const pending = current === "idle" || current === "loading";
    return (
      <Tag data-math={kind} aria-busy={pending || undefined} {...rest}>
        <code>{source}</code>
      </Tag>
    );
  }
  // KaTeX escapes the source, and commands that could inject markup (`\href`,
  // `\htmlClass`) are off unless `trust` is set.
  return (
    <Tag
      data-math={kind}
      {...rest}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
