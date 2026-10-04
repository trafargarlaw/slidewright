import type { ComponentType, ReactNode } from "react";
import { DefaultLayout } from "./Default";
import { CoverLayout } from "./Cover";
import { SectionLayout } from "./Section";
import { CenterLayout } from "./Center";
import { TwoColsLayout } from "./TwoCols";
import { ImageRightLayout } from "./ImageRight";
import { ImageLeftLayout } from "./ImageLeft";
import { CodeLayout } from "./CodeLayout";
import { FullLayout } from "./Full";

export type LayoutComponent = ComponentType<{
  children?: ReactNode;
  markdown?: string;
  image?: string;
}>;

export const layouts: Record<string, LayoutComponent> = {
  default: DefaultLayout as LayoutComponent,
  cover: CoverLayout as LayoutComponent,
  section: SectionLayout as LayoutComponent,
  center: CenterLayout as LayoutComponent,
  "two-cols": TwoColsLayout as LayoutComponent,
  "image-right": ImageRightLayout as LayoutComponent,
  "image-left": ImageLeftLayout as LayoutComponent,
  code: CodeLayout as LayoutComponent,
  full: FullLayout as LayoutComponent,
};
