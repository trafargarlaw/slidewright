import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { slidesPlugin } from "./src/plugin/vite-plugin";
import tailwindcss from '@tailwindcss/vite';
import path from "path";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    slidesPlugin("slides.md"),
    tanstackStart(),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
