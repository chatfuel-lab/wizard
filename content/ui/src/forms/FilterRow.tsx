import type { ReactNode } from 'react';
import { IconClose } from '../icons';
import { Button } from '../primitives/Button';

export interface FilterRowProps {
  /** Which attribute. Usually a Combobox. */
  field: ReactNode;
  /** How to compare. Usually a Select. */
  operator: ReactNode;
  /**
   * What to compare against. Omitted on purpose for the operators that take
   * nothing — "is set", "is empty" — where an empty box would look broken.
   */
  value?: ReactNode;
  /** Leading slot: the AND/OR conjunction, a group depth marker, a drag grip. */
  badge?: ReactNode;
  /** Trailing slot before the remove button: a warning glyph, a match count. */
  meta?: ReactNode;
  onRemove?: () => void;
  /** Names what is being removed — "Remove city condition". */
  removeLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * The layout shell of one filter condition. Layout only — it knows nothing
 * about operators, types or what a valid condition is.
 *
 * That separation is the point. A filter builder that owns both its layout and
 * its semantics ends up re-implementing the row for every place a condition can
 * appear (the popover, the saved-view editor, the segment preview), and the
 * three drift. Here the row is one component and the meaning is somebody
 * else's pure module.
 *
 * Wrapping is intrinsic — `flex-wrap` over three flexible slots with real
 * bases — rather than a breakpoint. A filter row appears in a 900px panel and
 * in a 320px popover, and neither of those is the viewport; a container query
 * would need the row to declare a container it may not own.
 *
 * The value slot gets twice the basis of the operator: operators are a short
 * closed vocabulary ("is", "contains", "is before") and values are arbitrary
 * user text, so an equal split wastes the half that is always short.
 */
export function FilterRow({
  field,
  operator,
  value,
  badge,
  meta,
  onRemove,
  removeLabel = 'Remove condition',
  disabled = false,
  className = '',
}: FilterRowProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${disabled ? 'opacity-60' : ''} ${className}`}>
      {badge !== undefined ? <div className="shrink-0">{badge}</div> : null}

      <div className="min-w-0 flex-1 basis-40">{field}</div>
      <div className="min-w-0 flex-1 basis-28">{operator}</div>
      {value !== undefined ? <div className="min-w-0 flex-1 basis-56">{value}</div> : null}

      {meta !== undefined ? <div className="shrink-0">{meta}</div> : null}

      {onRemove !== undefined ? (
        <Button
          iconOnly
          size="sm"
          variant="ghost"
          aria-label={removeLabel}
          disabled={disabled}
          onClick={onRemove}
          /* Pushed to the end of the last line rather than pinned to the row:
             once the slots wrap, a remove button hard against the right edge
             sits opposite nothing and reads as belonging to the row below. */
          className="ml-auto shrink-0"
        >
          <IconClose />
        </Button>
      ) : null}
    </div>
  );
}
