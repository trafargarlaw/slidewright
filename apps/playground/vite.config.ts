import {
  defaultClientConditions,
  defaultServerConditions,
  defineConfig,
} from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Resolve workspace packages to their sources, so the playground runs
// without building them first and picks up edits immediately.
const SOURCE_CONDITION = "@react-slides/source";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [tailwindcss(), tanstackStart(), react()],
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
    conditions: [SOURCE_CONDITION, ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: [SOURCE_CONDITION, ...defaultServerConditions],
    },
  },
});
