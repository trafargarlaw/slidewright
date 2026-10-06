# Slides

Made with [Slidewright](https://github.com/trafargarlaw/slidewright).

To install the packages and present the deck at http://localhost:3030, run
these commands:

```sh
npm install
npm run dev
```

Edit `slides.md`. When you save it, the open deck changes. Put images next
to it, for example in `images/`. Show them with
`![Description](images/photo.png)`. The build copies them into the site.

To change the look of the deck, set `theme` at the top of `slides.md` to
`default`, `paper`, `frost`, `contrast` or `vivid`. To change more, add
rules to `style.css`.

| Keys              | Action                                |
| ----------------- | ------------------------------------- |
| Arrows or `Space` | Move through the steps and the slides |
| `O`               | Overview of all the slides            |
| `F`               | Fullscreen                            |
| `P`               | Presenter view, with your notes       |

## Build

To build the deck into a static site in the `dist` folder, run this
command:

```sh
npm run build
```

To put the site online, see
[Deploy](https://github.com/trafargarlaw/slidewright/tree/master/packages/cli#deploy).

## Export

Export needs Playwright. To install it, run this command one time:

```sh
npm install --save-dev playwright-chromium
```

To export the deck to `slides.pdf`, run this command:

```sh
npm run export
```

For PNG images and the other options, see
[Export](https://github.com/trafargarlaw/slidewright/tree/master/packages/cli#export).

## With an AI agent

A skill teaches the deck format to an AI agent, such as Claude Code, Codex
or Cursor. To add the skill to this project, run this command:

```sh
npx skills add trafargarlaw/slidewright
```
