import type { ReactNode } from "react";
import { MermaidContext, type MermaidLoader } from "./diagram";
import { IconsContext, type IconSet } from "./icon-sets";

interface ResourcesProps {
  mermaid: MermaidLoader | undefined;
  icons: readonly IconSet[];
  children: ReactNode;
}

/** What slides draw with: Mermaid for diagrams, and the deck's icon sets. */
export function Resources({ mermaid, icons, children }: ResourcesProps) {
  return (
    <MermaidContext value={mermaid}>
      <IconsContext value={icons}>{children}</IconsContext>
    </MermaidContext>
  );
}
