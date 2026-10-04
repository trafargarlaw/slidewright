# Slidewright docs

The documentation site, built with [Fumadocs](https://fumadocs.dev) on Next.js
and exported as a static site.

```sh
# From the repository root:
bun run docs                              # http://localhost:4321
bun run --filter @slidewright/docs build  # a static site in out/
bun run --filter @slidewright/docs start  # serves out/
```

- `content/docs/` holds the pages written for the site, under `/docs`. The
  `meta.json` files set their order in the sidebar. The home page is
  `app/(home)/page.tsx`.
- The decks on the pages render with `@slidewright/react` from the workspace
  sources. `components/examples.tsx` reads the example decks from the
  repository when a page renders.
- The reference pages and the roadmap are copied from `docs/` and the package
  READMEs by `lib/sync.ts` when the site starts or builds. Edit those files,
  not the copies. The tests check that every link between pages lands on a
  page and heading that exist.
- The site name and links are in `lib/layout.shared.tsx`, and the repository
  for the "Open in GitHub" links is in `lib/shared.ts`.
