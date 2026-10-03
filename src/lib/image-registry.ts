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
