import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Placement } from '../lib/geometry/position';
import { FloatingSurface } from './FloatingSurface';

export interface TooltipProps {
  /** The tip text. A tooltip is a hint, never the only name of a control. */
  label: string;
  children: ReactNode;
  placement?: Placement;
  /** Delay before opening, ms. Defaults to the --transition-delay-tooltip token. */
  delay?: number;
  /** Suppress without unmounting — useful when the label is already visible. */
  disabled?: boolean;
  className?: string;
}

const DEFAULT_DELAY = 400;
/** How long after a close the next tooltip opens instantly. */
const GRACE_MS = 300;

/**
 * Module-level, shared by every tooltip on the page. Moving along a toolbar
 * should feel like one tooltip following the pointer, not eight separate
 * 400ms waits — so once any tooltip has opened, the next one skips the delay.
 */
let lastClosedAt = 0;

export function Tooltip({
  label,
  children,
  placement = 'top',
  delay = DEFAULT_DELAY,
  disabled = false,
  className = '',
}: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef(0);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  const cancel = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = 0;
  }, []);

  const close = useCallback(() => {
    cancel();
    setOpen((was) => {
      if (was) lastClosedAt = Date.now();
      return false;
    });
  }, [cancel]);

  const openSoon = useCallback(
    (immediate: boolean) => {
      if (disabled) return;
      cancel();
      const wait = immediate || Date.now() - lastClosedAt < GRACE_MS ? 0 : delay;
      if (wait === 0) {
        setOpen(true);
        return;
      }
      timerRef.current = window.setTimeout(() => setOpen(true), wait);
    },
    [cancel, delay, disabled],
  );

  useEffect(() => cancel, [cancel]);

  /* Escape closes even though the pointer has not left — the keyboard user who
   * tabbed here needs a way out that does not involve a mouse. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex"
        onPointerEnter={(event) => {
          /* Touch never opens a tooltip: there is no hover, and a long-press
           * tooltip would fight the browser's own context menu. The control's
           * accessible name is what carries the meaning there. */
          if (event.pointerType === 'touch') return;
          openSoon(false);
        }}
        onPointerLeave={close}
        onPointerDown={close}
        onFocusCapture={() => openSoon(true)}
        onBlurCapture={close}
      >
        {children}
      </span>

      <FloatingSurface
        anchorRef={anchorRef}
        open={open && !disabled}
        onDismiss={close}
        placement={placement}
        offset={6}
        role="tooltip"
        id={tooltipId}
        interactive={false}
        closeOnEscape={false}
        closeOnOutsidePointer={false}
        className={`max-w-64 rounded-chip bg-surface-inverse px-2 py-1 text-xs text-text-inverse shadow-overlay ${className}`}
      >
        {label}
      </FloatingSurface>
    </>
  );
}
