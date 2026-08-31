import { useCallback, useEffect, useRef, useState } from 'react';
import { SENTINEL_MARGIN_PX } from '../lib/constants';

/**
 * Fetch-on-scroll for one column.
 *
 * Rooted on the column's own scroller, not the viewport, because six columns
 * scroll independently. Disconnected entirely when `enabled` is false, so a
 * column at the auto-page cap costs nothing.
 *
 * Both nodes are held in state rather than in refs: the sentinel is rendered
 * conditionally, so it can mount after the effect would have run, and a ref
 * would leave the observer attached to nothing.
 *
 * A missing `IntersectionObserver` is a no-op rather than a crash — the "load
 * more" button is always rendered past the cap, so nothing becomes unreachable.
 */
export function useSentinel(enabled: boolean, onHit: () => void) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const handler = useRef(onHit);
  handler.current = onHit;

  useEffect(() => {
    if (!enabled || !target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) handler.current();
      },
      { root, rootMargin: `${SENTINEL_MARGIN_PX}px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, root, target]);

  return {
    setRoot: useCallback((node: HTMLElement | null) => setRoot(node), []),
    setTarget: useCallback((node: HTMLElement | null) => setTarget(node), []),
  };
}
