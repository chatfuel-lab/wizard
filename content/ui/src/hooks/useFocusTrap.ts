import { useEffect, type RefObject } from 'react';
import { nextTabbableIndex, TABBABLE_SELECTOR } from '../lib/interaction/focus';

export interface UseFocusTrapOptions {
  /** Focus this on activate instead of the first tabbable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Restore focus here on deactivate instead of wherever it was. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Hide the rest of the page from tab order AND the accessibility tree.
   * Only the bottom-most modal layer should do this — nested dialogs must not
   * fight over it. Default false.
   */
  inertBackground?: boolean;
}

/* Previous inert values, so nested/rapid open-close cycles restore exactly. */
const previousInert = new WeakMap<HTMLElement, boolean>();

function setBackgroundInert(container: HTMLElement, inert: boolean) {
  const root = container.ownerDocument.body;
  for (const child of Array.from(root.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.contains(container)) continue;
    if (inert) {
      if (!previousInert.has(child)) previousInert.set(child, child.inert);
      child.inert = true;
    } else {
      const restore = previousInert.get(child);
      if (restore !== undefined) {
        child.inert = restore;
        previousInert.delete(child);
      }
    }
  }
}

function tabbablesIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(
    /* getClientRects() is the cheap "is it actually rendered" test — it covers
     * display:none, an unrendered <details> body, and zero-size elements. */
    (element) => element.getClientRects().length > 0,
  );
}

/**
 * Confines Tab to `container` while `active`, and restores focus after.
 *
 * `container` is the element itself, or a ref to it. Which one is not a
 * matter of taste: the trap arms in an effect, and an effect keyed on `active`
 * runs on the commit that flipped it — which for anything portalled is one or
 * two commits BEFORE the panel exists (`Portal` resolves its host in an effect
 * of its own, `usePresence` mounts a render after `open`). A ref read at that
 * moment is null, the effect bails, and it never re-runs: the palette opens
 * and nobody can type into it. Passing the element as state — a callback ref —
 * puts its arrival in the dependency list, so the trap arms on the commit that
 * has something to trap. A ref is right only where the container is already
 * in the DOM when `active` flips.
 */
export function useFocusTrap(
  container: RefObject<HTMLElement | null> | HTMLElement | null,
  active: boolean,
  options?: UseFocusTrapOptions,
): void {
  const { initialFocusRef, returnFocusRef, inertBackground = false } = options ?? {};

  useEffect(() => {
    const element = container !== null && 'current' in container ? container.current : container;
    if (!active || !element) return;

    const previouslyFocused = element.ownerDocument.activeElement as HTMLElement | null;

    const initial = initialFocusRef?.current ?? tabbablesIn(element)[0] ?? element;
    if (initial === element && !element.hasAttribute('tabindex')) element.tabIndex = -1;
    initial.focus({ preventScroll: true });

    if (inertBackground) setBackgroundInert(element, true);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const tabbables = tabbablesIn(element);
      if (tabbables.length === 0) {
        /* Nothing to tab to — keep focus on the container rather than letting
         * it escape to the page behind. */
        event.preventDefault();
        element.focus({ preventScroll: true });
        return;
      }
      const current = tabbables.indexOf(element.ownerDocument.activeElement as HTMLElement);
      const next = nextTabbableIndex(tabbables.length, current, event.shiftKey);
      /* Let the browser handle the ordinary in-range step; only intervene at
       * the wrap points, where it would otherwise leave the container. */
      const wrapping = current === -1 || (event.shiftKey ? current === 0 : current === tabbables.length - 1);
      if (!wrapping) return;
      event.preventDefault();
      tabbables[next]?.focus({ preventScroll: true });
    };

    element.ownerDocument.addEventListener('keydown', onKeyDown, true);

    return () => {
      element.ownerDocument.removeEventListener('keydown', onKeyDown, true);
      if (inertBackground) setBackgroundInert(element, false);

      /* Focus that has already LEFT for the page — put somewhere deliberately
       * by the thing that closed the trap: a palette command that focused the
       * search box, an emoji picked into a composer that focused its textarea —
       * is left where it was put. Restoring over it would yank the caret back
       * to a trigger the user has finished with. Focus still inside the
       * container, inside another layered surface (a popover opened from this
       * dialog, which unmounts with it), or already lost to <body> because the
       * focused node went with the panel, is brought back. */
      const active = element.ownerDocument.activeElement;
      const left =
        active !== null &&
        active !== element.ownerDocument.body &&
        !element.contains(active) &&
        active.closest('[data-layer]') === null;
      if (left) return;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- the restore target is read at cleanup time on purpose: the latest ref wins
      const restore = returnFocusRef?.current ?? previouslyFocused;
      /* Guard that the element still exists: restoring focus to a node React
       * has already unmounted drops focus to <body> and strands keyboard users. */
      if (restore && restore.isConnected) restore.focus({ preventScroll: true });
    };
  }, [active, container, initialFocusRef, returnFocusRef, inertBackground]);
}
