// The components for the deck's directives. The CLI loads this file because
// it is next to the deck; the Vite plugin takes it in `components`.
import type { DirectiveComponents } from "@slidewright/react";
import { useState, type ReactNode } from "react";

/** `:::callout{tone="warning"}`: a note that stands out. */
function Callout({
  tone = "info",
  children,
}: {
  tone?: string;
  children?: ReactNode;
}) {
  return (
    <div className="callout" data-tone={tone}>
      {children}
    </div>
  );
}

/** `::counter{label="Hands up" start="3"}`: a button that counts clicks. */
function Counter({
  label = "Count",
  start = "0",
}: {
  label?: string;
  start?: string;
}) {
  const [count, setCount] = useState(Number(start) || 0);
  return (
    <button
      type="button"
      className="counter"
      onClick={() => setCount(count + 1)}
    >
      {label}: <strong>{count}</strong>
    </button>
  );
}

// By directive name. Attributes arrive as strings.
export default {
  callout: Callout,
  counter: Counter,
} satisfies DirectiveComponents;
