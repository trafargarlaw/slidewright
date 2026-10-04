import type { Slide } from "@slidewright/core";
import type { Root } from "hast";
import { Component, useMemo, type ReactNode } from "react";
import { SlideContext, type DirectiveComponents } from "./context";
import { resolveLayout, type Layout } from "./layouts";
import { renderSlide } from "./render";

/** A compiled slide, or the error a plugin threw while compiling it. */
export interface CompiledEntry {
  tree: Root;
  steps: number;
  error?: unknown;
}

interface RenderedSlideProps {
  slide: Slide;
  entry: CompiledEntry;
  step: number;
  /** Every layout by name, built-in and custom. */
  layouts: Readonly<Record<string, Layout>>;
  components: DirectiveComponents;
  label: string;
}

/**
 * A compiled slide at a step, in its layout. A slide that fails to compile or
 * render shows its error instead.
 */
export function RenderedSlide({
  slide,
  entry,
  step,
  layouts,
  components,
  label,
}: RenderedSlideProps) {
  if (entry.error !== undefined) return <SlideError error={entry.error} />;
  return (
    <SlideErrorBoundary key={slide.index} resetKey={entry.tree}>
      <SlideView
        slide={slide}
        tree={entry.tree}
        step={step}
        layout={resolveLayout(layouts, slide.layout)}
        components={components}
        label={label}
      />
    </SlideErrorBoundary>
  );
}

interface SlideViewProps {
  slide: Slide;
  tree: Root;
  step: number;
  layout: Layout;
  components: DirectiveComponents;
  label: string;
}

export function SlideView({
  slide,
  tree,
  step,
  layout: LayoutComponent,
  components,
  label,
}: SlideViewProps) {
  const content = useMemo(
    () => renderSlide(tree, step, LayoutComponent.slots ?? []),
    [tree, step, LayoutComponent],
  );
  const context = useMemo(() => ({ step, components }), [step, components]);

  return (
    <section
      data-slide=""
      data-layout={slide.layout}
      className={toClassName(slide.frontmatter.class)}
      aria-roledescription="slide"
      aria-label={label}
    >
      <SlideContext value={context}>
        <LayoutComponent slide={slide} slots={content.slots}>
          {content.children}
        </LayoutComponent>
      </SlideContext>
    </section>
  );
}

/** Shown in place of a slide that failed to compile or render. */
export function SlideError({ error }: { error: unknown }) {
  return (
    <section data-slide="" data-slide-error="" role="alert">
      <p>This slide could not be rendered.</p>
      <pre>{error instanceof Error ? error.message : String(error)}</pre>
    </section>
  );
}

interface BoundaryProps {
  /** Clears the error when it changes, e.g. after the slide is edited. */
  resetKey: unknown;
  /** Shown instead of the error message. */
  fallback?: ReactNode;
  children: ReactNode;
}

/** Keeps a broken slide or component from taking down the host app. */
export class SlideErrorBoundary extends Component<
  BoundaryProps,
  { error: unknown; failed: boolean }
> {
  override state = { error: undefined as unknown, failed: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true };
  }

  override componentDidUpdate(previous: BoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: undefined, failed: false });
    }
  }

  override render() {
    if (this.state.failed) {
      return this.props.fallback ?? <SlideError error={this.state.error} />;
    }
    return this.props.children;
  }
}

function toClassName(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (Array.isArray(value)) {
    const names = value.filter((name) => typeof name === "string");
    return names.length > 0 ? names.join(" ") : undefined;
  }
  return undefined;
}
