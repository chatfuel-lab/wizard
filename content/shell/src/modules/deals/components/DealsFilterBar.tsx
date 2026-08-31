import { useEffect, useRef, useState } from 'react';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import {
  Badge,
  Button,
  Checkbox,
  IconColumns,
  IconFilter,
  IconSearch,
  Input,
  Popover,
  SegmentedControl,
  Toolbar,
} from '~ui';
import { activeFilterCount, isFilterEmpty, type AttrPredicate, type DealsFilter } from '../lib/dealsFilter';
import { toggleStage } from '../lib/dealsTableStore';
import { DENSITIES, type Density } from '../lib/layout';
import { STAGES, STAGE_META } from '../lib/stages';
import { toggleHidden, type TableColumnSpec } from '../lib/tableColumns';
import { AssigneeFilter } from './AssigneeFilter';
import { AttributePredicateEditor } from './AttributePredicateEditor';

/** Long enough that a typed word is one query, short enough to feel immediate. */
const SEARCH_DEBOUNCE_MS = 300;

export interface DealsFilterBarProps {
  filter: DealsFilter;
  onFilterChange: (next: DealsFilter) => void;
  /** Held by the view, not the URL — see `adoptPredicates`. */
  predicates: AttrPredicate[];
  onPredicatesChange: (next: AttrPredicate[]) => void;
  attributeNames: readonly string[];
  density: Density;
  onDensityChange: (next: Density) => void;
  columns: readonly TableColumnSpec[];
  hidden: readonly string[];
  onHiddenChange: (next: string[]) => void;
  onClear: () => void;
}

const DENSITY_LABELS: Record<Density, string> = { comfortable: 'Comfortable', compact: 'Compact' };

/**
 * Everything that narrows the table.
 *
 * The search box is debounced and its text is held locally, because the filter
 * round-trips through the URL: pushing a keystroke straight up would write a
 * history entry per letter, and `onFilterChange` is a fresh closure on every
 * shell render, so the timer is keyed on the text alone and reads the current
 * callback from a ref. Anything else here is a direct edit — one click, one
 * new filter object, one refetch.
 *
 * Which control is disabled is decided by nothing: every one of them works on
 * both engines. What changes is the *route*, and the caveat bar says so.
 */
export function DealsFilterBar({
  filter,
  onFilterChange,
  predicates,
  onPredicatesChange,
  attributeNames,
  density,
  onDensityChange,
  columns,
  hidden,
  onHiddenChange,
  onClear,
}: DealsFilterBarProps) {
  const [text, setText] = useState(filter.q);
  const latest = useRef({ filter, onFilterChange });

  useEffect(() => {
    latest.current = { filter, onFilterChange };
  });

  // An outside change — a cleared filter, a saved view — wins over local text.
  useEffect(() => setText(filter.q), [filter.q]);

  useEffect(() => {
    if (text === latest.current.filter.q) return;
    const timer = setTimeout(() => {
      const { filter: current, onFilterChange: push } = latest.current;
      push({ ...current, q: text });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const narrowed = activeFilterCount(filter) + predicates.length;
  const stageLabel =
    filter.stages.length === 0 ? 'All stages' : filter.stages.map((stage) => STAGE_META[stage].label).join(', ');

  return (
    <Toolbar>
      {/* Uncapped while the toolbar is wrapping — below the wide band the box
          has its row to itself and should use it. From `wide` up there is room
          for a row of controls, so it stops at 18rem and leaves them some.
          Was a 768px viewport breakpoint; the module is not the viewport. */}
      <div className="relative min-w-48 flex-1 @wide:max-w-72">
        <IconSearch
          size={14}
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          /* The `/` shortcut and the palette's "Search deals" both reach this
           * through the DOM: DealsViewProps is frozen, and a fifteenth prop for
           * one focus call would unfreeze the contract three tracks build on. */
          data-deals-search
          aria-label="Search deals by name or phone"
          placeholder="Search name or phone…"
          className="pl-8"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <AssigneeFilter value={filter.assignee} onChange={(assignee) => onFilterChange({ ...filter, assignee })} />

      <Popover
        aria-label="Stages"
        trigger={(props) => (
          <Button variant="ghost" size="md" {...props}>
            <span className="max-w-40 truncate">{stageLabel}</span>
          </Button>
        )}
      >
        <div className="flex w-56 flex-col items-start gap-1.5">
          {STAGES.map((stage: SalesStageV2) => (
            <Checkbox
              key={stage}
              checked={filter.stages.length === 0 || filter.stages.includes(stage)}
              /* An empty selection renders as all six ticked, so unticking one
                 has to mean "all but this" — toggling the empty list would
                 instead narrow to the single stage the user just rejected. */
              onChange={() =>
                onFilterChange({
                  ...filter,
                  stages: toggleStage(filter.stages.length === 0 ? STAGES : filter.stages, stage, STAGES),
                })
              }
              label={STAGE_META[stage].label}
            />
          ))}
          {filter.stages.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onFilterChange({ ...filter, stages: [] })}
            >
              All stages
            </Button>
          ) : null}
        </div>
      </Popover>

      <Checkbox
        checked={filter.unreadOnly}
        onChange={(checked) => onFilterChange({ ...filter, unreadOnly: checked })}
        label="Unread"
      />

      <Popover
        aria-label="Attribute filters"
        trigger={(props) => (
          <Button variant="ghost" size="md" {...props}>
            <IconFilter size={14} />
            Attributes
            <Badge count={predicates.length} />
          </Button>
        )}
      >
        <AttributePredicateEditor
          predicates={predicates}
          onChange={onPredicatesChange}
          attributeNames={attributeNames}
        />
      </Popover>

      <div className="ml-auto flex items-center gap-2">
        {narrowed > 0 || !isFilterEmpty(filter) ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        ) : null}

        <Popover
          aria-label="Columns"
          placement="bottom-end"
          trigger={(props) => (
            <Button variant="ghost" size="sm" aria-label="Columns" {...props}>
              <IconColumns size={14} />
            </Button>
          )}
        >
          <div className="flex max-h-72 w-52 flex-col items-start gap-1.5 overflow-y-auto">
            {columns.map((column) => (
              <Checkbox
                key={column.key}
                checked={!hidden.includes(column.key)}
                onChange={() => onHiddenChange(toggleHidden(hidden, column.key))}
                label={column.label}
              />
            ))}
          </div>
        </Popover>

        <SegmentedControl
          aria-label="Row density"
          size="sm"
          value={density}
          onChange={onDensityChange}
          options={DENSITIES.map((value) => ({ value, label: DENSITY_LABELS[value] }))}
        />
      </div>
    </Toolbar>
  );
}
