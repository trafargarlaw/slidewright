import type { Element, Root } from "hast";

/**
 * Client-side registry for pasted images.
 * Maps short IDs (used in markdown) to blob URLs.
 * Will be replaced by real upload URLs later.
 */
const images = new Map<string, string>();
let counter = 0;

export function registerImage(blobUrl: string): string {
  const id = `paste-${++counter}`;
  images.set(id, blobUrl);
  return id;
}

export function resolveImage(id: string): string | undefined {
  return images.get(id);
}

/** Rehype plugin that points `<img data-paste-id>` at the pasted image. */
export function rehypePastedImages() {
  return (tree: Root) => {
    resolvePastedImages(tree);
  };
}

function resolvePastedImages(node: Root | Element) {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    const id = child.properties.dataPasteId;
    if (child.tagName === "img" && typeof id === "string") {
      const src = resolveImage(id);
      if (src) child.properties.src = src;
    }
    resolvePastedImages(child);
  }
}
