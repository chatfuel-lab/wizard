import { useMemo, useState } from 'react';
import { Button, Checkbox, IconChevronDown, IconChevronUp, IconColumns, IconTrash, Input, Popover } from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import {
  DEFAULT_PREFERENCES,
  coverageNote,
  moveColumn,
  pickerEntries,
  removeAttributeColumn,
  searchPicker,
  shownColumns,
  toggleColumn,
  type ListPreferences,
} from '../../lib/tableColumns';

export interface ColumnPickerProps {
  preferences: ListPreferences;
  onChange: (next: ListPreferences) => void;
  catalog: AttributeCatalog;
}

/**
 * Which columns the table shows, in which order.
 *
 * The picker is over the whole attribute catalog rather than a curated list,
 * because on this API a "field" IS an attribute: a flow writing a value creates
 * one instantly, and there is no separate schema to consult. So the list is
 * long, the search box is the primary control, and each row says what the field
 * is and how many contacts actually carry it — a column that 3 of 4 000
 * contacts have is a column you want to know about before turning it on.
 *
 * **Reordering is up/down, not drag.** `DataTable` has no drag-reorder API in
 * this build; `lib/tableColumns.ts` exposes `reorderColumns(preferences, key,
 * index)` alongside `moveColumn` so the day one lands, this component swaps a
 * handler and nothing else moves. Up/down step through the columns that are ON
 * SCREEN, so an arrow never appears to do nothing because the neighbour it
 * swapped with is hidden.
 */
export function ColumnPicker({ preferences, onChange, catalog }: ColumnPickerProps) {
  const [query, setQuery] = useState('');

  const entries = useMemo(() => pickerEntries(preferences, catalog), [preferences, catalog]);
  const matches = useMemo(() => searchPicker(entries, query), [entries, query]);
  const visibleCount = shownColumns(preferences).length;

  return (
    <Popover
      aria-label="Columns"
      placement="bottom-end"
      className="w-80"
      trigger={(props) => (
        <Button {...props} variant="secondary" size="sm">
          <IconColumns size={14} />
          Columns
          <span className="tabular-nums text-text-muted">{visibleCount}</span>
        </Button>
      )}
    >
      <div className="flex max-h-96 flex-col">
        <div className="border-b border-border p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search fields…"
            aria-label="Search columns"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          {matches.length === 0 ? (
            <p className="p-3 text-meta text-text-muted">
              No field matches “{query}”. Every attribute on this bot is listed here — if a field is missing, nothing
              has written a value into it yet.
            </p>
          ) : null}

          {matches.map((entry) => {
            const note = coverageNote(entry);
            return (
              <div
                key={entry.key}
                className="group flex items-start gap-2 rounded-control px-2 py-1.5 hover:bg-surface-hover"
              >
                <span className="pt-0.5">
                  <Checkbox
                    checked={entry.shown}
                    disabled={!entry.canHide}
                    aria-label={entry.shown ? `Hide ${entry.label}` : `Show ${entry.label}`}
                    onChange={() => onChange(toggleColumn(preferences, entry.key))}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-text">{entry.label}</span>
                  {note === '' ? null : <span className="block truncate text-meta text-text-faint">{note}</span>}
                  {entry.canHide ? null : (
                    <span className="block text-meta text-text-faint">Always shown — it is the row's identity.</span>
                  )}
                </span>

                {entry.shown ? (
                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100">
                    <Button
                      iconOnly
                      variant="ghost"
                      size="sm"
                      aria-label={`Move ${entry.label} left`}
                      onClick={() => onChange(moveColumn(preferences, entry.key, -1))}
                    >
                      <IconChevronUp size={14} />
                    </Button>
                    <Button
                      iconOnly
                      variant="ghost"
                      size="sm"
                      aria-label={`Move ${entry.label} right`}
                      onClick={() => onChange(moveColumn(preferences, entry.key, 1))}
                    >
                      <IconChevronDown size={14} />
                    </Button>
                  </span>
                ) : null}

                {/* Only a column the user added can be forgotten outright; the
                    fixed set is hidden, never removed. */}
                {entry.removable && !entry.shown && preferences.order.includes(entry.key) ? (
                  <Button
                    iconOnly
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${entry.label} from the column list`}
                    onClick={() => onChange(removeAttributeColumn(preferences, entry.key))}
                  >
                    <IconTrash size={14} />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
          <span className="text-meta text-text-faint">
            {catalog.loading ? 'Loading fields…' : `${catalog.entries.length} fields on this bot`}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_PREFERENCES)}>
            Reset
          </Button>
        </div>
      </div>
    </Popover>
  );
}
