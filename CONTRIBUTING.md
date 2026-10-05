# Contributing

Thanks for your interest in improving Slidewright! This guide covers how
to set up the repo and what we expect from a pull request.

## Setup

You need [Bun](https://bun.sh) 1.3 or newer.

```sh
git clone https://github.com/trafargarlaw/slidewright.git
cd slidewright
bun install
bun run dev
```

## Workspace

This is a Bun workspace monorepo:

- `packages/*` — the libraries, published to npm under `@slidewright`.
- `apps/playground` — the browser editor, used as a demo and a test bed.
- `apps/docs` — the documentation site. Its reference pages are copied from
  `docs/` and the package READMEs at build time, so edit those files instead.
- `examples` — example decks and a React app. Their tests check that each
  one parses, renders and builds, so update them with syntax changes.

Run a script in one workspace with `bun run --filter <package-name> <script>`.

## Before you open a pull request

Run the same checks CI runs:

```sh
bun run lint
bun run fmt:check
bun run typecheck
bun run test
bun run build
```

Guidelines:

- **One concern per PR.** Refactors, features and fixes are easier to review
  apart. Large features can land as a stack of smaller PRs.
- **Tests for behaviour changes.** Parser and renderer changes need unit
  tests; bug fixes need a test that fails without the fix.
- **Docs in the same PR.** If you change syntax or a public API, update the
  docs alongside the code.
- **PR titles follow [Conventional Commits](https://www.conventionalcommits.org)**
  (`feat(core): …`, `fix(react): …`, `docs: …`, `chore: …`).

## Releasing

Maintainers release every package together, with one version number.

1. Set the version in each `packages/*/package.json`, and in the matching
   entries of `bun.lock`: `bun install` doesn't update them.
2. Run `bun run smoke-test`. It packs the packages, makes a deck from the
   packed template, installs it with npm and checks that the deck builds,
   serves and explains how to export. The workspace tests run on the sources
   and miss problems that only the packed files have.
3. Publish dependencies first:

   ```sh
   for name in core react vite cli create; do
     (cd packages/$name && bun publish) || break
   done
   ```

   `bun publish` builds each package first and replaces `workspace:^` with
   the version.

## Reporting bugs and requesting features

Use the issue templates. For security issues, follow [SECURITY.md](SECURITY.md)
instead of opening a public issue.

## Code of conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By taking part
you agree to uphold it.
