import { useEffect, useState, type RefObject } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

const ZERO: ElementSize = { width: 0, height: 0 };

/**
 * The box size of an element, kept current by a ResizeObserver.
 *
 * Two rules, both learned in this repo and both easy to lose:
 *
 * 1. **Measure synchronously first.** The observer's initial notification is
 *    asynchronous — one frame after mount at best — and a component that
 *    waits for it renders one frame at size zero: a month grid with no rows,
 *    a time grid whose column count is a division by zero. So the effect
 *    reads `getBoundingClientRect` immediately, and the observer only takes
 *    over for CHANGES.
 * 2. **State only on change.** Observers fire on every layout that touches
 *    the element, including ones that leave its size alone. Setting state to
 *    an equal-but-new object re-renders the whole subtree for nothing, and on
 *    a grid holding a few hundred events that is a visible stutter while a
 *    neighbouring panel animates its width.
 *
 * Widths are rounded to whole pixels for the same reason: sub-pixel jitter
 * from a fluid layout would otherwise re-render on every frame of a resize
 * without changing anything a component can see.
 *
 * `useContainerBand` is the same idea specialised to the four bands; use that
 * when the answer is a band, this when it is a number.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>(ZERO);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const apply = (width: number, height: number) => {
      const next = { width: Math.round(width), height: Math.round(height) };
      setSize((current) => (current.width === next.width && current.height === next.height ? current : next));
    };

    const rect = node.getBoundingClientRect();
    apply(rect.width, rect.height);
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      apply(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
