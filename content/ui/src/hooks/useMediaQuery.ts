import { useCallback, useSyncExternalStore } from 'react';

/**
 * A media query, as state.
 *
 * ⚠ THIS ASKS THE VIEWPORT. Module code must never call it — a module can be
 * 700px wide inside a 2560px viewport, so the viewport answers a question the
 * module did not ask. Use `useContainerBand` (or `useBand` inside a
 * `ModuleRoot`) instead. This hook is a deliberately separate export, with a
 * deliberately different name, so the two are never confused at a call site.
 *
 * The two legitimate callers:
 *
 *   1. `content/shell` chrome outside `src/modules/**`. When the shell IS the
 *      top-level app, the viewport genuinely is its container — that is where
 *      the nav-rail-to-hamburger decision lives.
 *   2. `(pointer: coarse)` / `(hover: none)`, anywhere. No container query can
 *      ask about the input device, and touch is orthogonal to width: a 1200px
 *      touch laptop needs the same affordances a 360px phone does.
 *
 * useSyncExternalStore rather than useEffect + useState: the value is read
 * during render, so there is no first frame showing the wrong answer.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  // Server snapshot: false. A module rendered without a window has no viewport
  // to have opinions about, and false is the layout that works everywhere.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
