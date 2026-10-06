import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

const HELP = `Usage: npm create @slidewright [folder]

Creates a deck project in the folder (default: my-talk).`;

const DEFAULT_FOLDER = "my-talk";
const TEMPLATE = new URL("../template", import.meta.url);

/** A mistake on the command line, shown without a stack trace. */
export class UsageError extends Error {}

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/** The command that adds a dev dependency, for each package manager. */
const ADD_DEV: Record<PackageManager, string> = {
  npm: "npm install --save-dev",
  pnpm: "pnpm add --save-dev",
  yarn: "yarn add --dev",
  bun: "bun add --dev",
};

/**
 * Creates a deck project in `folder`: the template, and a package.json that
 * depends on `@slidewright/cli` at `version`.
 */
export function create(
  folder: string,
  {
    version,
    packageManager,
  }: { version: string; packageManager: PackageManager },
): void {
  if (existsSync(folder) && readdirSync(folder).length > 0) {
    throw new UsageError(`${folder} already exists and is not empty.`);
  }

  cpSync(TEMPLATE, folder, { recursive: true });
  // npm leaves .gitignore files out of packages.
  renameSync(join(folder, "_gitignore"), join(folder, ".gitignore"));

  const readme = join(folder, "README.md");
  writeFileSync(
    readme,
    readFileSync(readme, "utf8")
      .replaceAll("npm install --save-dev", ADD_DEV[packageManager])
      .replaceAll("npm install", `${packageManager} install`)
      .replaceAll("npm run", `${packageManager} run`),
  );

  const manifest = {
    name: packageName(basename(resolve(folder))),
    private: true,
    type: "module",
    scripts: {
      dev: "slidewright",
      build: "slidewright build",
      export: "slidewright export",
    },
    devDependencies: {
      "@slidewright/cli": `^${version}`,
    },
  };
  writeFileSync(
    join(folder, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

/** The `create-slidewright` command. Resolves with the exit code. */
export async function main(args: string[]): Promise<number> {
  try {
    const { values, positionals } = parseCommandLine(args);
    if (values.help) {
      console.log(HELP);
      return 0;
    }
    if (positionals.length > 1) {
      throw new UsageError(
        `Expected one folder, got ${positionals.join(", ")}.`,
      );
    }

    const folder = positionals[0] ?? (await askFolder());
    const packageManager = detectPackageManager(
      process.env.npm_config_user_agent,
    );
    create(folder, { version: version(), packageManager });

    const path = relative(process.cwd(), resolve(folder));
    console.log(`
Created a deck in ${path || "."}. Next:

${path ? `  cd ${shellQuote(path)}\n` : ""}  ${packageManager} install
  ${packageManager} run dev
`);
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    return 1;
  }
}

/** The package manager that runs this command, from its user agent. */
export function detectPackageManager(
  userAgent: string | undefined,
): PackageManager {
  const name = userAgent?.split("/")[0];
  return name === "pnpm" || name === "yarn" || name === "bun" ? name : "npm";
}

/** A valid npm package name made from a folder name. */
export function packageName(folder: string): string {
  const name = folder
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, "-")
    .replace(/^[._-]+|-+$/g, "");
  return name || "slides";
}

/** Quotes a path for a shell when it contains special characters. */
function shellQuote(path: string): string {
  return /^[\w./-]+$/.test(path) ? path : `'${path.replaceAll("'", "'\\''")}'`;
}

function parseCommandLine(args: string[]) {
  try {
    return parseArgs({
      args,
      allowPositionals: true,
      options: { help: { type: "boolean", short: "h" } },
    });
  } catch (error) {
    throw new UsageError((error as Error).message);
  }
}

async function askFolder(): Promise<string> {
  if (!process.stdin.isTTY) return DEFAULT_FOLDER;
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await readline.question(`Folder (${DEFAULT_FOLDER}): `);
    return answer.trim() || DEFAULT_FOLDER;
  } finally {
    readline.close();
  }
}

function version(): string {
  const require = createRequire(import.meta.url);
  return (require("../package.json") as { version: string }).version;
}
