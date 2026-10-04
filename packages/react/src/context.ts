import { createContext, useContext, type ComponentType } from "react";

/**
 * Components for directives, by directive name. A component receives the
 * directive's attributes as string props and its content as `children`.
 */
export type DirectiveComponents = Record<string, ComponentType<any>>;

interface SlideContextValue {
  /** Current step on the slide being rendered. */
  step: number;
  components: DirectiveComponents;
}

export const SlideContext = createContext<SlideContextValue>({
  step: 0,
  components: {},
});

export function useSlideContext(): SlideContextValue {
  return useContext(SlideContext);
}
