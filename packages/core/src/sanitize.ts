import { defaultSchema, type Schema } from "hast-util-sanitize";

const defaults = defaultSchema.attributes ?? {};

/**
 * GitHub-style sanitisation, widened for slides: any element may carry
 * `class`, `style` and `data-*` attributes (layouts, utility classes, steps),
 * and media elements are allowed. Scripts, event handlers, iframes and
 * `javascript:` URLs are still removed.
 */
export const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "mark",
    "u",
    "figure",
    "figcaption",
    "video",
    "audio",
    "source",
  ],
  attributes: {
    ...defaults,
    "*": [...(defaults["*"] ?? []), "className", "style", "data*"],
    img: [...(defaults.img ?? []), "width", "height", "loading"],
    video: [
      "src",
      "poster",
      "width",
      "height",
      "controls",
      "autoPlay",
      "loop",
      "muted",
      "playsInline",
      "preload",
    ],
    audio: ["src", "controls", "autoPlay", "loop", "muted", "preload"],
    source: [...(defaults.source ?? []), "src", "type", "media"],
  },
  protocols: {
    ...defaultSchema.protocols,
    poster: ["http", "https"],
  },
};
