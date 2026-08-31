import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { Portal } from '../overlay/Portal';
import { FloatingSurface } from './FloatingSurface';
import { MenuList, type MenuItem } from './internal/MenuList';

export interface ContextMenuPoint {
  x: number;
  y: number;
}

export interface ContextMenuTriggerProps {
  onContextMenu: (event: ReactMouseEvent) => void;
}

export interface ContextMenuProps {
  items: readonly MenuItem[];
  /**
   * Uncontrolled: wrap whatever owns the right-click and spread `onContextMenu`
   * onto it.
   */
  children?: (props: ContextMenuTriggerProps) => ReactNode;
  /**
   * Controlled: the viewport point to open at, `null` for closed. For owners
   * that cannot wrap their targets — a DataTable hands its rows'
   * `onRowContextMenu` to one shared menu rather than mounting one per row.
   */
  point?: ContextMenuPoint | null;
  onPointChange?: (point: ContextMenuPoint | null) => void;
  /** Falls through to the browser's own menu instead of opening this one. */
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * A menu at the pointer, for right-click.
 *
 * The one design decision worth stating: this does **not** teach
 * `useAnchoredPosition` about virtual anchors. That hook takes an element ref
 * and every Popover, Tooltip, Combobox, Select and DropdownMenu in the system
 * runs through it, so widening its contract for one consumer would put all of
 * them at risk. Instead a 0×0 `position: fixed` span is planted at the click
 * point and handed over as an ordinary anchor — `resolvePosition` works on a
 * plain Rect, so flip, shift and size clamping behave exactly as they do for a
 * real element, with no second code path to keep correct.
 *
 * **No touch long-press, deliberately.** Drag activation is a 180ms hold
 * (`TOUCH_HOLD_MS`), so a card that both drags and opens a menu on hold cannot
 * resolve the gesture — one of the two loses, silently, mid-press. Touch users
 * reach the same actions through selection and the ActionBar.
 */
export function ContextMenu({
  items,
  children,
  point: controlledPoint,
  onPointChange,
  disabled = false,
  ...aria
}: ContextMenuProps) {
  const [uncontrolledPoint, setUncontrolledPoint] = useState<ContextMenuPoint | null>(null);
  const controlled = controlledPoint !== undefined;
  const point = controlled ? controlledPoint : uncontrolledPoint;

  const anchorRef = useRef<HTMLSpanElement>(null);

  const setPoint = useCallback(
    (next: ContextMenuPoint | null) => {
      if (!controlled) setUncontrolledPoint(next);
      onPointChange?.(next);
    },
    [controlled, onPointChange],
  );

  const close = useCallback(() => setPoint(null), [setPoint]);

  const onContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      if (disabled || items.length === 0) return;
      event.preventDefault();
      /* Stop here: a card inside a column inside a canvas would otherwise open
       * three stacked menus, innermost last and therefore under the others. */
      event.stopPropagation();
      setPoint({ x: event.clientX, y: event.clientY });
    },
    [disabled, items.length, setPoint],
  );

  return (
    <>
      {children?.({ onContextMenu })}

      {/* Rendered only while open. On close the anchor goes with it, and
          useAnchoredPosition's update() then early-returns rather than
          recomputing — which is what freezes the surface in place for its exit
          animation instead of snapping it to the top-left corner. */}
      {point ? (
        <Portal>
          <span
            ref={anchorRef}
            aria-hidden
            style={{ position: 'fixed', left: point.x, top: point.y, width: 0, height: 0 }}
          />
        </Portal>
      ) : null}

      <FloatingSurface
        anchorRef={anchorRef}
        open={point !== null}
        onDismiss={close}
        placement="bottom-start"
        offset={0}
        aria-label={aria['aria-label'] ?? 'Actions'}
        className="rounded-card border border-border bg-surface-overlay shadow-overlay"
      >
        {/* A second right-click inside the menu must not summon the browser's
            own on top of ours. */}
        <div onContextMenu={(event) => event.preventDefault()}>
          <MenuList items={items} onClose={close} labelledBy={undefined} />
        </div>
      </FloatingSurface>
    </>
  );
}
