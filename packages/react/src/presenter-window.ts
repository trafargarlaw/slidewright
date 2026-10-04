import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

// Room for the presenter's two columns.
const FEATURES = "popup,width=1000,height=640";
const STYLESHEETS = 'link[rel~="stylesheet" i], style';

type View = Window & typeof globalThis;

interface OpenWindow {
  popup: Window;
  opener: View;
  /** Brings the window's stylesheets in line with the opener's. */
  syncStyles: () => void;
}

/**
 * A second window to show the presenter view in, opened and closed with
 * `toggle`. It is styled like the page and closes with it. `popup` is
 * `null` while it is closed.
 */
export function usePresenterWindow(
  rootRef: RefObject<HTMLElement | null>,
  title: string,
) {
  const [open, setOpen] = useState<OpenWindow | null>(null);
  const latest = useRef(open);
  useLayoutEffect(() => {
    latest.current = open;
  });

  // Browsers only allow opening in response to a click or key press.
  const toggle = useCallback(() => {
    const current = latest.current;
    if (current && !current.popup.closed) {
      current.popup.close();
      setOpen(null);
    } else {
      const opener = rootRef.current?.ownerDocument.defaultView ?? window;
      setOpen(openWindow(opener));
    }
  }, [rootRef]);

  useEffect(() => {
    if (!open) return;
    const { popup, opener, syncStyles } = open;
    // Stylesheets come and go, such as when a bundler reloads them, and a
    // dark mode class can change on the root element.
    syncStyles();
    const observer = new opener.MutationObserver(syncStyles);
    observer.observe(opener.document.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    observer.observe(opener.document.documentElement, { attributes: true });

    const onClosed = () =>
      setOpen((current) => (current?.popup === popup ? null : current));
    const close = () => popup.close();
    popup.addEventListener("pagehide", onClosed);
    opener.addEventListener("pagehide", close);
    return () => {
      observer.disconnect();
      popup.removeEventListener("pagehide", onClosed);
      opener.removeEventListener("pagehide", close);
      popup.close();
    };
  }, [open]);

  useEffect(() => {
    if (open) open.popup.document.title = title;
  }, [open, title]);

  return { popup: open?.popup ?? null, toggle };
}

/** Opens an empty window from the same origin, or `null` if blocked. */
function openWindow(opener: View): OpenWindow | null {
  const popup = opener.open("", "_blank", FEATURES);
  if (!popup) return null;
  popup.document.body.style.margin = "0";
  // Styled from the start, so the presenter is first measured as it shows.
  const syncStyles = mirrorStyles(opener.document, popup.document);
  syncStyles();
  return { popup, opener, syncStyles };
}

/**
 * Returns a function that copies the stylesheets in the head of one
 * document, and the attributes of its root element, to another. Each call
 * updates the copies, in order, and only touches those that changed, so
 * linked stylesheets don't load again.
 */
function mirrorStyles(source: Document, target: Document): () => void {
  const copies = new Map<Element, { copy: Element; html: string }>();
  return () => {
    const from = source.documentElement;
    const to = target.documentElement;
    for (const name of to.getAttributeNames()) {
      if (!from.hasAttribute(name)) to.removeAttribute(name);
    }
    for (const { name, value } of from.attributes) to.setAttribute(name, value);

    const sheets = new Set(source.head.querySelectorAll(STYLESHEETS));
    for (const [sheet, { copy }] of copies) {
      if (sheets.has(sheet)) continue;
      copy.remove();
      copies.delete(sheet);
    }
    let previous: Element | null = null;
    for (const sheet of sheets) {
      const html = sheet.outerHTML;
      let entry = copies.get(sheet);
      if (entry?.html !== html) {
        const copy = target.importNode(sheet, true);
        if (entry) entry.copy.replaceWith(copy);
        else if (previous) previous.after(copy);
        else target.head.prepend(copy);
        entry = { copy, html };
        copies.set(sheet, entry);
      }
      previous = entry.copy;
    }
  };
}
