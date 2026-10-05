import type { Root } from "hast";
import type { Schema } from "hast-util-sanitize";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type PluggableList } from "unified";
import { VFile } from "vfile";
import {
  remarkCodeMeta,
  rehypeSafeDirectiveAttributes,
  rehypeSteps,
  remarkDirectiveElements,
} from "./plugins";
import { sanitizeSchema } from "./sanitize";
import type { CompiledSlide, Slide } from "./types";

export interface CompileOptions {
  /**
   * Remove dangerous HTML (scripts, event handlers, iframes, `javascript:`
   * URLs), and the same from the attributes of directives. On by default;
   * pass `false` for decks you trust, or a custom `hast-util-sanitize`
   * schema.
   */
  sanitize?: boolean | Schema;
  /** Extra remark plugins, run after the built-in Markdown extensions. */
  remarkPlugins?: PluggableList;
  /** Extra rehype plugins, run last (after sanitisation). */
  rehypePlugins?: PluggableList;
}

export type SlideCompiler = (slide: Slide | string) => CompiledSlide;

/**
 * Creates a compiler that turns slide Markdown into an HTML syntax tree with
 * steps resolved. Reuse one compiler for a whole deck: building the pipeline
 * is the expensive part.
 */
export function createCompiler(options: CompileOptions = {}): SlideCompiler {
  const { sanitize = true, remarkPlugins = [], rehypePlugins = [] } = options;

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkDirectiveElements)
    .use(remarkCodeMeta)
    .use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSteps);

  if (sanitize !== false) {
    processor
      .use(rehypeSanitize, sanitize === true ? sanitizeSchema : sanitize)
      .use(rehypeSafeDirectiveAttributes);
  }
  processor.use(rehypePlugins).freeze();

  return (slide) => {
    const markdown = typeof slide === "string" ? slide : slide.content;
    const file = new VFile(markdown);
    const tree = processor.runSync(processor.parse(file), file) as Root;

    const override =
      typeof slide === "string" ? undefined : slide.frontmatter.steps;
    const steps =
      typeof override === "number" && Number.isFinite(override) && override >= 0
        ? Math.floor(override)
        : (file.data.steps ?? 0);

    return { tree, steps };
  };
}

let defaultCompiler: SlideCompiler | undefined;

/**
 * Compiles one slide with the default options. A `steps` number in the
 * slide's frontmatter overrides the counted step total.
 */
export function compileSlide(slide: Slide | string): CompiledSlide {
  defaultCompiler ??= createCompiler();
  return defaultCompiler(slide);
}
