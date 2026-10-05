import type { Slide } from "@slidewright/core";
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
export declare const builtinLayouts: Readonly<Record<string, Layout>>;
/** The layout registered under a name, or `default` for unknown names. */
export declare function resolveLayout(layouts: Readonly<Record<string, Layout>>, name: string): Layout;
