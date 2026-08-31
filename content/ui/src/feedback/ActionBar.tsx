import { IconClose } from '../icons';
import { type MenuItem } from '../floating/DropdownMenu';
import { Button } from '../primitives/Button';
import { Kbd } from '../primitives/Kbd';

export interface ActionBarProps {
  count: number;
  /** What is selected. Defaults to deal / deals. */
  noun?: { one: string; many: string };
  /** Reuses MenuItem, so the same array can drive this and a context menu. */
  actions: readonly MenuItem[];
  onClear: () => void;
  className?: string;
}

/**
 * The bulk bar: what N selected records can be done to.
 *
 * **Deliberately not portalled**, unlike the toast stack. An embed occupies one
 * panel of somebody else's page, and a `position: fixed` bar hung off the body
 * would stretch across the host's whole viewport with the host's own content
 * under it. This renders inside the module, so it is bounded by the module —
 * which means the container it is placed in must be `relative`.
 *
 * It sits at `z-rail` (20): above a sticky table header (10), below every
 * dropdown, drag layer and overlay, so a menu opened FROM the bar is never
 * clipped by it.
 */
export function ActionBar({
  count,
  noun = { one: 'deal', many: 'deals' },
  actions,
  onClear,
  className = '',
}: ActionBarProps) {
  if (count === 0) return null;

  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-4 z-rail flex justify-center px-4 ${className}`}>
      <div
        role="toolbar"
        aria-label={`${count} selected`}
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-card border border-border bg-surface-overlay px-2 py-1.5 shadow-overlay animate-slide-in-bottom"
      >
        <span className="shrink-0 whitespace-nowrap px-1.5 text-sm font-medium tabular-nums">
          {count} {count === 1 ? noun.one : noun.many}
        </span>

        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />

        {actions.map((action) => {
          if (action.kind === 'separator') {
            return <span key={action.id} aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />;
          }
          /* A group label has nowhere to go on one horizontal row. */
          if (action.kind === 'label') return null;

          return (
            <button
              key={action.id}
              type="button"
              disabled={action.disabled}
              onClick={action.onSelect}
              className={`inline-flex h-field-sm shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-2 text-sm transition-colors duration-fast ease-standard focus-visible:focus-ring disabled:cursor-not-allowed disabled:text-text-faint ${
                action.tone === 'danger' ? 'text-danger hover:bg-danger-soft' : 'text-text hover:bg-surface-hover'
              }`}
            >
              {action.icon !== undefined ? <span className="shrink-0 text-text-muted">{action.icon}</span> : null}
              {action.label}
              {action.shortcut ? <Kbd keys={action.shortcut} className="shrink-0" /> : null}
            </button>
          );
        })}

        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />

        <Button iconOnly variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
          <IconClose />
        </Button>
      </div>
    </div>
  );
}
