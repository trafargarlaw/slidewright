"use client";
import { getSlideAtLine, parseDeck } from "@slidewright/core";
import { Deck, type DeckPosition, type DeckProps } from "@slidewright/react";
import { useState } from "react";
import { Demo, useSiteScheme } from "./demo-deck";

/** A text area with the deck it renders, which shows the slide under the cursor. */
export function LiveEditor({
  markdown: initial,
  ...props
}: Pick<DeckProps, "markdown" | "layouts" | "components">) {
  const [markdown, setMarkdown] = useState(initial);
  const [position, setPosition] = useState<DeckPosition>({ slide: 0, step: 0 });

  function follow(editor: HTMLTextAreaElement) {
    const line = editor.value
      .slice(0, editor.selectionStart)
      .split("\n").length;
    const slide = getSlideAtLine(parseDeck(editor.value), line);
    if (slide !== position.slide) setPosition({ slide, step: 0 });
  }

  return (
    <Demo className="live-editor">
      <textarea
        aria-label="Deck source"
        spellCheck={false}
        value={markdown}
        onChange={(event) => setMarkdown(event.target.value)}
        onSelect={(event) => follow(event.currentTarget)}
      />
      <Deck
        {...props}
        markdown={markdown}
        position={position}
        onPositionChange={setPosition}
        colorScheme={useSiteScheme()}
      />
    </Demo>
  );
}
