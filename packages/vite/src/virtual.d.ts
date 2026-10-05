declare module "virtual:slidewright/deck" {
  import type { DirectiveComponents, MermaidLoader } from "@slidewright/react";

  /** The deck source. */
  export const markdown: string;
  /** The components for the deck's directives, by directive name. */
  export const components: DirectiveComponents;
  /** Loads Mermaid, when the project has it. */
  export const mermaid: MermaidLoader | undefined;
}
