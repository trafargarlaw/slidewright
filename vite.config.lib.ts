import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "styled-components",
        "shiki",
        "react-markdown",
        "remark-gfm",
        "remark-math",
        "rehype-katex",
        "rehype-raw",
        "unist-util-visit",
        "@monaco-editor/react",
        "monaco-editor",
      ],
    },
    outDir: "dist/lib",
  },
});
