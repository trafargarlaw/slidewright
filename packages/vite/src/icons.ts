import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { compileSlide, type Deck, type Diagnostic } from "@slidewright/core";
import type { IconSet } from "@slidewright/react";

/** Gives the icon set with a prefix, when the project has it. */
export type IconSetLoader = (prefix: string) => IconSet | undefined;

/**
 * Loads icon sets from the `@iconify-json/*` packages installed for the
 * project at `root`. A set is read once; a set that is missing is looked for
 * again, so it can be installed while the server runs.
 */
export function createIconSetLoader(root: string): IconSetLoader {
  const require = createRequire(resolve(root, "index.html"));
  const sets = new Map<string, IconSet>();
  return (prefix) => {
    const loaded = sets.get(prefix);
    if (loaded) return loaded;
    try {
      const file = require.resolve(`@iconify-json/${prefix}/icons.json`);
      const set = JSON.parse(readFileSync(file, "utf8")) as IconSet;
      sets.set(prefix, set);
      return set;
    } catch {
      return undefined;
    }
  };
}

export interface DeckIcons {
  /** The sets that the deck uses, with only the icons that it uses. */
  sets: IconSet[];
  /** A warning for each icon that shows as text. */
  problems: Diagnostic[];
}

interface Node {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
}

// An alias can stand for another alias.
const MAX_ALIASES = 5;

/**
 * Picks the icons of the deck's slides and notes out of the project's icon
 * sets. The page gets these few icons, not the sets, which have thousands.
 */
export function pickIcons(
  deck: Deck,
  source: string,
  load: IconSetLoader,
): DeckIcons {
  const lines = source.split(/\r?\n/);
  const sets = new Map<string, IconSet>();
  const problems: Diagnostic[] = [];

  for (const slide of deck.slides) {
    const ids = new Set<string>();
    const visit = (node: Node) => {
      const id = node.properties?.dataIcon;
      if (node.tagName === "span" && typeof id === "string") ids.add(id);
      node.children?.forEach(visit);
    };
    visit(compileSlide(slide).tree);
    if (slide.notes) visit(compileSlide(slide.notes).tree);

    for (const id of ids) {
      const [prefix = "", name = ""] = id.split(":");
      const set = load(prefix);
      const reason = !set
        ? `the project doesn't have the \`${prefix}\` icons. Add them with \`npm install @iconify-json/${prefix}\`.`
        : !pick(set, name, sets)
          ? `the \`${prefix}\` icons have no \`${name}\`. The names are at https://icon-sets.iconify.design/${prefix}/.`
          : undefined;
      if (reason === undefined) continue;

      // The first line of the slide that has the icon.
      const { start, end } = slide.range;
      let line = start;
      for (let i = start; i <= end; i++) {
        if (lines[i - 1]?.includes(id)) {
          line = i;
          break;
        }
      }
      problems.push({
        severity: "warning",
        message: `The icon \`:${id}:\` shows as text: ${reason}`,
        line,
        slide: slide.index,
      });
    }
  }
  return { sets: [...sets.values()], problems };
}

/**
 * Copies an icon, and the aliases that lead to it, from `set` to the set
 * with its prefix in `picked`. `false` when the set doesn't have the icon.
 */
function pick(
  set: IconSet,
  name: string,
  picked: Map<string, IconSet>,
): boolean {
  const aliases: Record<string, NonNullable<IconSet["aliases"]>[string]> = {};
  let parent = name;
  for (let depth = 0; depth <= MAX_ALIASES; depth++) {
    const icon = Object.hasOwn(set.icons, parent)
      ? set.icons[parent]
      : undefined;
    if (icon) {
      const { prefix, left, top, width, height } = set;
      const target = picked.get(prefix);
      picked.set(prefix, {
        prefix,
        left,
        top,
        width,
        height,
        icons: { ...target?.icons, [parent]: icon },
        aliases: { ...target?.aliases, ...aliases },
      });
      return true;
    }
    const alias =
      set.aliases && Object.hasOwn(set.aliases, parent)
        ? set.aliases[parent]
        : undefined;
    if (!alias) return false;
    aliases[parent] = alias;
    parent = alias.parent;
  }
  return false;
}
