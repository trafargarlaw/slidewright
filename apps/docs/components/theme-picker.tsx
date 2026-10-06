"use client";
import type { DeckProps } from "@slidewright/react";
import { useState } from "react";
import { DemoDeck } from "./demo-deck";

const THEMES = ["default", "paper", "frost", "contrast", "vivid"];

/** A deck with a button for each built-in theme. */
export function ThemePicker({
  markdown,
  ...props
}: DeckProps & { markdown: string }) {
  const [theme, setTheme] = useState(
    () => /^theme: (.+)$/m.exec(markdown)?.[1] ?? "default",
  );

  return (
    <>
      <div className="theme-picker" role="group" aria-label="Theme">
        {THEMES.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={name === theme}
            onClick={() => setTheme(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {/* The deck reads the theme from its headmatter, as a deck file does. */}
      <DemoDeck
        {...props}
        markdown={markdown.replace(/^theme: .+$/m, `theme: ${theme}`)}
      />
    </>
  );
}
