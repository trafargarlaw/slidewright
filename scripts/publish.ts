// Publishes the packages to npm, dependencies first, and stops at the first
// failure. It skips a package that is already on npm at its version, so the
// command can run again after a failure.
//
// Run after the smoke test: bun run release
// Publishes with bun, which replaces the `workspace:^` ranges with the
// version. npm leaves them in, and nobody can install such a package.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PACKAGES = ["core", "react", "vite", "cli", "create"];
const repository = resolve(import.meta.dirname, "..");

async function isPublished(name: string, version: string): Promise<boolean> {
  const response = await fetch(`https://registry.npmjs.org/${name}/${version}`);
  if (response.ok) return true;
  if (response.status === 404) return false;
  throw new Error(`npm answered ${response.status} for ${name}@${version}.`);
}

for (const folder of PACKAGES) {
  const cwd = join(repository, "packages", folder);
  const { name, version } = JSON.parse(
    readFileSync(join(cwd, "package.json"), "utf8"),
  ) as { name: string; version: string };

  if (await isPublished(name, version)) {
    console.log(`${name}@${version} is already on npm.`);
    continue;
  }
  // With the terminal, for the one-time password.
  const result = spawnSync("bun", ["publish"], { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`${name}@${version} was not published.`);
    process.exitCode = 1;
    break;
  }
}
