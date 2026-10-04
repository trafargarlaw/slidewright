# @slidewright/create

Starts a Markdown deck project.

```sh
npm create @slidewright my-talk
# or: pnpm create @slidewright, yarn create @slidewright, bun create @slidewright
```

Without a folder name, the command asks for one (default `my-talk`). The
folder must be empty or not exist yet. It gets:

```text
my-talk/
├── slides.md      # a starter deck that shows the main features
├── style.css      # theme properties, loaded after the default theme
├── package.json   # dev and build scripts with @slidewright/cli
├── README.md
└── .gitignore
```

Then install and present:

```sh
cd my-talk
npm install
npm run dev     # present on http://localhost:3030
npm run build   # build a static site into dist/
```

See [`@slidewright/cli`](../cli/README.md) for the commands and
[docs/syntax.md](../../docs/syntax.md) for the deck format.
