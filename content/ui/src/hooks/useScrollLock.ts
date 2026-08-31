import { useEffect } from 'react';

/*
 * Ref-counted so nested overlays cannot unlock the page early: a popover
 * closing inside an open dialog must leave the dialog's lock in place.
 */
let locks = 0;
let restoreOverflow = '';
let restorePaddingRight = '';

function lock() {
  locks += 1;
  if (locks > 1) return;

  const { body, documentElement } = document;
  restoreOverflow = body.style.overflow;
  restorePaddingRight = body.style.paddingRight;

  /* Removing the scrollbar reflows the page by its width, which reads as the
   * whole layout jumping sideways the moment a dialog opens. Pad it back. */
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + scrollbarWidth}px`;
  }
  body.style.overflow = 'hidden';
}

function unlock() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  document.body.style.overflow = restoreOverflow;
  document.body.style.paddingRight = restorePaddingRight;
}

/** Prevents the page behind a modal surface from scrolling. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
