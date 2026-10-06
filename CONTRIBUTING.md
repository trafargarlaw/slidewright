# Contributing

Thanks for your interest in improving Slidewright! This guide tells how to
set up the repository, how to write docs, and what a pull request needs.

## Setup

You need [Bun](https://bun.sh) 1.3 or later. To get the repository and start
the playground, run these commands:

```sh
git clone https://github.com/trafargarlaw/slidewright.git
cd slidewright
bun install
bun run dev
```

## Workspace

This is a Bun workspace monorepo:

- `packages/*`: the libraries, published to npm under `@slidewright`.
- `apps/playground`: the [browser editor](apps/playground), for demos and
  tests.
- `apps/docs`: the [documentation site](apps/docs). Its reference pages are
  copies of `docs/syntax.md`, `docs/ROADMAP.md` and the package READMEs,
  made when the site starts or builds. Edit those files, not the copies.
- `examples`: example decks and a React app. Their tests check that each
  example parses, renders and builds. So when the syntax changes, update
  them.
- `skills/slidewright`: the deck format as a skill for AI agents. Its
  `references` are copies of `docs/syntax.md` and of package READMEs. After
  you change these files, run `bun run skills`. A test fails until you do.
  `SKILL.md` is written by hand. Keep it short, and in step with the
  format.

To run a script in one workspace, use
`bun run --filter <package-name> <script>`.

## Writing docs

The docs use the writing rules of
[ASD-STE100 Simplified Technical English](https://www.asd-ste100.org). Many
readers don't have English as their first language, and some read the docs
through a translator. Short, direct sentences help all of them.

- Use one sentence for one instruction. Write instructions in the
  imperative: "Install the plugin", not "You should install the plugin".
- Keep sentences short: 20 words or fewer in instructions, and 25 words or
  fewer in descriptions.
- Use the active voice: "The plugin prints a warning", not "A warning is
  printed".
- Use one word for one meaning, and the same word each time. A deck has
  slides, a slide has steps, and the CLI presents, builds and exports.
- Don't use idioms or phrasal verbs that a translator can't read, such as
  "spin up" or "under the hood".
- Use "so" in place of "thus" or "therefore", and "can" in place of "may".
- Use lists for three or more items, and tables for reference data.

We don't use the STE dictionary. Technical names, such as frontmatter,
directive or hydration, stay as they are.

### Code blocks

A reader copies a code block in one action. So a code block must hold only
commands that the reader runs together.

- Put commands that the reader runs one after the other in one block, such
  as `cd`, `npm install` and `npm run dev`.
- Put commands that the reader chooses between in separate blocks. Write a
  sentence before each block: "To export each slide to a PNG image, run this
  command:".
- Don't put comments after commands, such as `# present the deck`. A
  comment goes into the terminal with the command. Write the sentence before
  the block.
- Give the commands for npm in the READMEs. The documentation site shows
  them in a tab for each package manager.
- When a command differs between shells, give a block for each shell, such
  as a POSIX shell and PowerShell.

## Before you open a pull request

Run the same checks that CI runs:

```sh
bun run lint
bun run fmt:check
bun run typecheck
bun run test
bun run build
```

Guidelines:

- **One concern in each PR.** Refactors, features and fixes are easier to
  review separately. A large feature can be a stack of smaller PRs.
- **Tests for behaviour changes.** Parser and renderer changes need unit
  tests. A bug fix needs a test that fails without the fix.
- **Docs in the same PR.** When you change the syntax or a public API,
  update the docs with the code.
- **PR titles follow [Conventional Commits](https://www.conventionalcommits.org)**
  (`feat(core): …`, `fix(react): …`, `docs: …`, `chore: …`).

## Releasing

Maintainers release all the packages together, with one version number.

1. Set the version in each `packages/*/package.json`, and in the matching
   entries of `bun.lock`. `bun install` doesn't update them.
2. Run `bun run smoke-test`. It packs the packages, makes a deck from the
   packed template, and installs it with npm. Then it checks that the deck
   builds, that the deck serves, and that export tells how to install
   Playwright. The workspace tests run on the sources, so they don't find
   problems that only the packed files have.
3. Run `bun run release`. It publishes each package with `bun publish`,
   dependencies first, and stops at the first failure. To continue, run it
   again. It skips the packages that are already on npm.

   `bun publish` builds each package first, and replaces `workspace:^` with
   the version. Don't use `npm publish`. It leaves `workspace:^` in the
   package, so nobody can install it. The packages refuse it.

## Reporting bugs and requesting features

Use the issue templates. For security issues, follow
[SECURITY.md](SECURITY.md). Don't open a public issue.

## Code of conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). When you
take part, you agree to obey it.
