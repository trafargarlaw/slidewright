import GithubSlugger from "github-slugger";
import { codeLines } from "../lib/sync";

/** The lines of `markdown` outside fenced code blocks, without code spans. */
export function prose(markdown: string): string[] {
  const lines = markdown.split("\n");
  const code = codeLines(lines);
  return lines
    .filter((_, index) => !code[index])
    .map((line) => line.replace(/(?<!`)(`+)(?!`).*?(?<!`)\1(?!`)/g, ""));
}

/** The ids that GitHub and the site give to the headings of a page. */
export function anchors(markdown: string): Set<string> {
  const slugger = new GithubSlugger();
  const ids = new Set<string>();
  for (const line of prose(markdown)) {
    const heading = /^#{2,6} (.+)/.exec(line);
    if (heading) {
      const text = heading[1]!.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
      ids.add(slugger.slug(text));
    }
  }
  return ids;
}
