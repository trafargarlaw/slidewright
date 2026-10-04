import { useEffect, useLayoutEffect, useRef } from "react";
import type { DeckPosition } from "./navigation";

// `#3` is slide 3; `#3.2` is slide 3 with two steps revealed.
const HASH = /^#(\d+)(?:\.(\d+))?$/;

/** The position in a URL hash, or `null` for any other hash. */
export function parseHash(hash: string): DeckPosition | null {
  const match = HASH.exec(hash);
  if (!match) return null;
  const slide = Number(match[1]) - 1;
  if (slide < 0) return null;
  return { slide, step: Number(match[2] ?? 0) };
}

export function formatHash({ slide, step }: DeckPosition): string {
  return step > 0 ? `#${slide + 1}.${step}` : `#${slide + 1}`;
}

/**
 * Keeps a deck's position in the URL hash. The deck goes to the hash's
 * position on mount and whenever the hash changes, and writes its own
 * position back as it moves.
 */
export function useHashSync(
  enabled: boolean,
  current: DeckPosition,
  go: (position: DeckPosition) => void,
) {
  // Before the first paint, so the deck opens on the hash's slide.
  useLayoutEffect(() => {
    if (!enabled) return;
    const read = () => {
      const position = parseHash(window.location.hash);
      if (position) go(position);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [enabled, go]);

  // Writes only once the deck moves, so the page's own anchor stays until
  // then. Replacing the history entry keeps Back for leaving the page.
  const { slide, step } = current;
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) {
      last.current = null;
      return;
    }
    const hash = formatHash({ slide, step });
    const moved = last.current !== null && last.current !== hash;
    last.current = hash;
    if (moved && window.location.hash !== hash) {
      window.history.replaceState(window.history.state, "", hash);
    }
  }, [enabled, slide, step]);
}
