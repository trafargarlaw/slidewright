# Contributing

Thanks for your interest in improving Slidewright! This guide covers how
to set up the repo and what we expect from a pull request.

## Setup

You need [Bun](https://bun.sh) 1.3 or newer.

```sh
git clone <repo-url>
cd react-slides
bun install
bun run dev
```

## Workspace

This is a Bun workspace monorepo:

- `packages/*` — libraries that will be published to npm.
- `apps/playground` — the browser editor, used as a demo and a test bed.

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

## Reporting bugs and requesting features

Use the issue templates. For security issues, follow [SECURITY.md](SECURITY.md)
instead of opening a public issue.

## Code of conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By taking part
you agree to uphold it.
