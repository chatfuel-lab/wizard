import { useCallback, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition';
import { useDismiss } from '../hooks/useDismiss';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useLayer } from '../hooks/useLayer';
import { usePresence } from '../hooks/usePresence';
import type { Placement } from '../lib/geometry/position';
import { Portal } from '../overlay/Portal';

export interface FloatingSurfaceProps {
  /** Element the surface is positioned against. */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onDismiss: () => void;
  placement?: Placement;
  offset?: number;
  /** Force the surface to the anchor's width — selects, comboboxes. */
  matchAnchorWidth?: boolean;
  /** Confine Tab inside. Menus manage focus themselves and leave this off. */
  trapFocus?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsidePointer?: boolean;
  /** Off for tooltips, which must never eat a click meant for the page. */
  interactive?: boolean;
  role?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Portal + anchored position + presence + dismissal, in one place.
 *
 * Popover, DropdownMenu, Tooltip and Combobox are all this component plus their
 * own contents and keyboard model. Two things it guarantees that are easy to
 * lose when each surface rolls its own:
 *
 * - It is always portalled and always `position: fixed`. useAnchoredPosition's
 *   math is in viewport coordinates, and any `transform` / `filter` / `contain`
 *   ancestor would silently become the containing block and break it.
 * - It sits at `z-popover`, ABOVE `z-overlay`. A menu opened inside a Dialog has
 *   to escape the dialog's stacking context or it renders clipped underneath it.
 */
export function FloatingSurface({
  anchorRef,
  open,
  onDismiss,
  placement = 'bottom-start',
  offset,
  matchAnchorWidth,
  trapFocus = false,
  closeOnEscape = true,
  closeOnOutsidePointer = true,
  interactive = true,
  role,
  id,
  className = '',
  style,
  children,
  ...aria
}: FloatingSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  /* State as well as a ref. The surface is portalled, so it is in the DOM two
     commits after `open`; anything whose effect is keyed on `open` alone runs
     before it exists and arms against nothing. The positioner and the focus
     trap therefore take the ELEMENT (state), so their effects re-run on the
     commit that mounted it — see `useAnchoredPosition` and `useFocusTrap`.
     The ref stays for `usePresence` and `useDismiss`, which only read it
     later, from event handlers, when it is long since set. */
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const attachSurface = useCallback((node: HTMLDivElement | null) => {
    surfaceRef.current = node;
    setSurface(node);
  }, []);
  const { mounted, state } = usePresence(open, surfaceRef, { fallbackMs: 250 });
  const layer = useLayer(open);

  /* `mounted`, not `open`: during the exit the surface must keep tracking the
   * anchor, otherwise it snaps to the top-left corner as it fades. */
  const position = useAnchoredPosition(anchorRef, surface, mounted, {
    placement,
    offset,
    matchAnchorWidth,
  });

  useDismiss(surfaceRef, open, onDismiss, {
    anchorRef,
    isTop: layer.isTop,
    layerId: layer.id,
    closeOnEscape,
    closeOnOutsidePointer,
  });
  /* Armed only once positioned: until then the surface is `visibility:
     hidden`, and a hidden element refuses focus, so a trap that armed one
     commit earlier would call `.focus()` on the first field and nothing would
     happen. */
  useFocusTrap(surface, open && trapFocus && position !== null);

  if (!mounted) return null;

  return (
    <Portal>
      <div
        ref={attachSurface}
        id={id}
        role={role}
        data-layer={layer.id}
        data-state={state}
        data-placement={position?.placement}
        {...aria}
        style={{
          position: 'fixed',
          left: position?.x ?? 0,
          top: position?.y ?? 0,
          maxHeight: position?.maxHeight,
          /* Hidden between mount and measurement. The measurement happens in
             a layout effect on the very commit that mounted this div, so the
             hidden state never reaches the screen. */
          visibility: position ? undefined : 'hidden',
          pointerEvents: interactive ? undefined : 'none',
          ...style,
        }}
        className={`z-popover overflow-y-auto overscroll-contain font-sans data-[state=entering]:animate-scale-in data-[state=exiting]:animate-scale-out ${className}`}
      >
        {children}
      </div>
    </Portal>
  );
}
