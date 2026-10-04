import { getSlideAtLine, parseDeck } from "@slidewright/core";
import { Deck, type DeckPosition } from "@slidewright/react";
import { useState } from "react";
import { components, layouts } from "./parts";
import slides from "./slides.md?raw";

export function App() {
  const [markdown, setMarkdown] = useState(slides);
  const [position, setPosition] = useState<DeckPosition>({ slide: 0, step: 0 });

  // Show the slide under the cursor.
  function follow(editor: HTMLTextAreaElement) {
    const line = editor.value
      .slice(0, editor.selectionStart)
      .split("\n").length;
    const slide = getSlideAtLine(parseDeck(editor.value), line);
    if (slide !== position.slide) setPosition({ slide, step: 0 });
  }

  return (
    <main className="app">
      <textarea
        aria-label="Deck source"
        spellCheck={false}
        value={markdown}
        onChange={(event) => setMarkdown(event.target.value)}
        onSelect={(event) => follow(event.currentTarget)}
      />
      <Deck
        markdown={markdown}
        position={position}
        onPositionChange={setPosition}
        layouts={layouts}
        components={components}
      />
    </main>
  );
}
