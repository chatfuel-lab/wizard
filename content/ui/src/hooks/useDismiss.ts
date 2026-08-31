import { useEffect, type RefObject } from 'react';
import { isLayerAbove } from '../lib/interaction/layers';

export interface UseDismissOptions {
  /** Clicking the trigger must not close-then-immediately-reopen. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Only fire Escape when this layer is on top of the stack. */
  isTop?: () => boolean;
  /**
   * This surface's own layer id. With it, a press inside a surface that is
   * OPEN ABOVE this one — a menu opened from a popover, a popover from a
   * popover — is not an outside press, even though the two are portalled
   * siblings and neither contains the other in the DOM. Without it, picking
   * an emoji from a picker inside a "more" popover closed the popover under
   * the picker before the click could land.
   */
  layerId?: string;
  /** Default true. */
  closeOnEscape?: boolean;
  /** Default true. */
  closeOnOutsidePointer?: boolean;
}

/** Closes a floating surface on Escape or an outside pointer press. */
export function useDismiss(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
  options?: UseDismissOptions,
): void {
  const { anchorRef, isTop, layerId, closeOnEscape = true, closeOnOutsidePointer = true } = options ?? {};

  useEffect(() => {
    if (!open) return;
    const doc = containerRef.current?.ownerDocument ?? document;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== 'Escape') return;
      if (isTop && !isTop()) return;
      /* Stop the same Escape from also closing the dialog underneath. The
         IMMEDIATE form, because every surface listens on the same document
         node, and `stopPropagation` does nothing between listeners on one node.
         React flushes the close between two listeners' turns — this one's
         `setOpen(false)` runs, its layer pops — so a surface registered later
         in the list would ask "am I top?" after the top had already gone, say
         yes, and close as well: one Escape emptied a popover and the popover
         it was opened from. */
      event.stopImmediatePropagation();
      event.stopPropagation();
      onDismiss();
    };

    /* pointerdown, not click: a click fires after the press has already moved
     * focus and possibly scrolled, and a drag that starts inside and ends
     * outside should not count as an outside click at all. */
    const onPointerDown = (event: PointerEvent) => {
      if (!closeOnOutsidePointer) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      /* Every surface carries its layer id on its root; the nearest one up
         from the target is the surface the press landed in. */
      const surface = target instanceof Element ? target.closest<HTMLElement>('[data-layer]') : null;
      const pressedLayer = surface?.dataset['layer'];
      if (layerId && pressedLayer && isLayerAbove(pressedLayer, layerId)) return;
      onDismiss();
    };

    doc.addEventListener('keydown', onKeyDown);
    doc.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open, onDismiss, containerRef, anchorRef, isTop, layerId, closeOnEscape, closeOnOutsidePointer]);
}
