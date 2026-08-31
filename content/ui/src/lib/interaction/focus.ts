/**
 * Focus-trap primitives. The DOM half lives in hooks/useFocusTrap.ts; the index
 * arithmetic is here because wrap-around is the part that is easy to get wrong
 * and cheap to test.
 */

/**
 * Elements that can receive keyboard focus. `:not([tabindex='-1'])` matters:
 * a programmatically-focusable container must not become a Tab stop.
 */
export const TABBABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Next index for a Tab press, wrapping at both ends.
 *
 * Returns -1 when there is nothing to focus, so the caller can fall back to the
 * container itself rather than letting focus escape the trap.
 */
export function nextTabbableIndex(count: number, current: number, shift: boolean): number {
  if (count <= 0) return -1;
  /* current === -1 means focus is somewhere outside the tracked list (the
   * container itself, say). Tab enters at the top, Shift+Tab at the bottom. */
  if (current < 0) return shift ? count - 1 : 0;
  const next = shift ? current - 1 : current + 1;
  return ((next % count) + count) % count;
}
