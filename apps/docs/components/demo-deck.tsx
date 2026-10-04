"use client";
import type { ColorScheme } from "@slidewright/core";
import { Deck, type DeckProps } from "@slidewright/react";
import { useSyncExternalStore, type ReactNode } from "react";

// The site keeps the theme in use, light or dark, as a `dark` class on <html>.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const siteScheme = (): ColorScheme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

/** The site's colour scheme; the system's while the page hydrates. */
export function useSiteScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, siteScheme, () => "auto");
}

/**
 * A deck on a page of the site, in the site's colour scheme. `css` is a
 * stylesheet for this deck only.
 */
export function DemoDeck({ css, ...props }: DeckProps & { css?: string }) {
  return (
    <Demo>
      {/* Scoped to the demo: other pages keep the styles after navigation. */}
      {css ? <style>{`@scope {\n${css}\n}`}</style> : null}
      <Deck colorScheme={useSiteScheme()} {...props} />
    </Demo>
  );
}

/** Keeps the page's prose and code styles off the slides. */
export function Demo({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`demo not-prose not-fumadocs-codeblock not-fumadocs-code ${className}`}
    >
      {children}
    </div>
  );
}
