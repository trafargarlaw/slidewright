---
status: accepted
---

# A theme is CSS

`theme` in the headmatter has always gone to the `data-theme` attribute of
the deck, but no CSS used it. To change the look of a deck, you set the
`--deck-*` custom properties in your own CSS. Now `theme: name` selects the
CSS rules for `[data-deck][data-theme="name"]`. `styles.css` has four
built-in themes in the `slidewright` cascade layer: `paper`, `frost`,
`contrast` and `vivid`. A theme of your own is CSS of the same form.

## Why CSS

**The deck already reads its look from CSS.** The layouts, the code
colours, the Mermaid diagrams and the KaTeX maths read the `--deck-*`
properties. A theme only gives them other values, and styles some layouts
with selectors.

**CSS goes to every place that shows the deck.** The presenter window
copies the stylesheets of the page. Print and export render the same
stylesheets. The attribute is on the roots of `<Deck>`, `<Presenter>` and
`<PrintDeck>`, so a theme applies in each of them with no more code.

**Your CSS wins.** Your rules are not in the `slidewright` layer, so a rule
on `[data-deck]` changes one property of a built-in theme. The theme keeps
its other properties.

## The rules of a theme

A built-in theme obeys these rules. A test of `@slidewright/react` checks
the first three.

1. It sets every colour of the default theme, with `light-dark()`. So it
   has light and dark colours, and no colour comes from another theme.
2. Text has a contrast of 4.5:1 or more on the background and on the
   surface, and the main text has 7:1 or more. The code colours are text.
   In `contrast`, all text has 7:1 or more.
3. It doesn't set the size of the text, the line height, the padding or
   the motion. So a deck that fits with one theme fits with all of them,
   and reduced motion still stops the animations.
4. Its fonts are fonts that most computers have, with a list of other fonts
   after them. A deck doesn't download fonts, so it works with no network,
   and export doesn't wait for fonts.
5. It styles layouts only with selectors under
   `[data-deck][data-theme="name"]`.

## Considered options

- **A theme as a JavaScript object, given to `<Deck>` as a prop.**
  Rejected. The presenter window and print would need the object too, and
  the CLI and the Vite plugin would need a way to load it. CSS does this
  already.
- **A theme as a package, such as `theme: @company/theme`, that the Vite
  plugin loads.** Not now. Only the Vite plugin could load it, not a React
  app. A package can still ship a stylesheet with rules for its own name.
- **A warning for a name that has no theme.** Rejected. Only the Vite
  plugin could look for the name, and it doesn't see all the CSS of the
  page. A React app loads CSS in many ways.
- **Web fonts in the themes.** Rejected for the reasons in rule 4.
- **Themes that change the size of the text or the padding.** Rejected. A
  deck that fits with one theme would not fit with another, and you could
  not change themes without checking each slide.

## Consequences

A name with no CSS gives the default theme, with no warning.

Fonts look different on different computers. On a computer that doesn't
have the first font of a theme, the next font of the list shows.

A new built-in theme must pass the test of the rules. The test also checks
the default theme, so its code comments now have more contrast.
