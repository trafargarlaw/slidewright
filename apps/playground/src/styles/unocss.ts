import initUnocssRuntime from "@unocss/runtime";
import presetWind3 from "@unocss/preset-wind3";

let started = false;

/**
 * Starts UnoCSS's runtime, which makes CSS for the utility classes that
 * slides use, such as `text-red-500`. It watches the preview for new
 * classes, and its rules only apply in decks and presenter views: the
 * editor's own UI uses Tailwind. The styles go in the head, where the
 * presenter window copies stylesheets from.
 */
export function initUnocss(preview: Element) {
  // One runtime per page.
  if (started) return;
  started = true;
  void initUnocssRuntime({
    defaults: {
      presets: [
        presetWind3({ important: ":is([data-deck], [data-presenter])" }),
      ],
    },
    observer: { target: () => preview },
    inject: (style) => document.head.append(style),
  });
}
