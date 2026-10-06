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

/** Mermaid, which loads with the first diagram on a page. */
export const loadMermaid = () => import("mermaid");

/** The site's colour scheme; the system's while the page hydrates. */
export function useSiteScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, siteScheme, () => "auto");
}

/**
 * A deck on a page of the site, in the site's colour scheme. `css` is a
 * stylesheet for this deck only.
 */
export function DemoDeck({ css, ...props }: DeckProps & { css?: string }) {
  const name = css ? nameOf(css) : undefined;
  return (
    <Demo>
      {/* React puts the stylesheet in the head, where the presenter window
          copies it from, and keeps it there after navigation. So its scope
          is the element that holds this deck, on the page and in the
          window. */}
      {css ? (
        <style href={name} precedence="demo">
          {`@scope (:has(> .${name})) {\n${css}\n}`}
        </style>
      ) : null}
      <Deck
        className={name}
        colorScheme={useSiteScheme()}
        mermaid={loadMermaid}
        {...props}
      />
    </Demo>
  );
}

/** A class name for a stylesheet, the same on the server and the client. */
function nameOf(css: string): string {
  let hash = 0;
  for (let index = 0; index < css.length; index++) {
    hash = (hash * 31 + css.charCodeAt(index)) | 0;
  }
  return `demo-${(hash >>> 0).toString(36)}`;
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
