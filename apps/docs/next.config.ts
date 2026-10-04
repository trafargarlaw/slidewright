import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import { join } from "node:path";
import { syncDocs } from "./lib/sync";

// Next runs in the site's folder.
const site = process.cwd();
syncDocs(site, { watch: process.env.NODE_ENV === "development" });

const config: NextConfig = {
  output: "export",
  reactStrictMode: true,
  // No AGENTS.md and CLAUDE.md written into the site's folder.
  agentRules: false,
  turbopack: {
    root: join(site, "..", ".."),
    // The packages' sources, as the `@slidewright/source` condition picks
    // them elsewhere in the repository: no build needed first.
    resolveAlias: {
      "@slidewright/core": "../../packages/core/src/index.ts",
      "@slidewright/react": "../../packages/react/src/index.ts",
      "@slidewright/react/styles.css": "../../packages/react/src/styles.css",
    },
  },
};

export default createMDX()(config);
