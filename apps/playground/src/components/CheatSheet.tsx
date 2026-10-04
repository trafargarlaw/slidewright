import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";
import { LAYOUT_REFERENCE, SYNTAX_REFERENCE } from "@/lib/deck-reference";

const plugins = { code };
const reference = `${SYNTAX_REFERENCE}\n\n${LAYOUT_REFERENCE}`;

/** The deck syntax reference, rendered from docs/syntax.md. */
export function CheatSheet() {
  return (
    <div className="h-full overflow-y-auto px-5 py-4 text-sm">
      <Streamdown mode="static" plugins={plugins}>
        {reference}
      </Streamdown>
    </div>
  );
}
