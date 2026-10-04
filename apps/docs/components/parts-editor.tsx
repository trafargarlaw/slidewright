"use client";
// The layout and the component are functions, so they can't come from the
// server: this client component imports them.
import { components, layouts } from "@repo/examples/react/src/parts";
import { LiveEditor } from "./live-editor";

/** A live editor with the React example's layout and component. */
export function PartsEditor({ markdown }: { markdown: string }) {
  return (
    <LiveEditor markdown={markdown} layouts={layouts} components={components} />
  );
}
