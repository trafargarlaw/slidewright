// Components
export { Deck } from "./components/Deck";
export { Slide, getSlideClicks } from "./components/Slide";
export { SlideContent } from "./components/SlideContent";
export { CodeBlock } from "./components/CodeBlock";
export { Navigation } from "./components/Navigation";
export { Editor } from "./components/Editor";

// Layouts
export { layouts } from "./layouts";
export type { LayoutComponent } from "./layouts";
export { DefaultLayout } from "./layouts/Default";
export { CoverLayout } from "./layouts/Cover";
export { SectionLayout } from "./layouts/Section";
export { CenterLayout } from "./layouts/Center";
export { TwoColsLayout } from "./layouts/TwoCols";
export { ImageRightLayout } from "./layouts/ImageRight";
export { ImageLeftLayout } from "./layouts/ImageLeft";
export { CodeLayout } from "./layouts/CodeLayout";
export { FullLayout } from "./layouts/Full";

// Hooks
export { useNavigation } from "./hooks/useNavigation";
export { useClicks, ClickContext } from "./hooks/useClicks";

// Context
export { ShikiProvider, useShiki } from "./context/ShikiContext";

// Parser
export { parseSlides, getSlideStartLines } from "./parser/parse-slides";
export {
  parseHighlightMeta,
  parseSteps,
  computeCodeClicks,
  computeTotalSlideClicks,
} from "./parser/code-highlight";

// Styles
export { theme } from "./styles/theme";
export type { Theme } from "./styles/theme";
export { GlobalStyle } from "./styles/GlobalStyle";

// Types
export type { SlideInfo, SlidesData, HighlightStep, ClickMap } from "./types";
