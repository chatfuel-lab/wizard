import { useEffect, useRef, type ReactNode } from 'react';
import { DURATION, EASING, prefersReducedMotion } from '../lib/interaction/motion';
import { Portal } from '../overlay/Portal';
import type { DragSession } from './useDragSession';

export interface DragLayerProps<T> {
  session: DragSession<T>;
  /** Renders the ghost. Usually the same card component, in a dragging state. */
  children: (data: T) => ReactNode;
  className?: string;
}

/**
 * The thing that follows the pointer.
 *
 * Portalled and `pointer-events: none`, so it never becomes its own drop target
 * and never blocks a hit test. Its transform is written by useDragSession
 * directly to the DOM in a rAF — nothing about the ghost's position goes
 * through React.
 *
 * Also hosts the live region. A drag announcer belongs to the primitive: a
 * screen-reader user meeting an unannounced drag is a defect in the mechanism,
 * not something each board should have to remember.
 */
export function DragLayer<T>({ session, children, className = '' }: DragLayerProps<T>) {
  const { activeData, activeRect, layerRef, isDragging, announcement } = session;
  const lifted = useRef(false);

  /* The lift: a small scale and tilt so the card visibly leaves the board.
   * WAAPI, because CSS cannot see that a drag started, and it has to compose
   * with the translate3d the rAF loop is writing to the same element. */
  useEffect(() => {
    if (!isDragging) {
      lifted.current = false;
      return;
    }
    if (lifted.current) return;
    lifted.current = true;

    const inner = layerRef.current?.firstElementChild;
    if (!(inner instanceof HTMLElement) || prefersReducedMotion()) return;
    inner.animate([{ transform: 'scale(1) rotate(0deg)' }, { transform: 'scale(1.03) rotate(1.5deg)' }], {
      duration: DURATION.fast,
      easing: EASING.standard,
      fill: 'forwards',
    });
  }, [isDragging, layerRef]);

  return (
    <Portal>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {isDragging && activeData !== null ? (
        <div
          ref={layerRef}
          aria-hidden
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: activeRect?.width,
            /* Written by the rAF loop from the first frame; starting at the
               source rect avoids one frame parked in the corner. */
            transform: `translate3d(${activeRect?.x ?? 0}px, ${activeRect?.y ?? 0}px, 0)`,
            willChange: 'transform',
          }}
          className={`pointer-events-none z-drag font-sans ${className}`}
        >
          <div className="shadow-drag rounded-card">{children(activeData)}</div>
        </div>
      ) : null}
    </Portal>
  );
}
