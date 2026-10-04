import type { CompileOptions } from "@slidewright/core";
import rehypeKatex from "rehype-katex";
import { rehypePastedImages } from "./image-registry";

/**
 * Compiler options for the preview. Module-level so the deck keeps one
 * compiler: a new object would rebuild it.
 */
export const compileOptions: CompileOptions = {
  rehypePlugins: [rehypeKatex, rehypePastedImages],
};
