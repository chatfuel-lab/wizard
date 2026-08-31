import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { DURATION, EASING, prefersReducedMotion } from '~ui';

/** Below this a slide is invisible and only costs a compositor layer. */
const FLIP_MIN_PX = 2;

export interface EventFlip {
  /**
   * Skip the next FLIP — called right before an own POINTER drop is
   * dispatched: the drag preview already sat at the destination, and sliding
   * the block there from its origin would read as the move happening twice.
   * Keyboard nudges and live updates still slide.
   */
  skipNext: () => void;
}

/**
 * FLIP for the calendar: blocks slide to their new place instead of
 * teleporting (deals' `useBoardFlip`, adapted).
 *
 * It reads the DOM by `[data-booking-id]` — every block the module renders
 * carries it, in the grid, the month and the agenda — so no ref registry has
 * to thread through `~ui`'s `renderEvent`. Only blocks present in BOTH frames
 * animate: one that left is already unmounted, one that arrived has no
 * previous position and simply appears (no exit animation, deliberately — a
 * block the store no longer holds must not linger where a click could reach
 * it).
 *
 * It stands down during a pointer drag (any block carrying `data-dragging`),
 * after an own drop (`skipNext`), and under reduced motion.
 */
export function useEventFlip(containerRef: RefObject<HTMLElement | null>, signature: string): EventFlip {
  const previous = useRef(new Map<string, DOMRect>());
  const skip = useRef(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = container.querySelectorAll<HTMLElement>('[data-booking-id]');
    const next = new Map<string, DOMRect>();
    for (const node of nodes) {
      const id = node.dataset.bookingId;
      if (id && !next.has(id)) next.set(id, node.getBoundingClientRect());
    }

    const before = previous.current;
    previous.current = next;
    const skipped = skip.current;
    skip.current = false;

    if (skipped || before.size === 0 || prefersReducedMotion()) return;
    if (container.querySelector('[data-dragging]')) return;

    for (const node of nodes) {
      const id = node.dataset.bookingId;
      if (!id) continue;
      const from = before.get(id);
      const to = next.get(id);
      if (!from || !to) continue;
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (Math.abs(dx) < FLIP_MIN_PX && Math.abs(dy) < FLIP_MIN_PX) continue;
      node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: DURATION.base,
        easing: EASING.standard,
      });
    }
    // `signature` changes exactly when a block can have moved.
  }, [signature, containerRef]);

  const skipNext = useCallback(() => {
    skip.current = true;
  }, []);

  return { skipNext };
}
