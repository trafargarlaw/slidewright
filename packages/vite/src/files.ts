import { existsSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { compileSlide, type Deck } from "@slidewright/core";

// Attributes that show or link a file.
const URL_PROPERTIES = ["src", "poster", "href"];

interface Node {
  type: string;
  properties?: Record<string, unknown>;
  children?: Node[];
}

/**
 * The files in `root` that the deck refers to, as paths from `root` with `/`
 * separators: images, videos and links in the slides, attributes of
 * directives, and the `image` of a slide. The page is at the root, so the
 * deck's relative URLs start there.
 */
export function findDeckFiles(deck: Deck, root: string): string[] {
  const files = new Set<string>();
  const add = (url: unknown) => {
    const file = localFile(url, root);
    if (file !== undefined) files.add(file);
  };
  const visit = (node: Node) => {
    for (const name of URL_PROPERTIES) add(node.properties?.[name]);
    // Such as `::video{src="demo.mp4"}`, for the directive's component.
    const attributes = node.properties?.dataDirectiveAttributes;
    if (typeof attributes === "string") {
      Object.values(JSON.parse(attributes) as object).forEach(add);
    }
    node.children?.forEach(visit);
  };
  for (const slide of deck.slides) {
    add(slide.frontmatter.image);
    visit(compileSlide(slide).tree);
  }
  return [...files];
}

/** The file in `root` that a URL points to, if it is a local file there. */
function localFile(url: unknown, root: string): string | undefined {
  // Not a URL with a scheme, such as `https:` or `data:`, nor one to another
  // host or within the page.
  if (typeof url !== "string" || /^(?:[a-z][\w+.-]*:|\/\/|[#?]|$)/i.test(url)) {
    return undefined;
  }
  let path: string;
  try {
    path = decodeURIComponent(url.replace(/[?#].*/s, ""));
  } catch {
    return undefined;
  }
  // The dev server serves the root at `/`.
  const file = resolve(root, path.replace(/^\/+/, ""));
  const name = relative(root, file);
  if (
    !name ||
    name === ".." ||
    name.startsWith(`..${sep}`) ||
    isAbsolute(name)
  ) {
    return undefined;
  }
  if (!existsSync(file) || !statSync(file).isFile()) return undefined;
  return name.split(sep).join("/");
}
