import type { Slide } from "@react-slides/core";
import type { ComponentType, ReactNode } from "react";

export interface LayoutProps {
  /** The slide being rendered: frontmatter, index, title. */
  slide: Slide;
  /** Slide content that isn't placed in a slot. */
  children?: ReactNode;
  /** Content of the layout's slots, by name. Unfilled slots are missing. */
  slots: Readonly<Partial<Record<string, ReactNode>>>;
}

/**
 * Arranges a slide's content. List the `:::name` blocks the layout places
 * itself in `slots`; every other block stays in `children`.
 *
 * ```tsx
 * function Split({ children, slots }: LayoutProps) {
 *   return <>{children}<aside>{slots.aside}</aside></>;
 * }
 * Split.slots = ["aside"];
 * ```
 */
export type Layout = ComponentType<LayoutProps> & {
  slots?: readonly string[];
};

// Most layouts only differ in CSS, keyed on the slide's `data-layout`.
function Content({ children }: LayoutProps) {
  return <>{children}</>;
}

function TwoCols({ children, slots }: LayoutProps) {
  return (
    <>
      {children}
      <div data-part="columns">
        <div data-part="left">{slots.left}</div>
        <div data-part="right">{slots.right}</div>
      </div>
    </>
  );
}
TwoCols.slots = ["left", "right"] as const;

function ImageSide({ slide, children }: LayoutProps) {
  const { image, imageAlt } = slide.frontmatter;
  return (
    <>
      <div data-part="content">{children}</div>
      <div data-part="image">
        {typeof image === "string" && image ? (
          <img src={image} alt={typeof imageAlt === "string" ? imageAlt : ""} />
        ) : null}
      </div>
    </>
  );
}

export const builtinLayouts: Readonly<Record<string, Layout>> = {
  default: Content,
  center: Content,
  cover: Content,
  section: Content,
  full: Content,
  "two-cols": TwoCols,
  "image-left": ImageSide,
  "image-right": ImageSide,
};
