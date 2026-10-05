import type { Element } from "hast";
import {
  createContext,
  useContext,
  useId,
  useMemo,
  type ComponentProps,
} from "react";

/** Tag that icon elements are renamed to before rendering. */
export const ICON_TAG = "deck-icon";

/** The box of an icon, and how it is turned. */
interface IconShape {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  /** Quarter turns, clockwise. */
  rotate?: number;
  hFlip?: boolean;
  vFlip?: boolean;
}

/**
 * A set of icons in the [Iconify](https://iconify.design) format: the
 * `icons.json` of an `@iconify-json/*` package, or your own icons in the
 * same shape. `:lucide:rocket:` shows the `rocket` of the set with the
 * prefix `lucide`.
 */
export interface IconSet {
  /** The name of the set. */
  prefix: string;
  /** The icons by name. A `body` is the content of the icon's `<svg>`. */
  icons: Readonly<Record<string, IconShape & { body: string }>>;
  /** More names for the icons: each one gives the name it stands for. */
  aliases?: Readonly<Record<string, IconShape & { parent: string }>>;
  /** The box of the icons that don't give their own. Default 16 × 16. */
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

const NO_ICONS: readonly IconSet[] = [];

/** The deck's `icons` prop. */
export const IconsContext = createContext<readonly IconSet[]>(NO_ICONS);

interface Drawing {
  body: string;
  viewBox: string;
  /** Width over height. */
  ratio: number;
}

// An alias can stand for another alias.
const MAX_ALIASES = 5;

/** The icon `set:name`, with what its aliases change, ready to draw. */
function findIcon(sets: readonly IconSet[], id: string): Drawing | undefined {
  const [prefix = "", first = ""] = id.split(":");
  for (const set of sets) {
    if (set.prefix !== prefix) continue;
    let name = first;
    let shape: IconShape = {};
    for (let depth = 0; depth <= MAX_ALIASES; depth++) {
      const icon = Object.hasOwn(set.icons, name) ? set.icons[name] : undefined;
      if (icon) return draw(icon.body, merge(merge(set, icon), shape));
      const alias =
        set.aliases && Object.hasOwn(set.aliases, name)
          ? set.aliases[name]
          : undefined;
      if (!alias) break;
      shape = merge(alias, shape);
      name = alias.parent;
    }
  }
  return undefined;
}

/** `shape`, changed by the alias (or the icon) that stands for it. */
function merge(shape: IconShape, child: IconShape): IconShape {
  return {
    left: child.left ?? shape.left,
    top: child.top ?? shape.top,
    width: child.width ?? shape.width,
    height: child.height ?? shape.height,
    rotate: (shape.rotate ?? 0) + (child.rotate ?? 0),
    hFlip: Boolean(shape.hFlip) !== Boolean(child.hFlip),
    vFlip: Boolean(shape.vFlip) !== Boolean(child.vFlip),
  };
}

function draw(body: string, shape: IconShape): Drawing {
  let { left = 0, top = 0, width = 16, height = 16 } = shape;
  const { hFlip = false, vFlip = false } = shape;
  let turns = (((shape.rotate ?? 0) % 4) + 4) % 4;
  const transforms: string[] = [];

  if (hFlip && vFlip) {
    turns = (turns + 2) % 4;
  } else if (hFlip) {
    transforms.push(`translate(${width + left} ${-top})`, "scale(-1 1)");
    left = top = 0;
  } else if (vFlip) {
    transforms.push(`translate(${-left} ${height + top})`, "scale(1 -1)");
    left = top = 0;
  }

  if (turns === 1) {
    const centre = height / 2 + top;
    transforms.unshift(`rotate(90 ${centre} ${centre})`);
  } else if (turns === 2) {
    transforms.unshift(`rotate(180 ${width / 2 + left} ${height / 2 + top})`);
  } else if (turns === 3) {
    const centre = width / 2 + left;
    transforms.unshift(`rotate(-90 ${centre} ${centre})`);
  }
  if (turns % 2 === 1) {
    [left, top] = [top, left];
    [width, height] = [height, width];
  }

  return {
    body:
      transforms.length > 0
        ? `<g transform="${transforms.join(" ")}">${body}</g>`
        : body,
    viewBox: `${left} ${top} ${width} ${height}`,
    ratio: width / height,
  };
}

/**
 * Gives the ids in an icon's body a suffix. An icon with a gradient or a
 * mask refers to it by id, and the same icon can be on the page many times:
 * in the slide, the overview and the next-slide preview.
 */
function uniqueIds(body: string, suffix: string): string {
  const ids = Array.from(
    body.matchAll(/\sid="([^"]+)"/g),
    (match) => match[1]!,
  );
  if (ids.length === 0) return body;
  const names = ids
    .sort((a, b) => b.length - a.length)
    .map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  // `id="a"`, `url(#a)`, `href="#a"`, and `begin="a.end"` in an animation.
  return body.replace(
    new RegExp(`([#;"])(${names})(?=[")]|\\.[a-z])`, "g"),
    `$1$2-${suffix}`,
  );
}

type IconElementProps = ComponentProps<"span"> & {
  node?: Element;
  "data-icon"?: string;
};

/**
 * Draws a `:set:name:` icon from the deck's icon sets, as tall as the text
 * around it and in its colour. Without the icon, the source text shows. An
 * icon is decoration, hidden from screen readers, unless its element has a
 * `title`: `<span data-icon="lucide:rocket" title="Launch"></span>`.
 */
export function Icon({
  node: _node,
  children,
  "data-icon": name = "",
  title,
  ...rest
}: IconElementProps) {
  const sets = useContext(IconsContext);
  const id = useId().replace(/[^\w-]/g, "");
  const icon = useMemo(() => {
    const found = findIcon(sets, name);
    return found && { ...found, body: uniqueIds(found.body, id) };
  }, [sets, name, id]);

  if (!icon) {
    return (
      <span data-icon={name} title={title} {...rest}>
        {children}
      </span>
    );
  }
  // Sanitising keeps `title` and removes `aria-label`.
  const label = rest["aria-label"] ?? title;
  return (
    <svg
      data-icon={name}
      viewBox={icon.viewBox}
      width={`${Math.round(icon.ratio * 1000) / 1000}em`}
      height="1em"
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      {...(rest as ComponentProps<"svg">)}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}
