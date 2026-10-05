import { convertPathToPattern } from "tinyglobby";
import { normalizePath } from "vite";

/**
 * A glob pattern that matches `file` and nothing else, for options that read
 * paths as patterns.
 */
export function filePattern(file: string): string {
  // With `/` separators first. On Windows, tinyglobby keeps a backslash
  // before `@` and other glob characters as an escape, so the pattern for
  // `node_modules\@slidewright\vite` matched no file.
  return convertPathToPattern(normalizePath(file));
}
