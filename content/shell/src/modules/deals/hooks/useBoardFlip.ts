import { useLayoutEffect, useRef, type RefObject } from 'react';
import { DURATION, EASING, prefersReducedMotion } from '~ui';
import { FLIP_MIN_PX } from '../lib/constants';

/**
 * FLIP for the board: cards slide to their new place instead of teleporting.
 *
 * Until now a subscription batch — a colleague moving a deal, a flow firing —
 * simply rewrote the columns between two frames. Cards appeared and vanished
 * with no relationship between the two states, which reads as a glitch rather
 * than as something happening.
 *
 * Three constraints shape the implementation:
 *
 * - **It reads the DOM, not a ref registry.** The cards are three components
 *   deep and already carry `data-deal-id` for exactly this; threading a
 *   fourth ref map through `BoardChrome` would buy nothing.
 * - **It must stand down during a drag.** `useDragSession` writes transforms
 *   straight to the dragged node in a rAF loop, and a FLIP animating the same
 *   property would fight it for the whole gesture.
 * - **Only cards present in BOTH frames animate.** A card that left is already
 *   unmounted — there is nothing to animate — and one that arrived has no
 *   previous position, so it gets the cheap fade the CSS gives it instead of a
 *   slide from an invented origin.
 */
export function useBoardFlip(containerRef: RefObject<HTMLElement | null>, signature: string, disabled: boolean): void {
  const previous = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nodes = container.querySelectorAll<HTMLElement>('[data-deal-id]');
    const next = new Map<string, DOMRect>();
    for (const node of nodes) {
      const id = node.dataset.dealId;
      if (id) next.set(id, node.getBoundingClientRect());
    }

    const before = previous.current;
    previous.current = next;

    /* First paint has nothing to animate from, and a drag owns the transform. */
    if (disabled || before.size === 0 || prefersReducedMotion()) return;

    for (const node of nodes) {
      const id = node.dataset.dealId;
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
    // `signature` is the dependency that matters: it changes exactly when the
    // ordering does, which is when a card can have moved.
  }, [signature, disabled, containerRef]);
}
