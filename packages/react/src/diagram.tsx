import type { Element, ElementContent } from "hast";
import {
  createContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
} from "react";
import { LruCache } from "./lru";

// Mermaid is large, so the package doesn't depend on it: the app gives a
// function that loads it. It loads with the first diagram, on show or drawn
// ahead, and draws each diagram once for the colours it is shown in.

/** The part of Mermaid that the deck uses. */
interface Mermaid {
  initialize(config: Record<string, unknown>): void;
  render(
    id: string,
    source: string,
    container?: HTMLElement,
  ): Promise<{ svg: string }>;
}

/**
 * Loads Mermaid, which draws `mermaid` code blocks as diagrams:
 * `() => import("mermaid")`.
 */
export type MermaidLoader = () => Promise<{ default: Mermaid }>;

/** The loader of the deck that a slide is in. */
export const MermaidContext = createContext<MermaidLoader | undefined>(
  undefined,
);

/** A drawn diagram, or the reason why it has none. */
type Drawing = { id: string; svg: string } | { error: string };

/** A diagram to draw, in the colours and font of `theme`. */
interface Request {
  key: string;
  source: string;
  theme: string;
  load: MermaidLoader;
}

const drawings = new LruCache<string, Drawing>(200);
const requested = new Set<string>();
// Diagrams on show are drawn before those of the slides to come.
const waiting = { shown: [] as Request[], ahead: [] as Request[] };
const listeners = new Set<() => void>();
let mermaid: Mermaid | undefined;
let busy = false;
let drawn = 0;
let shown = 0;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function draw(request: Request, ahead: boolean): void {
  if (!requested.has(request.key)) {
    requested.add(request.key);
    waiting[ahead ? "ahead" : "shown"].push(request);
    if (!busy) void drawWaiting();
  } else if (!ahead) {
    // A diagram drawn ahead that comes on show before its turn.
    const index = waiting.ahead.findIndex(({ key }) => key === request.key);
    if (index !== -1) waiting.shown.push(...waiting.ahead.splice(index, 1));
  }
}

const nextRequest = () => waiting.shown.shift() ?? waiting.ahead.shift();

// Mermaid's config is global, so diagrams are drawn one after the other.
async function drawWaiting(): Promise<void> {
  busy = true;
  for (let request = nextRequest(); request; request = nextRequest()) {
    const { key, source, theme, load } = request;
    let result: Drawing;
    try {
      mermaid ??= (await load()).default;
      mermaid.initialize({
        ...(JSON.parse(theme) as Record<string, unknown>),
        startOnLoad: false,
        // Labels can't hold scripts or handlers, whoever wrote the deck.
        securityLevel: "strict",
        // An error is thrown, and not drawn at the end of the page.
        suppressErrorRendering: true,
      });
      const id = `slidewright-diagram-${++drawn}`;
      // Mermaid draws in the page to measure the text, at the end of the
      // body unless it is given a place. There the drawing makes the page
      // longer for a moment, and can bring a scroll bar that resizes the
      // deck. This place is out of sight and out of the page's flow.
      const place = document.createElement("div");
      place.setAttribute("aria-hidden", "true");
      place.style.cssText =
        "position: fixed; top: 0; left: 0; width: 100%; visibility: hidden; pointer-events: none";
      document.body.append(place);
      try {
        result = { id, svg: (await mermaid.render(id, source, place)).svg };
      } finally {
        place.remove();
      }
    } catch (error) {
      result = {
        error: error instanceof Error ? error.message : String(error),
      };
    }
    drawings.set(key, result);
    requested.delete(key);
    for (const listener of listeners) listener();
  }
  busy = false;
}

/**
 * Draws diagrams before they show, after those on show, in the colours and
 * font of `place`: an element where their figures will be.
 */
export function drawAhead(
  sources: readonly string[],
  place: HTMLElement,
  load: MermaidLoader,
): void {
  const theme = readTheme(place);
  for (const source of sources) {
    const key = `${theme}\n${source}`;
    if (!drawings.get(key)) draw({ key, source, theme, load }, true);
  }
}

type Rgba = [red: number, green: number, blue: number, alpha: number];

let canvas: CanvasRenderingContext2D | null | undefined;

/** Any CSS colour as sRGB, which is what Mermaid can read. */
function toRgba(color: string): Rgba | undefined {
  if (canvas === undefined) {
    try {
      const element = document.createElement("canvas");
      element.width = element.height = 1;
      canvas = element.getContext("2d", { willReadFrequently: true }) ?? null;
    } catch {
      canvas = null;
    }
  }
  if (!canvas) return undefined;
  canvas.clearRect(0, 0, 1, 1);
  canvas.fillStyle = color;
  canvas.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0, alpha = 0] = canvas.getImageData(
    0,
    0,
    1,
    1,
  ).data;
  return [red, green, blue, alpha / 255];
}

const css = ([red, green, blue, alpha]: Rgba) =>
  `rgba(${red}, ${green}, ${blue}, ${Number(alpha.toFixed(3))})`;

/** `amount` of `color` over `base`. */
function mix(color: Rgba, base: Rgba, amount: number): Rgba {
  const channel = (index: 0 | 1 | 2) =>
    Math.round(color[index] * amount + base[index] * (1 - amount));
  return [channel(0), channel(1), channel(2), 1];
}

const COLORS = ["bg", "fg", "muted", "accent", "border", "surface"] as const;
// How much of the accent each slice of a pie chart has. Neighbours differ,
// and the text colour reads on all of them.
const PIE_SHADES = [
  0.6, 0.3, 0.45, 0.15, 0.55, 0.25, 0.4, 0.1, 0.5, 0.2, 0.35, 0.65,
];

/**
 * Mermaid config for the deck's theme where the diagram is, as JSON: the
 * deck's colours and font. Without them, such as in a test, Mermaid's own.
 */
function readTheme(element: HTMLElement): string {
  const view = element.ownerDocument.defaultView;
  if (!view) return "{}";

  const probe = element.ownerDocument.createElement("span");
  probe.hidden = true;
  element.append(probe);
  const colors: Partial<Record<(typeof COLORS)[number], Rgba>> = {};
  for (const name of COLORS) {
    probe.style.color = `var(--deck-${name})`;
    colors[name] = toRgba(view.getComputedStyle(probe).color);
  }
  probe.remove();

  const fontFamily = view.getComputedStyle(element).fontFamily;
  const { bg, fg, muted, accent, border, surface } = colors;
  if (!bg || !fg || !muted || !accent || !border || !surface) {
    return JSON.stringify({ fontFamily });
  }
  const [red, green, blue] = bg;
  return JSON.stringify({
    fontFamily,
    theme: "base",
    themeVariables: {
      fontFamily,
      darkMode: 0.299 * red + 0.587 * green + 0.114 * blue < 128,
      background: css(bg),
      // Mermaid derives the other fills from this one, so it has a tint.
      primaryColor: css(mix(accent, bg, 0.14)),
      primaryBorderColor: css(accent),
      primaryTextColor: css(fg),
      secondaryTextColor: css(fg),
      tertiaryTextColor: css(fg),
      lineColor: css(muted),
      edgeLabelBackground: css(bg),
      clusterBkg: css(surface),
      clusterBorder: css(border),
      noteBkgColor: css(surface),
      noteBorderColor: css(border),
      noteTextColor: css(fg),
      pieStrokeColor: css(bg),
      pieOuterStrokeColor: css(border),
      pieOpacity: "1",
      pieTitleTextColor: css(fg),
      pieLegendTextColor: css(fg),
      ...Object.fromEntries(
        PIE_SHADES.map((shade, index) => [
          `pie${index + 1}`,
          css(mix(accent, bg, shade)),
        ]),
      ),
    },
  });
}

/** A `code` element that holds a Mermaid diagram: a `mermaid` fence. */
export function isDiagram(node: ElementContent): node is Element {
  if (node.type !== "element" || node.tagName !== "code") return false;
  const { dataLang } = node.properties;
  return typeof dataLang === "string" && dataLang.toLowerCase() === "mermaid";
}

interface DiagramProps extends HTMLAttributes<HTMLElement> {
  /** The Mermaid source. */
  source: string;
  load: MermaidLoader;
}

/**
 * Draws a diagram with Mermaid, in the deck's colours and font. The source
 * shows first (and on the server); the diagram follows once Mermaid has
 * drawn it. A source with a mistake stays, with Mermaid's message.
 */
export function Diagram({ source, load, ...rest }: DiagramProps) {
  const ref = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<string | null>(null);
  // Each diagram on the page needs its own ids, and a drawing can show
  // several times: on the slide, in the overview, for the presenter.
  const [id] = useState(() => `slidewright-diagram-shown-${++shown}`);

  // After every render, as any of them can change the colours: a new colour
  // scheme, a class on the slide. Before the browser paints, so a diagram
  // that is already drawn shows at once.
  useLayoutEffect(() => {
    if (ref.current) setTheme(readTheme(ref.current));
  });
  useEffect(() => {
    const view = ref.current?.ownerDocument.defaultView;
    const scheme = view?.matchMedia?.("(prefers-color-scheme: dark)");
    const update = () => {
      if (ref.current) setTheme(readTheme(ref.current));
    };
    scheme?.addEventListener("change", update);
    return () => scheme?.removeEventListener("change", update);
  }, []);

  const key = theme === null ? null : `${theme}\n${source}`;
  // The server snapshot is "nothing drawn", so hydration renders the source
  // like the server did, then upgrades.
  const drawing = useSyncExternalStore(
    subscribe,
    () => (key === null ? undefined : drawings.get(key)),
    () => undefined,
  );
  useEffect(() => {
    if (key !== null && theme !== null && !drawings.get(key)) {
      draw({ key, source, theme, load }, false);
    }
  }, [key, source, theme, load]);

  if (drawing && "svg" in drawing) {
    return (
      <figure
        ref={ref}
        data-diagram=""
        {...rest}
        dangerouslySetInnerHTML={{
          __html: drawing.svg.replaceAll(drawing.id, id),
        }}
      />
    );
  }
  return (
    <figure
      ref={ref}
      data-diagram=""
      data-diagram-error={drawing ? "" : undefined}
      aria-busy={drawing ? undefined : true}
      {...rest}
    >
      <pre>
        <code>{source}</code>
      </pre>
      {drawing ? <figcaption>{drawing.error}</figcaption> : null}
    </figure>
  );
}
