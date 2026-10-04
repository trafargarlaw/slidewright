# Slidewright docs

The documentation site, built with [Starlight](https://starlight.astro.build).

```sh
# From the repository root:
bun run docs                              # http://localhost:4321
bun run --filter @slidewright/docs build  # a static site in dist/
```

- `src/content/docs/` holds the pages written for the site. The decks on them
  render with `@slidewright/react` from the workspace sources.
- The reference pages and the roadmap are copied from `docs/` and the package
  READMEs by `src/sync.ts` when the site starts or builds. Edit those files,
  not the copies. The tests check that every link between pages lands on a
  page and heading that exist.
- `satteri` is a direct dependency so the build can load its native binding:
  Starlight uses it, and without the direct dependency Vite bundles it into
  the build, where the binding can't be found.
