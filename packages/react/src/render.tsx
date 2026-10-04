import type { Element, ElementContent, Properties, Root } from "hast";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import type { ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CodeBlock } from "./code-block";
import { DIRECTIVE_TAG, Directive } from "./directive";

export interface SlideContent {
  /** Content outside the layout's slots. */
  children: ReactNode;
  slots: Partial<Record<string, ReactNode>>;
}

const COMPONENTS = {
  pre: CodeBlock,
  [DIRECTIVE_TAG]: Directive,
} as Partial<Components>;

/**
 * Turns a compiled slide into React nodes at a given step. Top-level
 * container directives named after one of the layout's slots are split out;
 * everything else stays in `children`.
 */
export function renderSlide(
  tree: Root,
  step: number,
  slotNames: readonly string[],
): SlideContent {
  const children: Root["children"] = [];
  const slotted = new Map<string, Element[]>();

  for (const node of tree.children) {
    const slot = getSlotName(node, slotNames);
    if (slot === undefined) {
      children.push(node);
    } else {
      const nodes = slotted.get(slot) ?? [];
      nodes.push(toSlotElement(node as Element, slot));
      slotted.set(slot, nodes);
    }
  }

  const slots: SlideContent["slots"] = {};
  for (const [name, nodes] of slotted) {
    slots[name] = toReact({ type: "root", children: nodes }, step);
  }
  return { children: toReact({ type: "root", children }, step), slots };
}

function getSlotName(
  node: Root["children"][number],
  slotNames: readonly string[],
): string | undefined {
  if (node.type !== "element") return undefined;
  const { dataDirective, dataDirectiveKind } = node.properties;
  if (dataDirectiveKind !== "container" || typeof dataDirective !== "string") {
    return undefined;
  }
  return slotNames.includes(dataDirective) ? dataDirective : undefined;
}

function toSlotElement(node: Element, name: string): Element {
  const {
    dataDirective: _name,
    dataDirectiveKind: _kind,
    dataDirectiveAttributes: _attributes,
    ...properties
  } = node.properties;
  return { ...node, properties: { ...properties, dataSlot: name } };
}

function toReact(root: Root, step: number): ReactNode {
  return toJsxRuntime(
    { ...root, children: prepareChildren(root.children, step) },
    {
      Fragment,
      jsx,
      jsxs,
      components: COMPONENTS,
      passNode: true,
      // Half-typed `style` attributes are common while editing.
      ignoreInvalidStyle: true,
    },
  );
}

/**
 * Marks elements with their reveal state (`data-step-state`) and renames
 * directives so they render through `Directive`. Unchanged subtrees are
 * reused rather than copied.
 */
function prepareChildren<T extends ElementContent | Root["children"][number]>(
  children: T[],
  step: number,
): T[] {
  let changed = false;
  const result = children.map((child) => {
    if (child.type !== "element") return child;
    const prepared = prepareElement(child, step);
    if (prepared !== child) changed = true;
    return prepared as T;
  });
  return changed ? result : children;
}

function prepareElement(element: Element, step: number): Element {
  let properties: Properties = element.properties;
  if (properties.dataStep !== undefined && properties.dataStep !== null) {
    const revealAt = Number(properties.dataStep);
    const state =
      revealAt > step ? "future" : revealAt === step ? "current" : "past";
    properties = { ...properties, dataStepState: state };
  }

  const tagName =
    typeof properties.dataDirective === "string"
      ? DIRECTIVE_TAG
      : element.tagName;
  const children = prepareChildren(element.children, step);

  if (
    properties === element.properties &&
    tagName === element.tagName &&
    children === element.children
  ) {
    return element;
  }
  return { ...element, tagName, properties, children };
}
