import type { Slide } from "@slidewright/core";
import type { Element, Properties, Root, RootContent } from "hast";
import { useEffect, useState, type RefObject } from "react";
import { drawAhead, isDiagram, type MermaidLoader } from "./diagram";
import { loadLanguage } from "./highlighter";
import { LruCache } from "./lru";
import { builtinLayouts, resolveLayout, type Layout } from "./layouts";
import { isMaths, loadKatex } from "./maths";
import { fenceContent } from "./render";
import { toClassName, type CompiledEntry } from "./slide";

// While the audience looks at a slide, the deck gets the slides around it
// ready: it compiles them, loads and decodes their images, draws their
// diagrams, and loads what colours their code and renders their maths. So
// a slide shows complete when the deck gets to it. Images stay loaded after
// their slide, so going back shows them at once too.

// Slides ahead are the likely next ones; going back is mostly by one.
const AHEAD = 3;
const BEHIND = 1;
// The images of the last few dozen slides.
const IMAGE_LIMIT = 64;

/** The attributes of an `img` that pick its image and how it is fetched. */
interface ImageSource {
  src?: string;
  srcset?: string;
  sizes?: string;
  crossOrigin?: string;
  referrerPolicy?: string;
}

/** What a slide loads or draws before it shows complete. */
interface Needs {
  images: ImageSource[];
  /** Languages of code blocks, in lower case. */
  languages: Set<string>;
  maths: boolean;
  /** Sources of Mermaid diagrams. */
  diagrams: string[];
}

/**
 * Gets the slides around `current` ready in idle time, and keeps the images
 * it loads until the deck goes. `canvas` is the element that the slides
 * show in.
 */
export function usePreload(
  canvas: RefObject<HTMLElement | null>,
  slides: readonly Slide[],
  getSlide: (index: number) => CompiledEntry,
  layouts: Readonly<Record<string, Layout>>,
  current: number,
  mermaid: MermaidLoader | undefined,
): void {
  // Per deck, so they are freed with it. The presenter view, which can be
  // in a window of its own, has its own.
  const [images] = useState(
    () => new LruCache<string, HTMLImageElement>(IMAGE_LIMIT),
  );

  useEffect(() => {
    const element = canvas.current;
    const view = element?.ownerDocument.defaultView;
    if (!element || !view) return;

    const prepare = () => {
      for (const index of nearby(current, slides.length)) {
        const slide = slides[index]!;
        const needs = findNeeds(slide, getSlide(index).tree, !!mermaid);
        for (const image of needs.images) {
          loadImage(images, element.ownerDocument, image);
        }
        for (const lang of needs.languages) loadLanguage(lang);
        if (needs.maths) loadKatex();
        // The slide on show draws its diagrams itself.
        if (mermaid && index !== current && needs.diagrams.length > 0) {
          const layout = resolveLayout(layouts, slide.layout);
          drawDiagrams(element, slide, layout, needs.diagrams, mermaid);
        }
      }
    };

    // After the slide on show has rendered and asked for what it needs.
    // Not every browser has idle callbacks, nor has jsdom.
    if (typeof view.requestIdleCallback === "function") {
      const handle = view.requestIdleCallback(prepare, { timeout: 1000 });
      return () => view.cancelIdleCallback(handle);
    }
    const handle = view.setTimeout(prepare, 100);
    return () => view.clearTimeout(handle);
  }, [images, canvas, slides, getSlide, layouts, current, mermaid]);
}

/**
 * The slides to get ready, nearest first: the one on show, the ones after
 * it, then the ones before it.
 */
function nearby(current: number, count: number): number[] {
  const after = Array.from({ length: AHEAD + 1 }, (_, i) => current + i);
  const before = Array.from({ length: BEHIND }, (_, i) => current - 1 - i);
  return [...after, ...before].filter((index) => index >= 0 && index < count);
}

/** What a compiled slide needs, going by how `Pre` and `Code` render it. */
function findNeeds(slide: Slide, tree: Root, diagrams: boolean): Needs {
  const needs: Needs = {
    images: [],
    languages: new Set(),
    maths: false,
    diagrams: [],
  };
  // The picture of the `image` layouts.
  const { image } = slide.frontmatter;
  if (typeof image === "string" && image) needs.images.push({ src: image });

  const visit = (node: RootContent): void => {
    if (node.type !== "element") return;
    if (node.tagName === "pre") {
      if (node.children.some(isMaths)) {
        needs.maths = true;
        return;
      }
      const diagram = diagrams ? node.children.find(isDiagram) : undefined;
      if (diagram) {
        needs.diagrams.push(fenceContent(diagram));
        return;
      }
      const code = node.children.find(
        (child): child is Element =>
          child.type === "element" && child.tagName === "code",
      );
      if (code) {
        const lang = code.properties.dataLang;
        if (typeof lang === "string") needs.languages.add(lang.toLowerCase());
        return;
      }
    } else if (node.tagName === "code") {
      if (isMaths(node)) needs.maths = true;
    } else if (node.tagName === "picture") {
      // The browser picks one of its sources, which could be another image
      // than its `img`.
      return;
    } else if (node.tagName === "img") {
      needs.images.push(imageSource(node.properties));
    } else if (node.tagName === "video") {
      const poster = text(node.properties.poster);
      if (poster) needs.images.push({ src: poster });
    }
    node.children.forEach(visit);
  };
  tree.children.forEach(visit);
  return needs;
}

const text = (value: unknown) =>
  typeof value === "string" ? value : undefined;

function imageSource({
  src,
  srcSet,
  sizes,
  crossOrigin,
  referrerPolicy,
}: Properties): ImageSource {
  return {
    src: text(src),
    srcset: text(srcSet),
    sizes: text(sizes),
    crossOrigin: text(crossOrigin),
    referrerPolicy: text(referrerPolicy),
  };
}

/**
 * Loads and decodes an image as a slide's `img` would, and keeps it. A
 * document reuses an image that it has loaded and still holds, without
 * asking the server again, so the slide's image shows at once.
 */
function loadImage(
  images: LruCache<string, HTMLImageElement>,
  document: Document,
  source: ImageSource,
): void {
  if (!source.src && !source.srcset) return;
  const key = JSON.stringify(source);
  if (images.get(key)) return;

  const image = document.createElement("img");
  // The same request as the slide's image makes: the same CORS mode and
  // referrer, and the same pick from the srcset.
  if (source.crossOrigin !== undefined) image.crossOrigin = source.crossOrigin;
  if (source.referrerPolicy !== undefined) {
    image.referrerPolicy = source.referrerPolicy;
  }
  if (source.sizes !== undefined) image.sizes = source.sizes;
  if (source.srcset !== undefined) image.srcset = source.srcset;
  if (source.src !== undefined) image.src = source.src;
  images.set(key, image);
  // Not every DOM decodes images: jsdom doesn't. A broken image rejects.
  if (typeof image.decode === "function") image.decode().catch(() => {});
}

/**
 * Draws a slide's diagrams ahead, in the colours and font of a stand-in for
 * the slide in the canvas. A diagram that a custom layout gives other
 * colours is drawn again when it shows.
 */
function drawDiagrams(
  canvas: HTMLElement,
  slide: Slide,
  layout: Layout,
  sources: readonly string[],
  load: MermaidLoader,
): void {
  const document = canvas.ownerDocument;
  const standIn = document.createElement("section");
  standIn.dataset.slide = "";
  standIn.dataset.layout = slide.layout;
  const className = toClassName(slide.frontmatter.class);
  if (className) standIn.className = className;
  // It goes before the browser renders, so it needs no layout.
  standIn.style.display = "none";
  const figure = document.createElement("figure");
  figure.dataset.diagram = "";
  // The image layouts put the content in a part of its own, which the
  // `image` layout gives other colours.
  if (layout === builtinLayouts.image) {
    const content = document.createElement("div");
    content.dataset.part = "content";
    content.append(figure);
    standIn.append(content);
  } else {
    standIn.append(figure);
  }
  canvas.append(standIn);
  try {
    drawAhead(sources, figure, load);
  } finally {
    standIn.remove();
  }
}
