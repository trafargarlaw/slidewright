import initUnocssRuntime from "@unocss/runtime";
import presetWind3 from "@unocss/preset-wind3";

/**
 * Initialize UnoCSS runtime — watches the DOM for utility classes
 * and generates CSS on the fly. Scoped to .slidev-slides so it
 * only processes slide content, not the editor UI.
 */
export function initUnocss() {
  initUnocssRuntime({
    defaults: {
      presets: [presetWind3()],
    },
    // Only observe the slide rendering area
    rootElement: () =>
      document.querySelector(".slidev-slides") ?? document.body,
  });
}
