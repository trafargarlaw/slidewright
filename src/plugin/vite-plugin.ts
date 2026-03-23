import fs from "fs";
import path from "path";
import type { Plugin } from "vite";

const VIRTUAL_MODULE_ID = "virtual:slides";
const RESOLVED_ID = "\0" + VIRTUAL_MODULE_ID;

export function slidesPlugin(slidesFile = "slides.md"): Plugin {
  let resolvedPath: string;

  return {
    name: "react-slides",

    configResolved(config) {
      resolvedPath = path.resolve(config.root, slidesFile);
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
    },

    async load(id) {
      if (id !== RESOLVED_ID) return;

      const raw = fs.readFileSync(resolvedPath, "utf-8");
      const { parse } = await import("@slidev/parser");
      const parsed = await parse(raw, resolvedPath);

      const slides = parsed.slides.map((s: any) => ({
        index: s.index,
        frontmatter: s.frontmatter || {},
        content: s.content || "",
        note: s.note || "",
        title: s.title || "",
        level: s.level || 0,
      }));

      // headmatter comes from the first slide's frontmatter
      const config = parsed.slides[0]?.frontmatter || {};

      const data = {
        slides,
        raw,
        config,
      };

      return `export default ${JSON.stringify(data)}`;
    },

    configureServer(server) {
      server.watcher.add(resolvedPath);
      server.watcher.on("change", (file) => {
        if (path.resolve(file) === resolvedPath) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
            server.hot.send({ type: "full-reload" });
          }
        }
      });

    },
  };
}
