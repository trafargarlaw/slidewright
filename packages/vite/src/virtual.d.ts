declare module "virtual:slidewright/deck" {
  import type { DirectiveComponents } from "@slidewright/react";

  /** The deck source. */
  export const markdown: string;
  /** The components for the deck's directives, by directive name. */
  export const components: DirectiveComponents;
}
