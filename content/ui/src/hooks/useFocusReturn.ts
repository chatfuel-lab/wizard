import { useEffect, useRef, type RefObject } from 'react';

/**
 * Put keyboard focus back on the trigger when a menu closes.
 *
 * A menu is deliberately not a focus trap (`useFocusTrap` restores focus on its
 * own), so nothing owns this: the item the user activated unmounts, or Escape
 * tears the surface down, and focus falls to `<body>` — the end of keyboard
 * navigation for that row. This remembers nothing and guesses nothing; it only
 * hands focus back when the menu still holds it at close time.
 *
 * Focus is left alone when something else legitimately took it — a click on
 * another control, a dialog opened from a menu item (which arms its own trap
 * and will restore to this same trigger when it closes).
 */
export function useFocusReturn(open: boolean, anchorRef: RefObject<HTMLElement | null>, surfaceId: string): void {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;

    const anchor = anchorRef.current;
    const doc = anchor?.ownerDocument;
    if (!anchor || !doc) return;
    const active = doc.activeElement;
    /* The surface can still be on screen here, mid-exit-animation, with focus
       inside it — that counts as "the menu still holds it". */
    const surface = doc.getElementById(surfaceId);
    const menuHasFocus = !active || active === doc.body || Boolean(surface?.contains(active));
    if (!menuHasFocus) return;

    const target = anchor.matches('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ? anchor
      : anchor.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    target?.focus({ preventScroll: true });
  }, [open, anchorRef, surfaceId]);
}
