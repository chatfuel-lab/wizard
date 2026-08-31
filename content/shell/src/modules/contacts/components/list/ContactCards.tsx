import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { Checkbox, MenuButton, Skeleton, toggleSelection, type MenuItem } from '~ui';
import type { ContactRow } from '../../types';
import { contactName, type ColumnSpec } from '../../lib/tableColumns';
import { isRestrictedRow } from '../../lib/tableSelection';

export interface ContactCardsProps {
  rows: ContactRow[];
  /** The same specs the table uses, already narrowed for the band. */
  columns: ColumnSpec[];
  loading: boolean;
  /** The table's own cell renderer. Same specs in, same cells out. */
  cell: (spec: ColumnSpec, row: ContactRow) => ReactNode;
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  onOpen: (contactId: string) => void;
  onRowContextMenu: (row: ContactRow, event: ReactMouseEvent) => void;
  rowMenu: (row: ContactRow) => MenuItem[];
  empty: ReactNode;
}

/**
 * The same contacts, one card each, for the compact band.
 *
 * Six columns in 360px is a horizontal scroll nobody uses, so below the narrow
 * band a row becomes a card. It is built from the SAME specs the table is built
 * from, split in two: the first column still on screen is the contact's
 * identity and becomes the heading, everything after it is a labelled line.
 *
 * Deriving it is the entire rule, and the reason this component takes a
 * renderer rather than knowing any fields. A second list of what a card shows
 * is how a column comes to exist on a desktop and quietly not exist on a phone,
 * and how nobody notices for months. Turn `note` on in the column picker and it
 * appears in both places at once, because there is only one place it can come
 * from.
 *
 * **This is a module-local card list, not `~ui`'s.** `~ui` exports no
 * `DataCards` in this build — `content/ui/src/index.ts` has `DataTable` and
 * nothing beside it — and a module may not add one. The shape below is
 * deliberately the shape a generic component would take (rows, specs, a cell
 * renderer, selection, an empty slot), so the day `DataCards` lands this file
 * becomes a thin adapter rather than a rewrite.
 *
 * Two departures from the table, both forced rather than chosen:
 *
 * - **A card is not a `<button>`.** Its cells already contain buttons and
 *   selects — editing works here too — and nesting either inside a button is
 *   invalid HTML that swallows its own clicks. So it is a plain `<li>` whose
 *   click opens the record, exactly as `onRowClick` does on the table.
 * - **No shift-range.** `toggleSelection` is called with a null anchor because
 *   there is no shift key to hold. The checkbox stays, though: selection is
 *   what the bulk bar and the CSV export run on, and dropping it here would
 *   quietly make a phone read-only.
 */
export function ContactCards({
  rows,
  columns,
  loading,
  cell,
  selectedIds,
  onSelectionChange,
  onOpen,
  onRowContextMenu,
  rowMenu,
  empty,
}: ContactCardsProps) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-gutter">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="rounded-card border border-border bg-surface-raised p-3">
            <Skeleton variant="text" width="55%" />
            <div className="mt-2 flex flex-col gap-1.5">
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="40%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) return <>{empty}</>;

  const [identity, ...lines] = columns;
  const selected = new Set(selectedIds);
  const selectable = rows.filter((row) => !isRestrictedRow(row)).map((row) => row.id);

  return (
    <ul className="flex flex-col gap-2 p-gutter">
      {rows.map((row) => {
        const restricted = isRestrictedRow(row);
        return (
          <li
            key={row.id}
            onClick={restricted ? undefined : () => onOpen(row.id)}
            onContextMenu={restricted ? undefined : (event) => onRowContextMenu(row, event)}
            className={`rounded-card border p-3 transition-colors duration-fast ease-standard ${
              selected.has(row.id) ? 'border-accent bg-row-selected' : 'border-border bg-surface-raised'
            } ${restricted ? '' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-2">
              <span onClick={(event) => event.stopPropagation()} className="pt-0.5">
                <Checkbox
                  checked={selected.has(row.id)}
                  disabled={restricted}
                  aria-label={`Select ${contactName(row)}`}
                  onChange={() =>
                    onSelectionChange(
                      toggleSelection({
                        ids: selectable,
                        selected: selectedIds,
                        id: row.id,
                        anchor: null,
                        shift: false,
                      }).selected,
                    )
                  }
                />
              </span>
              <span className="min-w-0 flex-1">{identity ? cell(identity, row) : null}</span>
              {restricted ? null : (
                <span onClick={(event) => event.stopPropagation()}>
                  <MenuButton items={rowMenu(row)} label={`Actions for ${contactName(row)}`} />
                </span>
              )}
            </div>

            {/* A line whose cell renders nothing is dropped rather than left as
                a label against a blank, or half the card would be dashes. */}
            <dl className="mt-2 flex flex-col gap-1">
              {lines.map((spec) => {
                const content = cell(spec, row);
                if (content === null || content === undefined || content === false) return null;
                return (
                  <div key={spec.key} className="flex items-baseline gap-2">
                    <dt className="w-24 shrink-0 text-meta text-text-faint">{spec.header}</dt>
                    <dd className="min-w-0 flex-1 text-body">{content}</dd>
                  </div>
                );
              })}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
