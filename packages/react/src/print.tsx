import type { ColorScheme, CompileOptions } from "@slidewright/core";
import type { CSSProperties } from "react";
import type { DirectiveComponents } from "./context";
import { canvasProperties, useCompiledDeck, useLayouts } from "./deck-state";
import type { MermaidLoader } from "./diagram";
import type { IconSet } from "./icon-sets";
import type { Layout } from "./layouts";
import { Resources } from "./resources";
import { RenderedSlide } from "./slide";

export interface PrintDeckProps {
  /** The deck source. */
  markdown: string;
  /**
   * `false` (default): one page per slide, fully revealed. `true`: one page
   * per step, so each reveal gets its own page.
   */
  steps?: boolean;
  /** Extra layouts by name. A layout with a built-in name replaces it. */
  layouts?: Readonly<Record<string, Layout>>;
  /** Components for `:::name` and `::name` directives, by name. */
  components?: DirectiveComponents;
  /**
   * Loads Mermaid, to draw `mermaid` code blocks as diagrams:
   * `() => import("mermaid")`. Without it, they show as code.
   */
  mermaid?: MermaidLoader;
  /**
   * Icon sets for `:set:name:` icons, in the Iconify format: the
   * `icons.json` of `@iconify-json/*` packages. Without its set, an icon
   * shows as its source text.
   */
  icons?: readonly IconSet[];
  /** Sanitising and remark/rehype plugins. Keep the object stable. */
  compileOptions?: CompileOptions;
  /** Overrides `colorScheme` from the headmatter. */
  colorScheme?: ColorScheme;
  className?: string;
  style?: CSSProperties;
}

const NO_COMPONENTS: DirectiveComponents = {};
const NO_ICONS: readonly IconSet[] = [];

/**
 * Renders every slide of a deck at full size, one after the other, for
 * printing and export. Each slide is one printed page, sized to the slide.
 */
export function PrintDeck({
  markdown,
  steps = false,
  layouts,
  components = NO_COMPONENTS,
  mermaid,
  icons = NO_ICONS,
  compileOptions,
  colorScheme,
  className,
  style,
}: PrintDeckProps) {
  const { deck, getSlide } = useCompiledDeck(markdown, compileOptions);
  const allLayouts = useLayouts(layouts);
  const { canvasWidth, aspectRatio, theme, title } = deck.config;
  const count = deck.slides.length;
  // Whole pixels, so pages fall on pixel edges and images of a page don't
  // catch an edge of the next one.
  const pageWidth = Math.round(canvasWidth);
  const pageHeight = Math.round(canvasWidth / aspectRatio);

  const pages = deck.slides.flatMap((slide) => {
    const entry = getSlide(slide.index);
    const last = entry.steps;
    return (steps ? range(last + 1) : [last]).map((step) => ({
      slide,
      entry,
      step,
    }));
  });

  return (
    <Resources mermaid={mermaid} icons={icons}>
      <div
        data-deck=""
        data-deck-print=""
        data-theme={theme}
        data-color-scheme={colorScheme ?? deck.config.colorScheme}
        className={className}
        style={
          {
            ...canvasProperties(deck.config),
            "--deck-page-width": `${pageWidth}px`,
            "--deck-page-height": `${pageHeight}px`,
            ...style,
          } as CSSProperties
        }
        aria-label={title ?? "Slides"}
      >
        <style>{`@page { size: ${pageWidth}px ${pageHeight}px; margin: 0; }`}</style>
        {pages.map(({ slide, entry, step }) => (
          <div
            key={`${slide.index}.${step}`}
            data-deck-page=""
            data-page-slide={slide.index}
            data-page-step={steps ? step : undefined}
          >
            <div data-deck-canvas="" data-measured="">
              <RenderedSlide
                slide={slide}
                entry={entry}
                step={step}
                layouts={allLayouts}
                components={components}
                label={`Slide ${slide.index + 1} of ${count}`}
              />
            </div>
          </div>
        ))}
      </div>
    </Resources>
  );
}

function range(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}
