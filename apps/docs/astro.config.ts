import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { defaultClientConditions, defaultServerConditions } from "vite";
import { REPOSITORY, syncDocs } from "./src/sync";

// Resolve workspace packages to their sources, so the site runs without
// building them first and shows the current code.
const SOURCE_CONDITION = "@slidewright/source";

export default defineConfig({
  integrations: [
    syncDocs(),
    starlight({
      title: "Slidewright",
      description: "Write presentations in Markdown, render them with React.",
      social: [{ icon: "github", label: "GitHub", href: REPOSITORY }],
      editLink: { baseUrl: `${REPOSITORY}/edit/master/apps/docs/` },
      customCss: ["./src/styles/docs.css"],
      sidebar: [
        { label: "Start here", items: ["start"] },
        {
          label: "Examples",
          items: [
            "examples/layouts",
            "examples/code",
            "examples/theme",
            "examples/react",
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Deck syntax", slug: "reference/syntax" },
            { label: "slidewright (CLI)", slug: "reference/cli" },
            { label: "@slidewright/react", slug: "reference/react" },
            { label: "@slidewright/vite", slug: "reference/vite" },
            { label: "@slidewright/core", slug: "reference/core" },
            { label: "@slidewright/create", slug: "reference/create" },
          ],
        },
        { label: "Project", items: ["roadmap"] },
      ],
    }),
    react(),
  ],
  vite: {
    resolve: {
      alias: {
        "@repo": fileURLToPath(new URL("../..", import.meta.url)),
      },
      conditions: [SOURCE_CONDITION, ...defaultClientConditions],
    },
    ssr: {
      resolve: {
        conditions: [SOURCE_CONDITION, ...defaultServerConditions],
      },
    },
  },
});
