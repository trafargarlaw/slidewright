import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeck } from "@slidewright/core";
import {
  normalizePath,
  searchForWorkspaceRoot,
  type Logger,
  type Plugin,
} from "vite";
import { findDeckFiles } from "./files";
import { createIconSetLoader, pickIcons, type DeckIcons } from "./icons";
import { filePattern } from "./pattern";
import { findProblems, formatProblem } from "./problems";

export interface SlidewrightOptions {
  /** The deck file, relative to the Vite root. Default `slides.md`. */
  deck?: string;
  /**
   * Stylesheets loaded after the default theme, relative to the Vite root.
   * Use them to set theme properties or style slide content.
   */
  css?: string | readonly string[];
}

const APP_URL = "/@slidewright/app";
const DECK_ID = "virtual:slidewright/deck";
const RESOLVED_DECK_ID = `\0${DECK_ID}`;

// The page's script: app.ts next to this file in the sources, and
// client/app.js once built (see tsdown.config.ts).
const APP_FILE = fileURLToPath(
  new URL(
    import.meta.url.endsWith(".ts") ? "app.ts" : "../client/app.js",
    import.meta.url,
  ),
);

/**
 * Serves a Markdown deck as a presentation, and builds it into a static site.
 * The plugin provides the page, so the project needs no `index.html` and no
 * React code. Edits to the deck update the open page in place.
 *
 * ```ts
 * export default defineConfig({
 *   plugins: [slidewright({ deck: "slides.md" })],
 * });
 * ```
 */
export function slidewright(options: SlidewrightOptions = {}): Plugin {
  let root = "";
  let deckFile = "";
  let cssFiles: string[] = [];
  // The project has Mermaid, so the page draws the deck's diagrams.
  let mermaid = false;
  // The icons of the deck as it was last read, from the project's icon sets.
  let loadIconSet = createIconSetLoader(root);
  let picked: { source: string; icons: DeckIcons } | undefined;
  const pickDeckIcons = (source: string) => {
    if (picked?.source !== source) {
      picked = {
        source,
        icons: pickIcons(parseDeck(source), source, loadIconSet),
      };
    }
    return picked.icons;
  };
  // Both with `/` separators, as Vite gives ids to the hooks on Windows too.
  let pageFile = "";
  // The build input. Vite resolves symbolic links in the root, so this can
  // differ from `pageFile`.
  let inputFile = "";
  let logger: Logger | undefined;
  // The problems last printed, so saving without fixing them stays quiet.
  let reported = "";

  // Prints the deck's problems with their file and line. The deck still
  // renders: problems never stop the server or the build.
  const report = () => {
    const source = readFileSync(deckFile, "utf8");
    const text = [
      ...findProblems(parseDeck(source), source, { mermaid }),
      ...pickDeckIcons(source).problems,
    ]
      .sort((a, b) => a.line - b.line)
      .map((problem) => formatProblem(deckFile, problem))
      .join("\n");
    if (text === reported) return;
    reported = text;
    if (text) logger?.warn(text);
  };

  const page = () => {
    const title = parseDeck(readFileSync(deckFile, "utf8")).config.title;
    return pageHtml(title ?? "Slides");
  };

  return {
    name: "slidewright",

    config(config) {
      const root = resolve(config.root ?? process.cwd());
      inputFile = normalizePath(resolve(root, "index.html"));
      mermaid = hasPackage("mermaid", root);
      return {
        // Relative asset URLs, so the built site works from any folder. The
        // deck moves between slides in the URL hash, with no server routes.
        base: config.base ?? "./",
        build: {
          // The compiler and the largest highlighting grammars, which load
          // only when a deck uses them, are over Vite's default of 500 kB.
          chunkSizeWarningLimit: 1024,
          rolldownOptions: {
            input: inputFile,
            onLog(level, log, handler) {
              // `@slidewright/react` starts with "use client" for React
              // Server Components, which a static page doesn't use.
              if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
              handler(level, log);
            },
          },
        },
        // The page is virtual, so the dependency scanner starts from the app.
        // Entries are glob patterns: as a path, the app matches no file on
        // Windows, or in a folder such as `talk [draft]`. Then nothing is
        // pre-bundled, and the browser can't load CommonJS dependencies.
        optimizeDeps: {
          entries: [filePattern(APP_FILE)],
          // The page asks for Mermaid at the first diagram. Known from the
          // start, it doesn't make the page load again then.
          include: mermaid ? ["mermaid"] : [],
        },
        server: {
          fs: {
            // The page's script and its dependencies can live outside the
            // project, as with `npx`.
            allow: [searchForWorkspaceRoot(root), installRoot(APP_FILE)],
          },
        },
      };
    },

    configResolved(config) {
      root = config.root;
      deckFile = resolve(root, options.deck ?? "slides.md");
      cssFiles = [options.css ?? []].flat().map((file) => resolve(root, file));
      pageFile = normalizePath(resolve(root, "index.html"));
      loadIconSet = createIconSetLoader(root);
      logger = config.logger;
    },

    buildStart() {
      if (!existsSync(deckFile)) this.error(`Deck file not found: ${deckFile}`);
      report();
    },

    watchChange(id) {
      if (resolve(id) === deckFile && existsSync(deckFile)) report();
    },

    // The deck renders in the browser, so the bundle doesn't see the files it
    // shows. Copy them, at the paths that the dev server serves them at.
    generateBundle() {
      const deck = parseDeck(readFileSync(deckFile, "utf8"));
      for (const fileName of findDeckFiles(deck, root)) {
        this.emitFile({
          type: "asset",
          fileName,
          source: readFileSync(resolve(root, fileName)),
        });
      }
    },

    resolveId(id) {
      if (id === APP_URL) return APP_FILE;
      if (id === DECK_ID) return RESOLVED_DECK_ID;
      const file = normalizePath(id);
      if (file === pageFile || file === inputFile) return pageFile;
      return undefined;
    },

    load(id) {
      if (normalizePath(id) === pageFile) return page();
      if (id !== RESOLVED_DECK_ID) return undefined;
      const { sets } = pickDeckIcons(readFileSync(deckFile, "utf8"));
      return [
        ...cssFiles.map((file) => `import ${JSON.stringify(file)};`),
        `export { default as markdown } from ${JSON.stringify(`${deckFile}?raw`)};`,
        mermaid
          ? 'export const mermaid = () => import("mermaid");'
          : "export const mermaid = undefined;",
        `export const icons = ${JSON.stringify(sets)};`,
      ].join("\n");
    },

    // The deck module has the deck's icons, so it is made again when the
    // deck changes. Vite can keep a module whose imports changed, and then
    // only the Markdown would be new.
    hotUpdate({ file, modules }) {
      if (resolve(file) !== deckFile) return undefined;
      const deck = this.environment.moduleGraph.getModuleById(RESOLVED_DECK_ID);
      return deck ? [...modules, deck] : undefined;
    },

    configureServer(server) {
      // Runs after Vite's own middleware, but before it looks for an
      // index.html on disk.
      return () => {
        server.middlewares.use(async (req, res, next) => {
          const path = req.url?.split("?")[0];
          if (path !== "/" && path !== "/index.html") return next();
          try {
            const html = await server.transformIndexHtml(req.url!, page());
            res.setHeader("Content-Type", "text/html");
            res.end(html);
          } catch (error) {
            next(error);
          }
        });
      };
    },
  };
}

export default slidewright;

function pageHtml(title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      html, body, #app { height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${APP_URL}"></script>
  </body>
</html>
`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Whether a package is installed for the project at `root`. */
function hasPackage(name: string, root: string): boolean {
  try {
    createRequire(resolve(root, "index.html")).resolve(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Where this package and its dependencies are installed: the outermost
 * `node_modules` above the file, or the repository when run from source.
 */
function installRoot(file: string): string {
  const parts = file.split(sep);
  const index = parts.indexOf("node_modules");
  return index === -1
    ? resolve(dirname(file), "../../..")
    : parts.slice(0, index + 1).join(sep);
}
