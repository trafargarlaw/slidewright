import { useCallback, useState, type RefCallback } from "react";

export interface Size {
  width: number;
  height: number;
}

/**
 * Size of an element, kept up to date as it resizes. `null` until it has
 * been measured: on the server, in the first client render, and while the
 * element is hidden.
 */
export function useElementSize(): [RefCallback<HTMLElement>, Size | null] {
  const [size, setSize] = useState<Size | null>(null);

  // Measures as the element attaches, before the browser paints.
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setSize((size) =>
        size?.width === width && size.height === height
          ? size
          : { width, height },
      );
    };
    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
