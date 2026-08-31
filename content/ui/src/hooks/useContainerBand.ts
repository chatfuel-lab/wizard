import { useEffect, useState, type RefObject } from 'react';
import { bandFor, nextBand, type Band } from '../lib/interaction/layout';

/**
 * The container breakpoint. Media queries are the wrong tool here: an embed can
 * be 700px wide inside a 2560px viewport, and the module has to lay itself out
 * for the box it was given.
 *
 * Attach the ref to the MODULE ROOT, never to the canvas. A detail panel that
 * opens beside the content narrows the canvas — an observer there would flip the
 * band, close the panel, widen the canvas and oscillate forever. `ModuleRoot`
 * exists so this is structurally impossible to get wrong; reach for the hook
 * directly only when you cannot use that component.
 *
 * State only changes when the band changes, so a drag that resizes nothing does
 * not re-render the module on every observer callback.
 */
export function useContainerBand(ref: RefObject<HTMLElement | null>): Band {
  const [band, setBand] = useState<Band>('wide');

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // First paint must not be wrong; the observer's own initial callback is
    // async and one frame of the default band is a visible layout jump.
    setBand(bandFor(node.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setBand((current) => nextBand(current, entry.contentRect.width) ?? current);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return band;
}
