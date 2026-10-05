import type {
  Element,
  Root as HastRoot,
  RootContent,
  Text as HastText,
} from "hast";
import type { Root as MdastRoot, Text } from "mdast";
import type { Directives } from "mdast-util-directive";
import { SKIP, visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { formatLineChanges, stripDiffMarkers } from "./diff";
import {
  formatHighlights,
  parseCodeMeta,
  parseHighlightSpec,
} from "./highlights";
import type { HighlightRange } from "./types";

declare module "vfile" {
  interface DataMap {
    steps: number;
  }
}

type HastData = { hName?: string; hProperties?: Record<string, unknown> };

/**
 * Turns block directives (`:::name` and `::name`) into `div` elements tagged
 * with `data-directive`, so renderers can map them to slots, components, or
 * plain styled blocks.
 *
 * Inline directives (`:name`) are not part of the syntax: they collide with
 * ordinary prose like `Note:this`, so they are restored to their source text.
 */
export function remarkDirectiveElements() {
  return (tree: MdastRoot, file: VFile) => {
    const source = String(file);

    visit(tree, (node, index, parent) => {
      if (node.type === "textDirective" && parent && index !== undefined) {
        const { start, end } = node.position ?? {};
        const value =
          start?.offset !== undefined && end?.offset !== undefined
            ? source.slice(start.offset, end.offset)
            : `:${node.name}`;
        parent.children.splice(index, 1, { type: "text", value } as Text);
        return [SKIP, index + 1];
      }

      if (node.type === "containerDirective" || node.type === "leafDirective") {
        const directive = node as Directives;
        const attributes = Object.fromEntries(
          Object.entries(directive.attributes ?? {}).map(([key, value]) => [
            key,
            value ?? "",
          ]),
        );
        const properties: Record<string, unknown> = {
          dataDirective: directive.name,
          dataDirectiveKind:
            node.type === "containerDirective" ? "container" : "leaf",
        };
        // `id` and `class` style the fallback element; components receive
        // every attribute, these two included, through the JSON payload.
        if (attributes.id) properties.id = attributes.id;
        if (attributes.class) {
          properties.className = attributes.class.split(/\s+/).filter(Boolean);
        }
        if (Object.keys(attributes).length > 0) {
          properties.dataDirectiveAttributes = JSON.stringify(attributes);
        }

        const data = (directive.data ??= {}) as HastData;
        data.hName = "div";
        data.hProperties = properties;
      }
      return undefined;
    });
  };
}

// `:set:name:`, as in `:lucide:rocket:`. The set starts with a letter, so a
// time such as `10:30:45:` is not an icon.
const ICON = /:([a-z][a-z0-9]*(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*):/g;
const WORD = /\w/;
// Elements whose text is shown as written.
const LITERAL = new Set([
  "code",
  "pre",
  "kbd",
  "samp",
  "script",
  "style",
  "textarea",
  "svg",
  "math",
]);

/**
 * Turns `:set:name:` in text into `span` elements tagged with `data-icon`
 * (`set:name`, the name of the icon in Iconify). The span keeps the source
 * text, which is what shows when a renderer doesn't have the icon. Code and
 * maths are left as written. Runs on the HTML tree, so that the text of HTML
 * blocks gets icons too.
 */
export function rehypeIcons() {
  return (tree: HastRoot) => {
    const visitChildren = (parent: HastRoot | Element) => {
      const children: RootContent[] = [];
      for (const child of parent.children) {
        const last = children.at(-1);
        if (child.type === "text" && last?.type === "text") {
          // A restored inline directive (`:lucide`) is a text node of its own.
          children[children.length - 1] = {
            type: "text",
            value: last.value + child.value,
          };
        } else {
          children.push(child);
        }
      }
      parent.children = children.flatMap((child): RootContent[] => {
        if (child.type === "text") return splitIcons(child);
        if (
          child.type === "element" &&
          !LITERAL.has(child.tagName) &&
          child.properties.dataIcon === undefined
        ) {
          visitChildren(child);
        }
        return [child];
      }) as typeof parent.children;
    };
    visitChildren(tree);
  };
}

function splitIcons(node: HastText): (HastText | Element)[] {
  const { value } = node;
  const parts: (HastText | Element)[] = [];
  let from = 0;
  for (const match of value.matchAll(ICON)) {
    const end = match.index + match[0].length;
    // Part of a longer text, such as `a:b:c:d`.
    if (WORD.test(value[match.index - 1] ?? "")) continue;
    if (WORD.test(value[end] ?? "")) continue;
    if (match.index > from) {
      parts.push({ type: "text", value: value.slice(from, match.index) });
    }
    parts.push({
      type: "element",
      tagName: "span",
      properties: { dataIcon: `${match[1]}:${match[2]}` },
      children: [{ type: "text", value: match[0] }],
    });
    from = end;
  }
  if (parts.length === 0) return [node];
  if (from < value.length) {
    parts.push({ type: "text", value: value.slice(from) });
  }
  return parts;
}

/**
 * Copies code fence meta (highlights, line numbers, title) onto the `code`
 * element. In a `diff` block, the `+` and `-` markers move from the code to
 * `data-diff`.
 */
export function remarkCodeMeta() {
  return (tree: MdastRoot) => {
    visit(tree, "code", (node) => {
      const meta = parseCodeMeta(node.meta);
      const properties: Record<string, unknown> = {};

      if (node.lang) properties.dataLang = node.lang;
      if (node.meta) properties.dataMeta = node.meta;
      if (meta.highlight) properties.dataHighlightSpec = meta.highlight;
      if (meta.lineNumbers !== undefined) {
        properties.dataLineNumbers = meta.lineNumbers;
      }
      if (meta.title !== undefined) properties.dataTitle = meta.title;
      if (meta.diff) {
        const { code, changes } = stripDiffMarkers(node.value);
        node.value = code;
        properties.dataDiff = formatLineChanges(changes);
      }

      const data = (node.data ??= {}) as HastData;
      data.hProperties = { ...data.hProperties, ...properties };
    });
  };
}

const STEP_MARKER = /^\s*step(?:\s+(\d+))?\s*$/;

/**
 * Assigns steps (reveals) in document order.
 *
 * - `<!-- step -->` hides what follows it, within the same parent element,
 *   until the next step. `<!-- step N -->` uses step `N` instead of the next
 *   one and doesn't move the automatic counter.
 * - Each `|` in a code block's highlight spec (`{1|2|all}`) after the first
 *   range takes one step; `@N` pins a range to step `N`.
 *
 * Revealed elements get `data-step`; loose text is wrapped in a `span`. The
 * slide's step count is stored in `file.data.steps`.
 */
export function rehypeSteps() {
  return (tree: HastRoot, file: VFile) => {
    let counter = 0;
    let highest = 0;

    const visitChildren = (parent: HastRoot | Element, inherited: number) => {
      let segment: number | undefined;
      const children: RootContent[] = [];

      for (const child of parent.children) {
        if (child.type === "comment") {
          const marker = STEP_MARKER.exec(child.value);
          if (marker) {
            if (marker[1] === undefined) {
              segment = ++counter;
            } else {
              segment = Number(marker[1]);
              highest = Math.max(highest, segment);
            }
            continue;
          }
        }

        const step = segment ?? inherited;

        if (child.type === "element") {
          if (segment !== undefined) child.properties.dataStep = segment;
          if (child.tagName === "code") resolveHighlights(child, step);
          visitChildren(child, step);
        } else if (
          child.type === "text" &&
          segment !== undefined &&
          child.value.trim()
        ) {
          children.push({
            type: "element",
            tagName: "span",
            properties: { dataStep: segment },
            children: [child],
          });
          continue;
        }
        children.push(child);
      }

      parent.children = children as typeof parent.children;
    };

    const resolveHighlights = (code: Element, appearsAt: number) => {
      const spec = code.properties.dataHighlightSpec;
      delete code.properties.dataHighlightSpec;
      if (typeof spec !== "string") return;

      const resolved: HighlightRange[] = parseHighlightSpec(spec).map(
        (range, i) => {
          let step: number;
          if (range.step !== undefined) {
            step = range.step;
            highest = Math.max(highest, step);
          } else {
            step = i === 0 ? appearsAt : ++counter;
          }
          return { step, lines: range.lines };
        },
      );
      if (resolved.length > 0) {
        code.properties.dataHighlights = formatHighlights(resolved);
      }
    };

    visitChildren(tree, 0);
    file.data.steps = Math.max(counter, highest);
  };
}

// Event handlers, as React reads prop names, and a whole page in an iframe.
const UNSAFE_ATTRIBUTE = /^(?:on.|srcdoc$)/i;
const UNSAFE_URL = /^(?:javascript|vbscript):/i;

/**
 * Removes event handlers, `srcdoc`, and `javascript:` and `vbscript:` URLs
 * from the attributes that directives give to components, as sanitising
 * does for HTML attributes.
 */
export function rehypeSafeDirectiveAttributes() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node) => {
      const json = node.properties.dataDirectiveAttributes;
      if (typeof json !== "string") return;
      const safe = Object.entries(
        JSON.parse(json) as Record<string, string>,
      ).filter(
        ([name, value]) =>
          !UNSAFE_ATTRIBUTE.test(name) && !UNSAFE_URL.test(asUrl(value)),
      );
      if (safe.length > 0) {
        node.properties.dataDirectiveAttributes = JSON.stringify(
          Object.fromEntries(safe),
        );
      } else {
        delete node.properties.dataDirectiveAttributes;
      }
    });
  };
}

/**
 * A value as browsers read it as a URL: without tabs and line breaks, and
 * without spaces and control characters at the start.
 */
function asUrl(value: string): string {
  return value.replace(/[\t\n\r]/g, "").replace(/^[\0- ]+/, "");
}
