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

export const REPOSITORY = "https://github.com/trafargarlaw/slidewright";

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

/**
 * Descriptions for the pages of files outside a package. A package README's
 * page takes the description in its package.json.
 */
export const DESCRIPTIONS: Readonly<Record<string, string>> = {
  "docs/syntax.md":
    "Everything a deck can hold on top of GitHub Flavored Markdown.",
  "docs/ROADMAP.md": "The direction of the project, and what comes next.",
};

/** The icons of the pages in the sidebar, by route: names of Lucide icons. */
export const ICONS: Readonly<Record<string, string>> = {
  "reference/syntax": "FileText",
  "reference/core": "Cpu",
  "reference/react": "Atom",
  "reference/vite": "Zap",
  "reference/cli": "SquareTerminal",
  "reference/create": "FolderPlus",
  roadmap: "Map",
};

/**
 * Files the example decks show. The decks refer to them with relative paths,
 * so they go next to the example pages.
 */
export const ASSETS: readonly string[] = ["examples/layouts/hills.svg"];

const ROUTES = new Map(
  Object.entries(PAGES).map(([route, source]) => [source, route]),
);

/**
 * A repository file as a page: its first heading becomes the title, its
 * links point to pages of the site, or to GitHub for other files, and its
 * npm commands show in a tab for each package manager.
 */
export function toPage(
  source: string,
  markdown: string,
  { description, icon }: { description?: string; icon?: string } = {},
): string {
  // Git checks files out with CRLF line endings on Windows.
  markdown = markdown.replaceAll("\r\n", "\n");
  const heading = /^# (.+)\n+/.exec(markdown);
  if (!heading) throw new Error(`${source} doesn't start with a # heading.`);

  const frontmatter = [
    "---",
    `# Generated from ${source}. Edit that file instead.`,
    `title: ${JSON.stringify(heading[1])}`,
    ...(description ? [`description: ${JSON.stringify(description)}`] : []),
    ...(icon ? [`icon: ${icon}`] : []),
    "---",
  ];
  return `${frontmatter.join("\n")}\n\n${packageManagerTabs(
    rewriteLinks(markdown.slice(heading[0].length), source),
  )}`;
}

const MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
type Manager = (typeof MANAGERS)[number];

/**
 * A command as each package manager writes it, or `undefined` for a command
 * that isn't `cd` or one of the npm commands below. `npx` stays out: its
 * equivalents depend on whether the package is installed.
 */
export function toManagers(line: string): Record<Manager, string> | undefined {
  const each = (write: (manager: Manager) => string) =>
    Object.fromEntries(
      MANAGERS.map((manager) => [manager, write(manager)]),
    ) as Record<Manager, string>;

  if (/^cd \S+$/.test(line)) return each(() => line);
  const [, command, rest] =
    /^npm (install|create|run)(?: (.+))?$/.exec(line) ?? [];
  if (!command) return undefined;
  if (command !== "install" || !rest) {
    return each((manager) => `${manager} ${command}${rest ? ` ${rest}` : ""}`);
  }
  const [, dev, packages = rest] = /^(--save-dev )?(.+)$/.exec(rest) ?? [];
  if (packages.startsWith("-")) return undefined;
  return {
    npm: line,
    pnpm: `pnpm add ${dev ? "--save-dev " : ""}${packages}`,
    yarn: `yarn add ${dev ? "--dev " : ""}${packages}`,
    bun: `bun add ${dev ? "--dev " : ""}${packages}`,
  };
}

/**
 * Shell code blocks that hold only npm commands, as a tab for each package
 * manager. The site keeps the tab that the reader chose on every page.
 */
export function packageManagerTabs(markdown: string): string {
  const lines = markdown.split("\n");
  const output: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const [, fence = "", info = ""] = FENCE.exec(lines[index]!) ?? [];
    if (!fence) {
      output.push(lines[index]!);
      continue;
    }
    // A closing fence is at least as long as the opening one, and bare.
    let end = index + 1;
    while (end < lines.length) {
      const [, close = "", rest = ""] = FENCE.exec(lines[end]!) ?? [];
      if (
        close[0] === fence[0] &&
        close.length >= fence.length &&
        !rest.trim()
      ) {
        break;
      }
      end++;
    }
    const body = lines.slice(index + 1, end);
    const commands = /^(sh|bash|shell)$/.test(info.trim())
      ? body.map(toManagers)
      : [];
    if (body.length > 0 && commands.every(Boolean) && commands.length > 0) {
      const tabs = MANAGERS.map((manager, tab) =>
        [
          `${fence}sh tab="${manager}"${tab === 0 ? ' tab-group="package-manager"' : ""}`,
          ...commands.map((command) => command![manager]),
          fence,
        ].join("\n"),
      );
      output.push(tabs.join("\n\n"));
    } else {
      output.push(...lines.slice(index, end + 1));
    }
    index = end;
  }
  return output.join("\n");
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

/**
 * Rewrites the relative links of `markdown`, a file at `source`. `local`
 * gives the new address of a repository file that goes along with it: by
 * default, its page on the site. Links to other files go to GitHub.
 */
export function rewriteLinks(
  markdown: string,
  source: string,
  local: (file: string) => string | undefined = toRoute,
): string {
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
                : `${image}[${text}](${resolveLink(url, source, image === "!", local)}${title})`,
          ),
    )
    .join("\n");
}

/** The page of a repository file, or of the README of a folder. */
function toRoute(file: string): string | undefined {
  const route = ROUTES.get(file) ?? ROUTES.get(posix.join(file, "README.md"));
  return route && `/docs/${route}`;
}

function resolveLink(
  url: string,
  source: string,
  image: boolean,
  local: (file: string) => string | undefined,
): string {
  // Absolute URLs, site paths and anchors on the same page stay as written.
  if (/^([a-z][a-z\d+.-]*:|\/|#)/i.test(url)) return url;

  const [path = "", hash] = url.split("#");
  const file = posix.join(posix.dirname(source), path);
  const anchor = hash ? `#${hash}` : "";
  const address = local(file);
  if (address) return `${address}${anchor}`;
  return `${REPOSITORY}/blob/master/${file}${image ? "?raw=true" : ""}${anchor}`;
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
      : DESCRIPTIONS[source];
    write(
      join(site, "content", "docs", `${route}.md`),
      // Checkouts with core.autocrlf have CRLF line endings.
      toPage(source, readFileSync(file, "utf8").replace(/\r\n/g, "\n"), {
        description,
        icon: ICONS[route],
      }),
    );
    read.push(file);
  }
  for (const asset of ASSETS) {
    const file = join(repository, asset);
    write(
      join(site, "public", "docs", "examples", posix.basename(asset)),
      readFileSync(file),
    );
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
