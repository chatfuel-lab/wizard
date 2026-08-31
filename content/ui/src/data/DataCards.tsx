import type { ReactNode } from 'react';
import type { DataTableColumn } from './DataTable';

export interface DataCardsProps<T> {
  /** The SAME column set the DataTable renders — that is the whole point. */
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Rendered when rows is empty. */
  empty?: ReactNode;
  className?: string;
}

const isControl = <T,>(column: DataTableColumn<T>): boolean =>
  column.header === '' || column.header === null || column.header === undefined;

const isBlank = (value: ReactNode): boolean => value === null || value === undefined || value === '' || value === false;

/** Same fallback as DataTable's cell: `render`, else the row's field by key. */
const cellOf = <T,>(column: DataTableColumn<T>, row: T): ReactNode =>
  column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '');

/**
 * A DataTable's rows as a stack of cards, for the compact band.
 *
 * It renders from the table's own `DataTableColumn[]` rather than a second
 * hand-written list of fields, because a card layout that drifts from the
 * table is how a column silently goes missing on phones. The rules:
 *
 * - The first column is the record's identity and becomes the card heading.
 * - A column with no header is a control (a Remove button, a `⋯` menu) — it
 *   has nothing to label a line with — and sits top-right beside the heading.
 * - Every other column is a `header → cell` line, skipped when the cell
 *   renders nothing, so an empty "Warnings —" does not pad every card.
 *
 * `sortable`, `resizable`, `width` and `align` are table concerns and are
 * ignored here; `wrap` is moot because a card line always wraps.
 */
export function DataCards<T>({ columns, rows, rowKey, empty, className = '' }: DataCardsProps<T>) {
  if (rows.length === 0) return empty === undefined ? null : <>{empty}</>;

  const [identity, ...rest] = columns;
  const lines = rest.filter((column) => !isControl(column));
  const controls = rest.filter(isControl);

  return (
    <ul className={`flex flex-col gap-2 ${className}`}>
      {rows.map((row) => {
        const heading = identity === undefined ? null : cellOf(identity, row);
        const actions = controls
          .map((column) => ({ column, value: cellOf(column, row) }))
          .filter(({ value }) => !isBlank(value));
        const details = lines
          .map((column) => ({ column, value: cellOf(column, row) }))
          .filter(({ value }) => !isBlank(value));

        return (
          <li key={rowKey(row)} className="rounded-card border border-border bg-surface-raised p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 text-sm text-text">{heading}</div>
              {actions.length > 0 ? (
                <div className="flex shrink-0 items-center gap-1">
                  {actions.map(({ column, value }) => (
                    <span key={column.key}>{value}</span>
                  ))}
                </div>
              ) : null}
            </div>
            {details.length > 0 ? (
              <dl className="mt-3 flex flex-col gap-2">
                {details.map(({ column, value }) => (
                  <div key={column.key}>
                    <dt className="text-xs text-text-muted">{column.header}</dt>
                    <dd className={`mt-0.5 text-sm text-text ${column.align === 'end' ? 'tabular-nums' : ''}`}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
