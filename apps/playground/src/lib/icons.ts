import type { IconSet } from "@slidewright/react";
import { useEffect, useState } from "react";

const NO_ICONS: readonly IconSet[] = [];
let loading: Promise<readonly IconSet[]> | undefined;

/**
 * The Lucide icons, for `:lucide:name:` in the deck. The set is a file of
 * its own, which loads after the page: until then, icons show as text.
 */
export function useIcons(): readonly IconSet[] {
  const [icons, setIcons] = useState(NO_ICONS);
  useEffect(() => {
    let current = true;
    loading ??= import("@iconify-json/lucide/icons.json").then((module) => [
      module.default,
    ]);
    void loading.then((sets) => {
      if (current) setIcons(sets);
    });
    return () => {
      current = false;
    };
  }, []);
  return icons;
}
