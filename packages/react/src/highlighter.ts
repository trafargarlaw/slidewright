import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { HighlighterGeneric, ThemedToken } from "shiki";

// Shiki loads on first use, in its own chunk, so decks without code stay
// small. Token colours are CSS variables (`--deck-code-token-*`) defined by
// the theme stylesheet, which keeps code themable with plain CSS.

type Highlighter = HighlighterGeneric<string, string>;

const THEME = "deck-css-variables";
const PLAIN_TEXT = new Set(["", "text", "txt", "plain", "plaintext"]);

type LanguageStatus = "loading" | "ready" | "unsupported";

let highlighter: Highlighter | undefined;
let highlighterPromise: Promise<Highlighter> | undefined;
const languages = new Map<string, LanguageStatus>();

let version = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setStatus(lang: string, status: LanguageStatus): void {
  languages.set(lang, status);
  version++;
  for (const listener of listeners) listener();
}

function loadHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= import("shiki").then(async (shiki) => {
    const instance = (await shiki.createHighlighter({
      themes: [
        shiki.createCssVariablesTheme({
          name: THEME,
          variablePrefix: "--deck-code-",
        }),
      ],
      langs: [],
      engine: shiki.createJavaScriptRegexEngine({ forgiving: true }),
    })) as Highlighter;
    highlighter = instance;
    return instance;
  });
  return highlighterPromise;
}

function loadLanguage(lang: string): void {
  if (languages.has(lang)) return;
  languages.set(lang, "loading");

  void (async () => {
    try {
      const { bundledLanguages } = await import("shiki");
      if (!Object.hasOwn(bundledLanguages, lang)) {
        setStatus(lang, "unsupported");
        return;
      }
      const instance = await loadHighlighter();
      await instance.loadLanguage(lang);
      setStatus(lang, "ready");
    } catch {
      setStatus(lang, "unsupported");
    }
  })();
}

/**
 * Tokens for a code block, one array per line, or `null` while the
 * highlighter or language is loading (and for unknown languages).
 */
export function useTokens(code: string, lang: string): ThemedToken[][] | null {
  const name = lang.toLowerCase();
  // The server snapshot is "nothing loaded", so hydration renders plain text
  // like the server did, then upgrades.
  const loaded = useSyncExternalStore(
    subscribe,
    () => version,
    () => -1,
  );

  useEffect(() => {
    if (!PLAIN_TEXT.has(name)) loadLanguage(name);
  }, [name]);

  const ready = loaded !== -1 && languages.get(name) === "ready";
  return useMemo(() => {
    if (!ready || !highlighter) return null;
    try {
      return highlighter.codeToTokensBase(code, { lang: name, theme: THEME });
    } catch {
      return null;
    }
  }, [ready, code, name]);
}
