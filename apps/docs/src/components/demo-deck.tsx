import type { ColorScheme } from "@slidewright/core";
import { Deck, type DeckProps } from "@slidewright/react";
import "@slidewright/react/styles.css";
import { useSyncExternalStore } from "react";

// Starlight keeps the theme in use, light or dark, in `data-theme` on <html>.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const siteScheme = (): ColorScheme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

/** The site's colour scheme; the system's while the page hydrates. */
export function useSiteScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, siteScheme, () => "auto");
}

/** A deck on a page of the site, in the site's colour scheme. */
export function DemoDeck(props: DeckProps) {
  // `not-content` keeps Starlight's prose styles off the slides.
  return (
    <div className="demo not-content">
      <Deck colorScheme={useSiteScheme()} {...props} />
    </div>
  );
}
