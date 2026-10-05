import type { CompileOptions } from "@slidewright/core";
import { rehypePastedImages } from "./image-registry";

/**
 * Compiler options for the preview. Module-level so the deck keeps one
 * compiler: a new object would rebuild it.
 */
export const compileOptions: CompileOptions = {
  rehypePlugins: [rehypePastedImages],
};

/** Loads Mermaid when the deck has its first diagram. */
export const loadMermaid = () => import("mermaid");
