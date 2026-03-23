/// <reference types="vite/client" />

declare module "virtual:slides" {
  import type { SlidesData } from "./types";
  const data: SlidesData;
  export default data;
}
