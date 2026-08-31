import { useCallback, useId, useRef, useState } from 'react';
import { useFocusReturn } from '../hooks/useFocusReturn';
import { FloatingSurface } from '../floating/FloatingSurface';
import { MenuList, type MenuItem } from '../floating/internal/MenuList';
import type { Placement } from '../lib/geometry/position';
import { Avatar } from '../primitives/Avatar';
import { Button } from '../primitives/Button';
import { Tag } from '../primitives/Tag';

export interface UserMenuProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
  /** The workspace / bot this session is pointed at, as a chip under the email. */
  workspace?: string;
  /** Same vocabulary as DropdownMenu: actions, separators, group labels; `tone: 'danger'` for Sign out. */
  items: readonly MenuItem[];
  placement?: Placement;
  /** Name of the trigger. Default "Account menu". */
  'aria-label'?: string;
  className?: string;
}

/**
 * The avatar in the top-right corner and the menu under it.
 *
 * It is DropdownMenu with a header: the same FloatingSurface for position,
 * presence and dismissal, the same MenuList for roving focus, type-ahead and
 * Escape — so it is keyboard-complete by inheritance, not by a second
 * implementation. What it adds is the identity block above the items (who is
 * signed in, as which address, into which workspace), which is what a person
 * opens this menu to check before they trust the Sign out at the bottom of it.
 */
export function UserMenu({
  name,
  email,
  avatarUrl,
  workspace,
  items,
  placement = 'bottom-end',
  className = '',
  ...aria
}: UserMenuProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const triggerId = useId();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useFocusReturn(open, anchorRef, menuId);
  const label = aria['aria-label'] ?? 'Account menu';

  return (
    <>
      <span ref={anchorRef} className={`inline-flex ${className}`}>
        <Button
          id={triggerId}
          iconOnly
          variant="ghost"
          size="md"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((v) => !v)}
          className="rounded-full"
        >
          <Avatar src={avatarUrl} name={name} size={28} />
        </Button>
      </span>

      <FloatingSurface
        anchorRef={anchorRef}
        open={open}
        onDismiss={close}
        placement={placement}
        id={menuId}
        className="min-w-64 rounded-card border border-border bg-surface-overlay shadow-overlay"
      >
        <div className="flex items-center gap-3 border-b border-border px-3 py-3">
          <Avatar src={avatarUrl} name={name} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text">{name}</div>
            <div className="truncate text-xs text-text-muted">{email}</div>
            {workspace !== undefined ? (
              <div className="mt-1">
                <Tag>{workspace}</Tag>
              </div>
            ) : null}
          </div>
        </div>
        <MenuList items={items} onClose={close} labelledBy={triggerId} />
      </FloatingSurface>
    </>
  );
}
