import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { parseArgs, styleText } from "node:util";
import { slidewright } from "@slidewright/vite";
import type { BrowserType } from "playwright-core";
import {
  build,
  createServer,
  mergeConfig,
  type InlineConfig,
  type ViteDevServer,
} from "vite";

const HELP = `Usage: slidewright [command] [deck] [options]

Commands:
  dev [deck]      Present the deck. Saved edits show at once. (default)
  build [deck]    Build the deck into a static site.
  export [deck]   Export the deck to PDF or PNG files. Needs Playwright.

The deck is slides.md by default, or slides.md in the given folder.
A style.css next to the deck loads after the default theme.
A components.tsx (or .jsx, .ts, .js) next to the deck gives the React
components for the deck's directives.

Options for dev:
  --port <port>   Port to listen on (default 3030)
  --host          Listen on all addresses, to present from another device
  --open          Open the deck in the browser

Options for build:
  --out <dir>     Output folder (default: dist next to the deck)
  --base <path>   Base path of the site (default ./, so the site works
                  from any folder)

Options for export:
  --format <fmt>  pdf (default) or png
  --out <path>    Output file or folder (default: slides.pdf or slides-png
                  next to the deck, named after it)
  --steps         One page per step, not per slide

  -h, --help      Show this help
  -v, --version   Show the version`;

const DEFAULT_PORT = 3030;

// The first of these next to the deck holds its components.
const COMPONENTS_FILES = ["tsx", "jsx", "ts", "js"].map(
  (extension) => `components.${extension}`,
);

export type Command =
  | { name: "help" }
  | { name: "version" }
  | { name: "dev"; deck: string; port: number; host: boolean; open: boolean }
  | { name: "build"; deck: string; outDir?: string; base?: string }
  | {
      name: "export";
      deck: string;
      format: ExportFormat;
      out?: string;
      steps: boolean;
      /** How long the deck may take to load, in ms. Default 30 s. */
      timeout?: number;
    };

export type ExportFormat = "pdf" | "png";

const COMMANDS = ["dev", "build", "export"] as const;

/** A problem shown without a stack trace. */
export class CliError extends Error {}

/** A mistake on the command line, shown with a pointer to the help. */
export class UsageError extends CliError {}

const OPTIONS = {
  port: { type: "string" },
  host: { type: "boolean" },
  open: { type: "boolean" },
  out: { type: "string" },
  base: { type: "string" },
  format: { type: "string" },
  steps: { type: "boolean" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const;

const COMMAND_OPTIONS: Record<
  (typeof COMMANDS)[number],
  (keyof typeof OPTIONS)[]
> = {
  dev: ["port", "host", "open"],
  build: ["out", "base"],
  export: ["format", "out", "steps"],
};

/** Reads the command line. Paths stay relative to the working directory. */
export function parse(args: string[]): Command {
  let parsed;
  try {
    parsed = parseArgs({ args, options: OPTIONS, allowPositionals: true });
  } catch (error) {
    throw new UsageError((error as Error).message);
  }
  const { values, positionals } = parsed;

  if (values.help) return { name: "help" };
  if (values.version) return { name: "version" };

  // `slidewright talk.md` presents the deck.
  const [first] = positionals;
  const name = COMMANDS.find((command) => command === first) ?? "dev";
  const rest = first === name ? positionals.slice(1) : positionals;
  if (first !== undefined && first !== name && !first.endsWith(".md")) {
    throw new UsageError(`Unknown command "${first}".`);
  }
  if (rest.length > 1) {
    throw new UsageError(`Expected one deck, got ${rest.join(", ")}.`);
  }

  for (const option of Object.keys(values) as (keyof typeof OPTIONS)[]) {
    if (!COMMAND_OPTIONS[name].includes(option)) {
      throw new UsageError(`--${option} doesn't apply to ${name}.`);
    }
  }

  const deck = rest[0] ?? "slides.md";
  if (name === "build") {
    return { name, deck, outDir: values.out, base: values.base };
  }
  if (name === "export") {
    const format = values.format ?? "pdf";
    if (format !== "pdf" && format !== "png") {
      throw new UsageError(`--format must be pdf or png, got "${format}".`);
    }
    return {
      name,
      deck,
      format,
      out: values.out,
      steps: values.steps ?? false,
    };
  }

  const port = values.port === undefined ? DEFAULT_PORT : Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new UsageError(`--port must be a port number, got "${values.port}".`);
  }
  return {
    name,
    deck,
    port,
    host: values.host ?? false,
    open: values.open ?? false,
  };
}

/**
 * Runs a command. `config` is merged into the Vite config. Resolves with the
 * running server for `dev`.
 */
export async function run(
  command: Command,
  config: InlineConfig = {},
): Promise<ViteDevServer | undefined> {
  switch (command.name) {
    case "help":
      console.log(HELP);
      return undefined;

    case "version":
      console.log(version());
      return undefined;

    case "dev": {
      const deck = findDeck(command.deck);
      const server = await createServer(
        mergeConfig(
          viteConfig(deck),
          mergeConfig(
            {
              server: {
                port: command.port,
                host: command.host,
                open: command.open,
              },
            },
            config,
          ),
        ),
      );
      await server.listen();
      console.log(
        `\n  ${styleText("bold", "Slidewright")}  ${relative(process.cwd(), deck)}\n`,
      );
      server.printUrls();
      server.bindCLIShortcuts({ print: true });
      return server;
    }

    case "build": {
      const deck = findDeck(command.deck);
      const outDir = resolve(command.outDir ?? join(dirname(deck), "dist"));
      const start = performance.now();
      await build(
        mergeConfig(
          viteConfig(deck),
          mergeConfig(
            { base: command.base, logLevel: "warn", build: { outDir } },
            config,
          ),
        ),
      );
      const seconds = ((performance.now() - start) / 1000).toFixed(1);
      console.log(
        `Built ${relative(process.cwd(), deck)} into ${relative(process.cwd(), outDir) || "."} in ${seconds}s.`,
      );
      return undefined;
    }

    case "export":
      await exportDeck(command, config);
      return undefined;
  }
}

/** The `slidewright` command. Resolves with the exit code. */
export async function main(args: string[]): Promise<number> {
  try {
    await run(parse(args));
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`${error.message}\nRun "slidewright --help" for usage.`);
    } else if (error instanceof CliError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    return 1;
  }
}

/** Opens the deck's print view in Chromium and saves it as PDF or PNG. */
async function exportDeck(
  command: Extract<Command, { name: "export" }>,
  config: InlineConfig,
): Promise<void> {
  const deck = findDeck(command.deck);
  const name = basename(deck, extname(deck));
  const out = resolve(
    command.out ??
      join(
        dirname(deck),
        command.format === "pdf" ? `${name}.pdf` : `${name}-png`,
      ),
  );
  if (existsSync(out)) {
    const folder = statSync(out).isDirectory();
    const path = relative(process.cwd(), out);
    if (command.format === "pdf" && folder) {
      throw new UsageError(
        `${path} is a folder. Give --out a file for the PDF, such as ${join(path, `${name}.pdf`)}.`,
      );
    }
    if (command.format === "png" && !folder) {
      throw new UsageError(
        `${path} is a file. Give --out a folder for the PNG files.`,
      );
    }
  }
  const { chromium, install } = loadChromium([
    join(dirname(deck), "package.json"),
    import.meta.url,
  ]);
  const timeout = command.timeout ?? 30_000;
  const start = performance.now();

  const server = await createServer(
    mergeConfig(
      viteConfig(deck),
      mergeConfig({ logLevel: "warn", server: { port: 0 } }, config),
    ),
  );
  let count: number;
  try {
    await server.listen();
    const url = new URL(server.resolvedUrls!.local[0]!);
    url.search = command.steps ? "print=steps" : "print";
    const browser = await launch(chromium, install);
    try {
      const page = await browser.newPage({
        // Sharp text in images.
        deviceScaleFactor: command.format === "png" ? 2 : 1,
      });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.goto(url.href);
      try {
        // Code is highlighted, images are loaded and fonts are ready.
        await page.waitForFunction(
          () => {
            const root = document.querySelector("[data-deck-print]");
            return (
              root !== null &&
              root.querySelector('[aria-busy="true"]') === null &&
              [...root.querySelectorAll("img")].every(
                (image) => image.complete,
              ) &&
              document.fonts.status === "loaded"
            );
          },
          undefined,
          { timeout },
        );
      } catch (error) {
        if ((error as Error).name !== "TimeoutError") throw error;
        throw new CliError(
          stillLoading(await page.evaluate(loadingState), errors, timeout),
        );
      }

      const pages = page.locator("[data-deck-page]");
      const files = pageFiles(
        await pages.evaluateAll((elements) =>
          elements.map(
            (element) =>
              [
                Number(element.getAttribute("data-page-slide")),
                element.getAttribute("data-page-step"),
              ] as const,
          ),
        ),
      );
      count = files.length;
      if (command.format === "pdf") {
        mkdirSync(dirname(out), { recursive: true });
        await page.pdf({
          path: out,
          printBackground: true,
          preferCSSPageSize: true,
        });
      } else {
        // As printed: pages edge to edge, without the screen preview's
        // shadows and gaps.
        await page.emulateMedia({ media: "print" });
        mkdirSync(out, { recursive: true });
        // Images left from a longer deck would look like part of this one.
        for (const file of readdirSync(out)) {
          if (PNG_FILE.test(file)) rmSync(join(out, file));
        }
        for (const [index, file] of files.entries()) {
          await pages.nth(index).screenshot({ path: join(out, file) });
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }

  const seconds = ((performance.now() - start) / 1000).toFixed(1);
  console.log(
    `Exported ${count} ${count === 1 ? "page" : "pages"} of ${relative(process.cwd(), deck)} to ${relative(process.cwd(), out)} in ${seconds}s.`,
  );
}

const PNG_FILE = /^\d+(-\d+)?\.png$/;

/** Launches Chromium, or explains how to download it. */
async function launch(chromium: BrowserType, install: string) {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!/Executable doesn't exist/.test((error as Error).message)) throw error;
    throw new CliError(
      `Export needs Chromium, which Playwright hasn't downloaded. Download it with:\n  ${install}`,
    );
  }
}

/**
 * What the print view still loads, in the browser: code blocks to highlight,
 * images and fonts. `null` while the print view isn't there. Self-contained,
 * as Playwright runs it in the page.
 */
function loadingState(): {
  code: number;
  images: string[];
  fonts: boolean;
} | null {
  const root = document.querySelector("[data-deck-print]");
  if (root === null) return null;
  return {
    code: root.querySelectorAll('[aria-busy="true"]').length,
    images: [...root.querySelectorAll("img")]
      .filter((image) => !image.complete)
      .map((image) => image.currentSrc || image.src),
    fonts: document.fonts.status !== "loaded",
  };
}

/** Why the deck didn't finish loading in `timeout` ms. */
export function stillLoading(
  state: ReturnType<typeof loadingState>,
  errors: readonly string[],
  timeout: number,
): string {
  const time = `${timeout / 1000} s`;
  if (state === null) {
    return [
      `The deck didn't show in ${time}.`,
      ...(errors.length > 0 ? ["The page reported:", ...indent(errors)] : []),
    ].join("\n");
  }
  const pending = [
    ...(state.code > 0
      ? [
          `${state.code} ${state.code === 1 ? "code block" : "code blocks"} to highlight`,
        ]
      : []),
    ...state.images.map((image) => `the image ${image}`),
    ...(state.fonts ? ["fonts"] : []),
  ];
  return [
    `The deck didn't finish loading in ${time}. Still loading:`,
    ...indent(pending),
  ].join("\n");
}

const indent = (lines: readonly string[]) => lines.map((line) => `  ${line}`);

/**
 * Image names for print pages, given as [slide index, step]: `03.png` for
 * slide 3, `03-2.png` for slide 3 with two steps revealed, as in the URL hash.
 */
export function pageFiles(
  pages: readonly (readonly [number, string | null])[],
): string[] {
  const digits = String((pages.at(-1)?.[0] ?? 0) + 1).length;
  return pages.map(([slide, step]) => {
    const number = String(slide + 1).padStart(digits, "0");
    return step === null ? `${number}.png` : `${number}-${step}.png`;
  });
}

const PLAYWRIGHT = ["playwright-chromium", "playwright", "playwright-core"];

/**
 * Chromium from the first Playwright package found from one of `bases`: the
 * deck's project first, then the CLI's. `install` is the command that
 * downloads its browser.
 */
export function loadChromium(bases: string[]): {
  chromium: BrowserType;
  install: string;
} {
  for (const base of bases) {
    const require = createRequire(base);
    for (const name of PLAYWRIGHT) {
      let path: string;
      try {
        path = require.resolve(name);
      } catch {
        continue;
      }
      return {
        chromium: (require(path) as { chromium: BrowserType }).chromium,
        // `playwright-chromium` has the `playwright` command too.
        install: `npx ${name === "playwright-core" ? name : "playwright"} install chromium`,
      };
    }
  }
  throw new CliError(
    "Export needs Playwright. Install it next to the deck with:\n  npm install --save-dev playwright-chromium",
  );
}

function viteConfig(deck: string): InlineConfig {
  const root = dirname(deck);
  const css = existsSync(join(root, "style.css")) ? "style.css" : undefined;
  const components = COMPONENTS_FILES.find((file) =>
    existsSync(join(root, file)),
  );
  return {
    root,
    configFile: false,
    plugins: [slidewright({ deck: basename(deck), css, components })],
  };
}

/** The absolute path of a deck file, or of slides.md in a folder. */
function findDeck(path: string): string {
  let file = resolve(path);
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, "slides.md");
  }
  if (!existsSync(file)) {
    throw new UsageError(
      `Deck file not found: ${relative(process.cwd(), file)}`,
    );
  }
  return file;
}

function version(): string {
  const require = createRequire(import.meta.url);
  return (require("../package.json") as { version: string }).version;
}
