# Slidewright docs

The documentation site. It uses [Fumadocs](https://fumadocs.dev) on Next.js,
and exports to a static site.

Run these commands at the root of the repository.

To start the site at http://localhost:4321, run this command:

```sh
bun run docs
```

To build the static site into the `out` folder, run this command:

```sh
bun run --filter @slidewright/docs build
```

To serve the `out` folder after a build, run this command:

```sh
bun run --filter @slidewright/docs start
```

## How the site works

- `content/docs/` has the pages written for the site, under `/docs`. The
  `meta.json` files set their sequence in the sidebar. The home page is
  `app/(home)/page.tsx`.
- The `icon` in the frontmatter of a page is the name of a
  [Lucide](https://lucide.dev/icons) icon. The sidebar shows it.
- The decks on the pages render with `@slidewright/react`, from the sources
  of the workspace. `components/examples.tsx` reads the example decks from
  the repository when a page renders. It also joins decks in several files,
  and gives each deck only the icons that it uses.
- `lib/sync.ts` copies the reference pages and the roadmap from `docs/` and
  the package READMEs, when the site starts or builds. Edit those files, not
  the copies. The copies also get:
  - a Lucide icon, from `ICONS` in `lib/sync.ts`
  - a tab for each package manager on code blocks that have only `npm`
    commands and `cd`.
- The tests check that each link between pages goes to a page and a
  heading that exist. They also check that each page has a Lucide icon.
- `lib/layout.shared.tsx` has the name of the site, its logo and its links.
  `lib/shared.ts` has the repository for the "Open in GitHub" links.
- `components/logo.tsx` is a copy of `app/icon.svg`. `app/global.css` and
  the OG images in `app/og/` have the accent colour. When you change one of
  these, change the others.

## Writing pages

Write the pages in the style of [CONTRIBUTING.md](../../CONTRIBUTING.md#writing-docs).

- When a page shows an npm command, the reader can also need it for pnpm,
  Yarn or Bun. In a page of `content/docs/`, write a tab for each package
  manager, with `tab="npm" tab-group="package-manager"` on the first block.
  The copied pages get these tabs automatically.
- Put commands that a reader runs one after the other in one code block.
  Put commands that a reader chooses between in separate code blocks.
