declare module "virtual:slidewright/deck" {
  import type { IconSet, MermaidLoader } from "@slidewright/react";

  /** The deck source. */
  export const markdown: string;
  /** Loads Mermaid, when the project has it. */
  export const mermaid: MermaidLoader | undefined;
  /** The icons that the deck uses, from the project's icon sets. */
  export const icons: readonly IconSet[];
}
