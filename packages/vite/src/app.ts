// The page script of a deck served by the plugin.
import { parseDeck } from "@slidewright/core";
import { Deck, PrintDeck, type DirectiveComponents } from "@slidewright/react";
import "@slidewright/react/styles.css";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { components, markdown } from "virtual:slidewright/deck";

// `?print` shows every slide, one per printed page; `?print=steps` every step.
const print = new URLSearchParams(location.search).get("print");
const root = createRoot(document.getElementById("app")!);

function render(source: string, components: DirectiveComponents) {
  document.title = parseDeck(source).config.title ?? "Slides";
  root.render(
    print === null
      ? createElement(Deck, {
          markdown: source,
          components,
          hash: true,
          keyboard: "global",
          style: { height: "100%" },
        })
      : createElement(PrintDeck, {
          markdown: source,
          components,
          steps: print === "steps",
        }),
  );
}

render(markdown, components);

// Edits to the deck or its components re-render it in place, on the same
// slide and step.
import.meta.hot?.accept("virtual:slidewright/deck", (module) => {
  if (module) {
    render(module.markdown as string, module.components as DirectiveComponents);
  }
});
