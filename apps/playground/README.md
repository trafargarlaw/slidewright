# Slidewright playground

A browser editor for decks. Write Markdown on the left, and see the slides
on the right as you type. The playground uses the packages of the
workspace from their sources, so you don't have to build them first.

To start the playground at http://localhost:3000, run this command at the
root of the repository:

```sh
bun run dev
```

The playground starts with a sample deck. It doesn't save the deck: when
you load the page again, the sample deck comes back.

## The editor

The editor has three tabs:

| Tab         | What it has                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| Markdown    | The deck source, with completions for layouts and frontmatter keys.         |
| Script      | The speaker notes of the current slide. A `[step]` line starts the notes of the next step. |
| Cheat Sheet | The [deck syntax reference](../../docs/syntax.md) and the layouts.          |

The preview has two tabs:

| Tab       | What it shows                                                     |
| --------- | ----------------------------------------------------------------- |
| Slides    | The deck, on the slide at the cursor of the editor.               |
| Presenter | The presenter view: the slide, the next step, the notes and a timer. |

The position of the deck is in the URL hash, so you can share a link to a
slide of the sample deck.

The preview draws Mermaid diagrams, maths and the icons of the
[Lucide](https://lucide.dev/icons) set, such as `:lucide:rocket:`. Slides
can also use utility classes, such as `class="flex gap-4"`.

To add an image, paste it in the Markdown tab. The editor adds an
`<img data-paste-id="paste-1" />` element. The image stays only until you
close or load the page again.

## AI features

The playground has two AI features. They use the
[Vercel AI Gateway](https://vercel.com/docs/ai-gateway):

- **AI Edit.** Press `Ctrl`+`K` (`Cmd`+`K` on macOS), or click the box
  "Ask AI to edit your slides". Write an instruction. The model
  (`zai/glm-5`) edits the deck, or only the selected text. To keep the
  change, click **Accept**. To remove it, click **Reject** or press
  `Escape`.
- **Completions.** While you type in the Markdown tab, the editor suggests
  the next part of the deck. The model is `mistral/codestral`.

These features need an AI Gateway API key in the `AI_GATEWAY_API_KEY`
environment variable. Without the key, the editor and the preview work.
But AI Edit shows an error, and the editor gives no completions.

To set the key and start the playground in a POSIX shell, such as Bash or
Zsh, run these commands:

```sh
export AI_GATEWAY_API_KEY=your-key
bun run dev
```

To set the key and start the playground in PowerShell, run these commands:

```powershell
$env:AI_GATEWAY_API_KEY = "your-key"
bun run dev
```

## Scripts

Run these scripts in this folder:

| Script              | What it does                               |
| ------------------- | ------------------------------------------ |
| `bun run dev`       | Starts the playground at http://localhost:3000 |
| `bun run build`     | Builds the playground                      |
| `bun run preview`   | Serves the build                           |
| `bun run typecheck` | Checks the types                           |
| `bun run test`      | Runs the unit tests                        |
