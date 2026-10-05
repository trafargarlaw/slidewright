declare module "virtual:slidewright/deck" {
  import type { MermaidLoader } from "@slidewright/react";

  /** The deck source. */
  export const markdown: string;
  /** Loads Mermaid, when the project has it. */
  export const mermaid: MermaidLoader | undefined;
}
