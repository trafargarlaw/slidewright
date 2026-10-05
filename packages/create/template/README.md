# Slides

Made with [Slidewright](https://github.com/trafargarlaw/slidewright).

```sh
npm install
npm run dev     # present on http://localhost:3030
npm run build   # build a static site into dist/
npm run export  # export the deck to slides.pdf
```

Edit `slides.md`: the open deck updates as you save. Put images next to it,
such as in `images/`, and show them with `![Description](images/photo.png)`.
The build copies them into the site.

Export needs Playwright: add `playwright-chromium` to the dev dependencies
first. To put the site online, see
[Deploy](https://github.com/trafargarlaw/slidewright/tree/master/packages/cli#deploy).

Keys: arrows or space to move, `O` for the overview, `F` for fullscreen and
`P` for the presenter view with your notes.
