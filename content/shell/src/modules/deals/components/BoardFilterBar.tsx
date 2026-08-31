import { Button, SegmentedControl, Toolbar } from '~ui';
import type { DealsFilter } from '../lib/dealsFilter';
import { AssigneeFilter } from './AssigneeFilter';
import { DENSITIES, isNarrow, type Band, type Density } from '../lib/layout';

const DENSITY_LABELS: Record<Density, string> = {
  comfortable: 'Comfortable',
  compact: 'Compact',
};

export interface BoardFilterBarProps {
  filter: DealsFilter;
  onFilterChange: (next: DealsFilter) => void;
  density: Density;
  onDensityChange: (next: Density) => void;
  band: Band;
  collapsedCount: number;
  onExpandAll: () => void;
  selectedCount: number;
  onClearSelection: () => void;
}

/**
 * The board's own filter row.
 *
 * Deliberately only assignee: `contactDealsConnection` takes no text filter, no
 * stage subset and no attribute predicate, so offering any of those here would
 * be a control that silently does nothing. The full filter bar belongs to the
 * table, which is built on a query that can honour it.
 */
export function BoardFilterBar({
  filter,
  onFilterChange,
  density,
  onDensityChange,
  band,
  collapsedCount,
  onExpandAll,
  selectedCount,
  onClearSelection,
}: BoardFilterBarProps) {
  return (
    <Toolbar>
      <AssigneeFilter
        value={filter.assignee}
        onChange={(assignee) => onFilterChange({ ...filter, assignee })}
        className="h-field-sm text-xs"
      />

      {collapsedCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={onExpandAll}>
          Expand {collapsedCount} column{collapsedCount === 1 ? '' : 's'}
        </Button>
      ) : null}

      {selectedCount > 0 ? (
        <span className="text-xs text-text-muted">
          {selectedCount} selected
          <button
            type="button"
            onClick={onClearSelection}
            className="focus-visible:focus-ring ml-2 rounded underline decoration-dotted"
          >
            clear
          </button>
        </span>
      ) : null}

      <div className="ml-auto">
        {/* Density is forced to compact below the board minimum, so the control
            would be a lie there. */}
        {isNarrow(band) ? null : (
          <SegmentedControl
            aria-label="Card density"
            size="sm"
            value={density}
            onChange={onDensityChange}
            options={DENSITIES.map((value) => ({ value, label: DENSITY_LABELS[value] }))}
          />
        )}
      </div>
    </Toolbar>
  );
}
