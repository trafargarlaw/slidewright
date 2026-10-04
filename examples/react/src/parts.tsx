import type { DirectiveComponents, Layout } from "@slidewright/react";
import type { ReactNode } from "react";

/** `layout: sidebar`: the content, with `:::aside` in a column beside it. */
const Sidebar: Layout = ({ children, slots }) => (
  <>
    <div data-part="main">{children}</div>
    <aside data-part="aside">{slots.aside}</aside>
  </>
);
Sidebar.slots = ["aside"];

/** `:::callout{tone="warning"}`: a note that stands out. */
function Callout({
  tone = "info",
  children,
}: {
  tone?: string;
  children?: ReactNode;
}) {
  return (
    <div className="callout" data-tone={tone}>
      {children}
    </div>
  );
}

export const layouts: Record<string, Layout> = { sidebar: Sidebar };

export const components: DirectiveComponents = { callout: Callout };
