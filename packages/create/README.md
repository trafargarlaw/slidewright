# @slidewright/create

Starts a Markdown deck project.

```sh
npm create @slidewright my-talk
# or: pnpm create @slidewright, yarn create @slidewright, bun create @slidewright
```

Without a folder name, the command asks for one in a terminal, and uses
`my-talk` elsewhere. The folder must be empty or not exist yet. It gets:

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

Requires Node.js 20.19, or 22.12 and later.

See [`@slidewright/cli`](../cli/README.md) for the commands and the
[deck syntax reference](../../docs/syntax.md) for the deck format.
