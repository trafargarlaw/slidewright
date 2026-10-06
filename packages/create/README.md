# @slidewright/create

Makes a project for a Markdown deck. To make a project in the `my-talk`
folder, run this command:

```sh
npm create @slidewright my-talk
```

The command also works with pnpm, Yarn and Bun: `pnpm create @slidewright`,
`yarn create @slidewright` and `bun create @slidewright`.

Without a folder name, the command asks for one in a terminal. When there
is no terminal, it uses `my-talk`. The folder must be empty, or not exist.
The command puts these files in it:

```text
my-talk/
├── slides.md      # a starter deck that shows the main features
├── style.css      # theme properties, loaded after the default theme
├── package.json   # dev, build and export scripts with @slidewright/cli
├── README.md      # the commands, for the package manager that you used
└── .gitignore
```

To install the packages and present the deck at http://localhost:3030, run
these commands:

```sh
cd my-talk
npm install
npm run dev
```

To build the deck into a static site in the `dist` folder, run this command
in the project:

```sh
npm run build
```

You need Node.js 20.19 or later in version 20, or Node.js 22.12 or later.

[`@slidewright/cli`](../cli/README.md) tells the commands, and how to export
the deck to PDF. The [deck syntax reference](../../docs/syntax.md) tells the
deck format.
