import type { Element } from "hast";
import type { ComponentProps } from "react";
import { useSlideContext } from "./context";

/** Tag that directive elements are renamed to before rendering. */
export const DIRECTIVE_TAG = "deck-directive";

type DirectiveElementProps = ComponentProps<"div"> & {
  node?: Element;
  "data-directive"?: string;
  "data-directive-kind"?: string;
  "data-directive-attributes"?: string;
};

// Props React reserves, or that would clash with the content.
const RESERVED = new Set(["key", "ref", "children"]);

/**
 * Renders a `:::name` or `::name` directive: the registered component when
 * there is one, otherwise the content in a plain `div`. The wrapper keeps the
 * directive's class, id and step, so reveals and CSS work either way.
 */
export function Directive({
  node: _node,
  children,
  "data-directive": name = "",
  "data-directive-kind": _kind,
  "data-directive-attributes": attributes,
  ...rest
}: DirectiveElementProps) {
  const { components } = useSlideContext();
  const Component = Object.hasOwn(components, name)
    ? components[name]
    : undefined;

  return (
    <div data-directive={name} {...rest}>
      {Component ? (
        <Component {...parseAttributes(attributes)}>{children}</Component>
      ) : (
        children
      )}
    </div>
  );
}

function parseAttributes(json: string | undefined): Record<string, string> {
  if (!json) return {};
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== "object" || value === null) return {};
    const result: Record<string, string> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (!RESERVED.has(key)) result[key] = String(entry);
    }
    return result;
  } catch {
    return {};
  }
}
