// Decks from elsewhere in the repository, read when the page renders. The
// paths are from the repository root.
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { joinDeck, parseDeck } from "@slidewright/core";
import type { IconSet } from "@slidewright/react";
import { createIconSetLoader, pickIcons } from "@repo/packages/vite/src/icons";
import { DemoDeck } from "./demo-deck";
import { LiveEditor } from "./live-editor";
import { PartsEditor } from "./parts-editor";

// Next runs in the site's folder.
const repository = join(process.cwd(), "..", "..");
const read = (file: string) => readFile(join(repository, file), "utf8");

// The icon sets of the examples project.
const loadIconSet = createIconSetLoader(join(repository, "examples"));

/**
 * The deck in `deck`, with the slides of the files that it names, as the
 * CLI reads it. The icons are only those that the deck uses: a set has
 * thousands.
 */
function readDeck(deck: string): { markdown: string; icons?: IconSet[] } {
  const { source } = joinDeck(join(repository, deck), {
    read: (file) => (existsSync(file) ? readFileSync(file, "utf8") : undefined),
    resolve: (src, from) => resolve(dirname(from), src),
  });
  const { sets } = pickIcons(parseDeck(source), source, loadIconSet);
  return { markdown: source, icons: sets.length > 0 ? sets : undefined };
}

/** The deck in `deck`, with the stylesheet in `css` for it alone. */
export async function ExampleDeck({
  deck,
  css,
}: {
  deck: string;
  css?: string;
}) {
  return (
    <DemoDeck {...readDeck(deck)} css={css ? await read(css) : undefined} />
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
