// Checks the packages as npm users get them: packs them, starts a deck with
// the packed template, installs it with npm and runs it. The workspace tests
// run on the sources, so they miss what only the packed files can break.
//
// Run before a release: bun run smoke-test
// Needs npm and a network connection for the packages' dependencies.
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";

const PACKAGES = ["core", "react", "vite", "cli", "create"];
const repository = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "slidewright-smoke-"));
const tarballs = join(work, "tarballs");
// Glob characters in the path, as Vite reads some paths as glob patterns.
const deck = join(work, "deck [draft]");
// The installed command's script, run with node. On Windows, the command in
// node_modules/.bin is a wrapper: stopping it leaves the dev server running.
// `npm run build` checks the command itself.
const slidewright = join(
  deck,
  "node_modules",
  "@slidewright",
  "cli",
  "bin",
  "slidewright.js",
);

function run(command: string, args: string[], cwd: string): string {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`,
    );
  }
  return result.stdout;
}

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

const tarball = (name: string) => {
  const { version } = JSON.parse(
    readFileSync(join(repository, "packages", name, "package.json"), "utf8"),
  ) as { version: string };
  return join(tarballs, `slidewright-${name}-${version}.tgz`);
};

/** Starts the dev server and checks the page script it serves. */
async function checkDevServer(): Promise<void> {
  const server = spawn("node", [slidewright, "--port", "0"], { cwd: deck });
  try {
    const url = await new Promise<string>((found, failed) => {
      let output = "";
      setTimeout(
        () => failed(new Error(`Dev server didn't start in 60s:\n${output}`)),
        60_000,
      ).unref();
      server.stdout.on("data", (data: Buffer) => {
        output += data.toString();
        // On Windows, Vite colours the URL in a pipe too.
        const match = /https?:\/\/localhost:\d+\//.exec(
          stripVTControlCharacters(output),
        );
        if (match) found(match[0]);
      });
      server.stderr.on("data", (data: Buffer) => (output += data.toString()));
      server.on("exit", () =>
        failed(new Error(`Dev server exited:\n${output}`)),
      );
    });

    const get = async (path: string) =>
      (await fetch(url + path, { signal: AbortSignal.timeout(60_000) })).text();

    const page = await get("");
    check(page.includes("/@slidewright/app"), "the dev server serves the page");

    // React is CommonJS: the browser can only load it once Vite has
    // pre-bundled it, which needs Vite's scan to find the page script.
    const script = await get("@slidewright/app");
    check(
      /\.vite\/deps\/react-dom_client\.js/.test(script) &&
        /\.vite\/deps\/@slidewright_react\.js/.test(script),
      "the page script imports pre-bundled dependencies",
    );
  } finally {
    server.kill();
  }
}

try {
  for (const name of PACKAGES) {
    run(
      "bun",
      ["pm", "pack", "--quiet", "--destination", tarballs],
      join(repository, "packages", name),
    );
  }
  check(
    PACKAGES.every((name) => existsSync(tarball(name))),
    "packed",
  );

  run(
    "npm",
    [
      "exec",
      "--yes",
      `--package=${tarball("create")}`,
      "--",
      "create-slidewright",
      "deck [draft]",
    ],
    work,
  );
  check(existsSync(join(deck, "slides.md")), "the template makes a deck");

  // Install the packed packages, as npm would install them from the registry.
  const manifestFile = join(deck, "package.json");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as {
    devDependencies: Record<string, string>;
    overrides?: Record<string, string>;
  };
  manifest.devDependencies["@slidewright/cli"] = `file:${tarball("cli")}`;
  manifest.overrides = Object.fromEntries(
    PACKAGES.filter((name) => name !== "create").map((name) => [
      `@slidewright/${name}`,
      `file:${tarball(name)}`,
    ]),
  );
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  run("npm", ["install", "--no-audit", "--no-fund"], deck);
  check(true, "npm installs the deck");

  run("npm", ["run", "build"], deck);
  check(existsSync(join(deck, "dist", "index.html")), "the deck builds");

  await checkDevServer();

  const exported = spawnSync("node", [slidewright, "export"], {
    cwd: deck,
    encoding: "utf8",
  });
  check(
    exported.status === 1 &&
      exported.stderr.includes("npm install --save-dev playwright-chromium"),
    "export without Playwright says how to install it",
  );

  rmSync(work, { recursive: true, force: true });
  console.log("Smoke test passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(`Files kept in ${work}`);
  process.exitCode = 1;
}
