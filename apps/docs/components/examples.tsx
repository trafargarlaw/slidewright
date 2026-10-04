// Decks from elsewhere in the repository, read when the page renders. The
// paths are from the repository root.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DemoDeck } from "./demo-deck";
import { LiveEditor } from "./live-editor";
import { PartsEditor } from "./parts-editor";

// Next runs in the site's folder.
const repository = join(process.cwd(), "..", "..");
const read = (file: string) => readFile(join(repository, file), "utf8");

/** The deck in `deck`, with the stylesheet in `css` for it alone. */
export async function ExampleDeck({
  deck,
  css,
}: {
  deck: string;
  css?: string;
}) {
  return (
    <DemoDeck
      markdown={await read(deck)}
      css={css ? await read(css) : undefined}
    />
  );
}

/**
 * A live editor that starts with the deck in `deck`. `parts` adds the layout
 * and the component of the React example.
 */
export async function ExampleEditor({
  deck,
  parts = false,
}: {
  deck: string;
  parts?: boolean;
}) {
  const markdown = await read(deck);
  return parts ? (
    <PartsEditor markdown={markdown} />
  ) : (
    <LiveEditor markdown={markdown} />
  );
}
