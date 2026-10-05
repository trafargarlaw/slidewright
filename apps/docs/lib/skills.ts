// The agent skill is installed as a folder, away from this repository, so it
// carries the reference docs with it. Its reference files are copies of the
// repository's Markdown: `bun run skills` writes them, and a test checks that
// they are up to date.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { rewriteLinks } from "./sync";

/** The folder of the skill, from the root of the repository. */
export const SKILL = "skills/slidewright";

/** Repository files in the skill, by file name in its `references` folder. */
export const REFERENCES: Readonly<Record<string, string>> = {
  "syntax.md": "docs/syntax.md",
  "react.md": "packages/react/README.md",
  "vite.md": "packages/vite/README.md",
  "cli.md": "packages/cli/README.md",
};

const NAMES = new Map(
  Object.entries(REFERENCES).map(([name, source]) => [source, name]),
);

/**
 * A repository file as a reference file of the skill: its links point to
 * the other reference files, or to GitHub for other files.
 */
export function toReference(source: string, markdown: string): string {
  // Git checks files out with CRLF line endings on Windows.
  markdown = markdown.replaceAll("\r\n", "\n");
  const note = `<!-- A copy of ${source} in the Slidewright repository, written by \`bun run skills\`. -->`;
  return `${note}\n\n${rewriteLinks(
    markdown,
    source,
    (file) => NAMES.get(file) ?? NAMES.get(posix.join(file, "README.md")),
  )}`;
}

/** Writes the reference files of the skill. Returns the files written. */
export function syncSkill(repository: string): string[] {
  const written: string[] = [];
  for (const [name, source] of Object.entries(REFERENCES)) {
    const file = join(repository, SKILL, "references", name);
    const content = toReference(
      source,
      readFileSync(join(repository, source), "utf8"),
    );
    if (existsSync(file) && readFileSync(file, "utf8") === content) continue;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    written.push(file);
  }
  return written;
}
