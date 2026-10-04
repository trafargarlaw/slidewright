import { existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parseArgs, styleText } from "node:util";
import { slidewright } from "@slidewright/vite";
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

The deck is slides.md by default, or slides.md in the given folder.
A style.css next to the deck loads after the default theme.

Options for dev:
  --port <port>   Port to listen on (default 3030)
  --host          Listen on all addresses, to present from another device
  --open          Open the deck in the browser

Options for build:
  --out <dir>     Output folder (default: dist next to the deck)
  --base <path>   Base path of the site (default /). Use ./ to host the
                  site from any folder.

  -h, --help      Show this help
  -v, --version   Show the version`;

const DEFAULT_PORT = 3030;

export type Command =
  | { name: "help" }
  | { name: "version" }
  | { name: "dev"; deck: string; port: number; host: boolean; open: boolean }
  | { name: "build"; deck: string; outDir?: string; base: string };

/** A mistake on the command line, shown without a stack trace. */
export class UsageError extends Error {}

const OPTIONS = {
  port: { type: "string" },
  host: { type: "boolean" },
  open: { type: "boolean" },
  out: { type: "string" },
  base: { type: "string" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const;

const COMMAND_OPTIONS: Record<"dev" | "build", (keyof typeof OPTIONS)[]> = {
  dev: ["port", "host", "open"],
  build: ["out", "base"],
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
  const name = first === "dev" || first === "build" ? first : "dev";
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
    return { name, deck, outDir: values.out, base: values.base ?? "/" };
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
    } else {
      console.error(error);
    }
    return 1;
  }
}

function viteConfig(deck: string): InlineConfig {
  const root = dirname(deck);
  const css = existsSync(join(root, "style.css")) ? "style.css" : undefined;
  return {
    root,
    configFile: false,
    plugins: [slidewright({ deck: basename(deck), css })],
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
