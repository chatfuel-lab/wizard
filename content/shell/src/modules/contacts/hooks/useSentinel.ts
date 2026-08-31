import { useCallback, useEffect, useRef, useState } from 'react';

/** How far below the last row a page starts loading. */
export const SENTINEL_MARGIN_PX = 320;

/**
 * Fetch-on-scroll, rooted on the list's OWN scroller.
 *
 * Not on the viewport: a module ships as an embed and can be one panel of
 * somebody else's page, where the window may never scroll at all. Rooting the
 * observer on the element that actually scrolls is what makes auto-paging work
 * inside a 700px panel as well as on a full page.
 *
 * Both nodes are held in state rather than in refs. The sentinel is rendered
 * conditionally — it does not exist past the auto-page cap — so it can mount
 * after the effect would have run, and a ref would leave the observer attached
 * to nothing.
 *
 * A missing `IntersectionObserver` is a no-op rather than a crash: the "Load
 * more" button is always rendered when there is another page, so nothing
 * becomes unreachable.
 */
export function useSentinel(enabled: boolean, onHit: () => void) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const handler = useRef(onHit);
  handler.current = onHit;

  useEffect(() => {
    if (!enabled || !target || typeof IntersectionObserver === 'undefined') return undefined;

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
