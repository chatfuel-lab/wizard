import { useEffect, useRef, type ReactNode } from 'react';
import { useRovingFocus } from '../../hooks/useRovingFocus';
import { seekEnabled } from '../../lib/interaction/roving';
import { Kbd } from '../../primitives/Kbd';

export interface MenuAction {
  kind?: 'item';
  id: string;
  label: string;
  icon?: ReactNode;
  /** Key names for Kbd — display only, the menu does not bind them. */
  shortcut?: readonly string[];
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Renders a check mark. For a menu that reflects state rather than fires. */
  checked?: boolean;
  onSelect: () => void;
}

export type MenuItem = MenuAction | { kind: 'separator'; id: string } | { kind: 'label'; id: string; label: string };

export const isMenuAction = (item: MenuItem): item is MenuAction => item.kind === undefined || item.kind === 'item';

const ITEM_CLASSES =
  'flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm transition-colors duration-instant ease-standard focus-visible:focus-ring';

/**
 * The body of every menu: DropdownMenu's and ContextMenu's alike.
 *
 * It lives under internal/ rather than beside them because it is not a surface —
 * it has no positioning, no dismissal and no layer of its own, and shipping it
 * as a public export would invite a fourth menu that re-solves those.
 *
 * It is also a separate component from its surface so its mount effect fires
 * when the items actually exist. The surface holds children back for one tick
 * while presence flips to `entering`; an effect in the parent would run against
 * an empty ref array and focus nothing.
 */
export function MenuList({
  items,
  onClose,
  labelledBy,
  initialEdge = 'first',
}: {
  items: readonly MenuItem[];
  onClose: () => void;
  labelledBy: string | undefined;
  /** Which end to arm on open. ArrowUp opens a menu at its last item (APG). */
  initialEdge?: 'first' | 'last';
}) {
  /* Separators, group labels and disabled entries are skipped by every arrow
   * key and by type-ahead, so indexes here are indexes into the FULL list. */
  const disabled = items.flatMap((item, index) => (!isMenuAction(item) || item.disabled ? [index] : []));
  const labels = items.map((item) => (isMenuAction(item) || item.kind === 'label' ? item.label : ''));

  const roving = useRovingFocus(items.length, { disabled, labels, orientation: 'vertical' });
  const { setActiveIndex } = roving;

  /* Mount only — the empty dep array is the point, not an oversight. Re-running
   * this when `items` changes would yank focus back to the top every time a
   * live update reordered the menu under the user's arrow keys. */
  const firstEnabledRef = useRef(
    initialEdge === 'last'
      ? seekEnabled(items.length, items.length - 1, -1, { disabled, loop: false })
      : seekEnabled(items.length, 0, 1, { disabled, loop: false }),
  );
  useEffect(() => {
    if (firstEnabledRef.current !== -1) setActiveIndex(firstEnabledRef.current);
  }, [setActiveIndex]);

  return (
    <div role="menu" aria-labelledby={labelledBy} onKeyDown={roving.onKeyDown} className="min-w-48 p-1">
      {items.map((item, index) => {
        if (item.kind === 'separator') {
          return <div key={item.id} role="separator" className="-mx-1 my-1 h-px bg-border" />;
        }
        if (item.kind === 'label') {
          return (
            <div
              key={item.id}
              className="px-2 pb-1 pt-1.5 text-micro font-medium uppercase tracking-wide text-text-faint"
            >
              {item.label}
            </div>
          );
        }

        const { tabIndex, ref } = roving.itemProps(index);
        return (
          <button
            key={item.id}
            ref={ref}
            type="button"
            role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
            aria-checked={item.checked}
            disabled={item.disabled}
            tabIndex={tabIndex}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
            className={`${ITEM_CLASSES} ${
              item.disabled
                ? 'cursor-not-allowed text-text-faint'
                : item.tone === 'danger'
                  ? 'text-danger hover:bg-danger-soft'
                  : 'text-text hover:bg-surface-hover'
            }`}
          >
            {item.icon !== undefined ? <span className="shrink-0 text-text-muted">{item.icon}</span> : null}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.checked ? <span className="shrink-0 text-accent">✓</span> : null}
            {item.shortcut ? <Kbd keys={item.shortcut} className="shrink-0" /> : null}
          </button>
        );
      })}
    </div>
  );
}
