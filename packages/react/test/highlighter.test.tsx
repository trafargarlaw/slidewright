import { render, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Deck } from "../src";

// A stand-in for Shiki, whose Python grammar fails to load, as when its chunk
// can't be fetched. Other languages colour each line as a keyword.
vi.mock("shiki", () => ({
  bundledLanguages: { python: {}, ts: {} },
  createCssVariablesTheme: () => ({}),
  createJavaScriptRegexEngine: () => ({}),
  createHighlighter: async () => ({
    loadLanguage: async (lang: string) => {
      if (lang === "python") {
        throw new TypeError("Failed to fetch dynamically imported module");
      }
    },
    codeToTokensBase: (code: string) =>
      code
        .split("\n")
        .map((line) => [
          { content: line, offset: 0, color: "var(--deck-code-token-keyword)" },
        ]),
  }),
}));

it("shows plain code, no longer busy, when a language fails to load", async () => {
  render(
    <Deck markdown={"```python\nx = 1\n```\n\n```ts\nconst a = 1;\n```"} />,
  );
  const busy = () =>
    [...document.querySelectorAll("[data-code]")].map((figure) =>
      figure.getAttribute("aria-busy"),
    );

  expect(busy()).toEqual(["true", "true"]);
  await waitFor(() => expect(busy()).toEqual([null, null]));

  const [python, ts] = document.querySelectorAll("[data-code]");
  expect(python!.querySelector("[data-line]")?.textContent).toBe("x = 1");
  expect(python!.querySelector("[data-line] span[style]")).toBeNull();
  // Other languages still get colours.
  expect(ts!.querySelector("[data-line] span[style]")).not.toBeNull();
});
