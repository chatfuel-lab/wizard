import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useControllableState } from '../hooks/useControllableState';
import { useFocusReturn } from '../hooks/useFocusReturn';
import type { Placement } from '../lib/geometry/position';
import { IconMore } from '../icons';
import { Button } from '../primitives/Button';
import { FloatingSurface } from './FloatingSurface';
import { MenuList, type MenuItem } from './internal/MenuList';
import type { PopoverTriggerProps } from './Popover';

/* MenuList lives under internal/, but its item shapes are the public vocabulary
 * of every menu in the system — re-exported here so `MenuItem` keeps its home. */
export type { MenuAction, MenuItem } from './internal/MenuList';

export interface DropdownMenuProps {
  trigger: (props: PopoverTriggerProps) => ReactNode;
  items: readonly MenuItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  offset?: number;
  'aria-label'?: string;
  className?: string;
  triggerClassName?: string;
}

export function DropdownMenu({
  trigger,
  items,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  placement = 'bottom-end',
  offset,
  className = '',
  triggerClassName = '',
  ...aria
}: DropdownMenuProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const triggerId = useId();
  const menuId = useId();
  const [open, setOpen] = useControllableState(controlledOpen, defaultOpen, onOpenChange);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useFocusReturn(open, anchorRef, menuId);

  /* APG: a menu button opens on ArrowDown/ArrowUp too, and ArrowUp lands on the
     last item. Click and Enter/Space are the button's own doing. */
  const [initialEdge, setInitialEdge] = useState<'first' | 'last'>('first');
  const onTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setInitialEdge(event.key === 'ArrowUp' ? 'last' : 'first');
    if (!open) setOpen(true);
  };

  return (
    <>
      <span ref={anchorRef} className={`inline-flex ${triggerClassName}`}>
        {trigger({
          id: triggerId,
          onClick: () => setOpen(!open),
          onKeyDown: onTriggerKeyDown,
          'aria-expanded': open,
          'aria-haspopup': 'menu',
          'aria-controls': open ? menuId : undefined,
        })}
      </span>

      <FloatingSurface
        anchorRef={anchorRef}
        open={open}
        onDismiss={close}
        placement={placement}
        offset={offset}
        id={menuId}
        aria-label={aria['aria-label']}
        className={`rounded-card border border-border bg-surface-overlay shadow-overlay ${className}`}
      >
        <MenuList
          items={items}
          onClose={close}
          labelledBy={aria['aria-label'] === undefined ? triggerId : undefined}
          initialEdge={initialEdge}
        />
      </FloatingSurface>
    </>
  );
}

export interface MenuButtonProps {
  items: readonly MenuItem[];
  label?: string;
  placement?: Placement;
  className?: string;
}

/**
 * The `⋯` overflow menu, which is most of this component's real usage —
 * column headers, card corners, table rows.
 */
export function MenuButton({
  items,
  label = 'More actions',
  placement = 'bottom-end',
  className = '',
}: MenuButtonProps) {
  return (
    <DropdownMenu
      items={items}
      placement={placement}
      aria-label={label}
      trigger={(props) => (
        <Button {...props} iconOnly variant="ghost" size="sm" aria-label={label} className={className}>
          <IconMore />
        </Button>
      )}
    />
  );
}
