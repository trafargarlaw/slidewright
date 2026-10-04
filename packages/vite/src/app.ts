// The page script of a deck served by the plugin.
import { parseDeck } from "@slidewright/core";
import { Deck } from "@slidewright/react";
import "@slidewright/react/styles.css";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { markdown } from "virtual:slidewright/deck";

const root = createRoot(document.getElementById("app")!);

function render(source: string) {
  document.title = parseDeck(source).config.title ?? "Slides";
  root.render(
    createElement(Deck, {
      markdown: source,
      hash: true,
      keyboard: "global",
      style: { height: "100%" },
    }),
  );
}

render(markdown);

// Edits to the deck re-render it in place, on the same slide and step.
import.meta.hot?.accept("virtual:slidewright/deck", (module) => {
  if (module) render(module.markdown as string);
});
