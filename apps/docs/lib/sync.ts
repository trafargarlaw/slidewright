// The reference pages are the repository's own Markdown: the syntax spec and
// the package READMEs. next.config.ts copies them into the site before each
// build, so GitHub, npm and the site show the same text.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  watchFile,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix } from "node:path";

export const REPOSITORY = "https://github.com/trafargarlaw/react-slides";

/** Repository files shown as pages, by route under /docs. */
export const PAGES: Readonly<Record<string, string>> = {
  "reference/syntax": "docs/syntax.md",
  "reference/core": "packages/core/README.md",
  "reference/react": "packages/react/README.md",
  "reference/vite": "packages/vite/README.md",
  "reference/cli": "packages/cli/README.md",
  "reference/create": "packages/create/README.md",
  roadmap: "docs/ROADMAP.md",
};

/** Files the example decks show, copied to the site root as they're served there. */
export const ASSETS: readonly string[] = ["examples/layouts/public/hills.svg"];

const ROUTES = new Map(
  Object.entries(PAGES).map(([route, source]) => [source, route]),
);

/**
 * A repository file as a page: its first heading becomes the title, and its
 * links point to pages of the site, or to GitHub for other files.
 */
export function toPage(
  source: string,
  markdown: string,
  description?: string,
): string {
  const heading = /^# (.+)\n+/.exec(markdown);
  if (!heading) throw new Error(`${source} doesn't start with a # heading.`);

  const frontmatter = [
    "---",
    `# Generated from ${source}. Edit that file instead.`,
    `title: ${JSON.stringify(heading[1])}`,
    ...(description ? [`description: ${JSON.stringify(description)}`] : []),
    "---",
  ];
  return `${frontmatter.join("\n")}\n\n${rewriteLinks(
    markdown.slice(heading[0].length),
    source,
  )}`;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
// Code spans, or links and images. A code span ends at the first run of as
// many backticks as it starts with. Link text may hold one level of brackets.
const SPAN_OR_LINK =
  /(?<!`)(`+)(?!`).*?(?<!`)\1(?!`)|(!?)\[((?:[^[\]]|\[[^\]]*\])*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g;

/** For each line, whether it's in a fenced code block, fences included. */
export function codeLines(lines: readonly string[]): boolean[] {
  let fence: string | undefined;
  return lines.map((line) => {
    const [, marker, rest = ""] = FENCE.exec(line) ?? [];
    if (!fence) {
      fence = marker;
      return marker !== undefined;
    }
    // A closing fence is at least as long as the opening one, and bare.
    if (
      marker?.[0] === fence[0] &&
      marker.length >= fence.length &&
      !rest.trim()
    ) {
      fence = undefined;
    }
    return true;
  });
}

/** Rewrites the relative links of `markdown`, a file at `source`. */
export function rewriteLinks(markdown: string, source: string): string {
  const lines = markdown.split("\n");
  const code = codeLines(lines);
  return lines
    .map((line, index) =>
      code[index]
        ? line
        : line.replace(
            SPAN_OR_LINK,
            (
              match,
              span,
              image: string,
              text: string,
              url: string,
              title = "",
            ) =>
              span
                ? match
                : `${image}[${text}](${resolveLink(url, source, image === "!")}${title})`,
          ),
    )
    .join("\n");
}

function resolveLink(url: string, source: string, image: boolean): string {
  // Absolute URLs, site paths and anchors on the same page stay as written.
  if (/^([a-z][a-z\d+.-]*:|\/|#)/i.test(url)) return url;

  const [path = "", hash] = url.split("#");
  const file = posix.join(posix.dirname(source), path);
  const route = ROUTES.get(file) ?? ROUTES.get(posix.join(file, "README.md"));
  if (route) return `/docs/${route}${hash ? `#${hash}` : ""}`;
  return `${REPOSITORY}/blob/master/${file}${image ? "?raw=true" : ""}${hash ? `#${hash}` : ""}`;
}

/** Writes the pages and assets into the site. Returns the files read. */
export function sync(repository: string, site: string): string[] {
  const read: string[] = [];
  for (const [route, source] of Object.entries(PAGES)) {
    const file = join(repository, source);
    const manifest = join(dirname(file), "package.json");
    const description = existsSync(manifest)
      ? (JSON.parse(readFileSync(manifest, "utf8")) as { description?: string })
          .description
      : undefined;
    write(
      join(site, "content", "docs", `${route}.md`),
      toPage(source, readFileSync(file, "utf8"), description),
    );
    read.push(file);
  }
  for (const asset of ASSETS) {
    const file = join(repository, asset);
    write(join(site, "public", posix.basename(asset)), readFileSync(file));
    read.push(file);
  }
  return read;
}

// Unchanged files keep their time stamps, so the dev server doesn't reload.
function write(file: string, content: string | Buffer): void {
  if (existsSync(file) && readFileSync(file).equals(Buffer.from(content))) {
    return;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Syncs the pages, and with `watch`, syncs them again when a source changes. */
export function syncDocs(site: string, { watch = false } = {}): void {
  const repository = join(site, "..", "..");
  const files = sync(repository, site);
  if (!watch) return;
  // Polled, as editors that save by replacing a file end a file watch.
  for (const file of files) {
    watchFile(file, { persistent: false, interval: 500 }, () =>
      sync(repository, site),
    );
  }
}
