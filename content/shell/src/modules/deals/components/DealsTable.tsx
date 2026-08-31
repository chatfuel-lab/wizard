import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import {
  Avatar,
  Badge,
  Checkbox,
  DataTable,
  IconLock,
  Select,
  Skeleton,
  Tag,
  shortTime,
  toggleSelection,
  useBand,
  type DataTableColumn,
  type DataTableDensity,
  type SortState,
} from '~ui';
import type { DealFieldBindings } from '../lib/dealFieldBinding';
import { attributeMap } from '../lib/dealFieldValue';
import type { Density } from '../lib/layout';
import { platformOf } from '../lib/platforms';
import { STAGES, STAGE_META } from '../lib/stages';
import {
  assigneeLabel,
  cardLayout,
  contactName,
  fieldCell,
  isSortable,
  type CardLayout,
  type TableColumnSpec,
} from '../lib/tableColumns';
import { isRestrictedRow } from '../lib/tableSelection';
import type { DealsTableRow } from '../types';

export interface DealsTableProps {
  rows: DealsTableRow[];
  columns: readonly TableColumnSpec[];
  hidden: readonly string[];
  bindings: DealFieldBindings;
  density: Density;
  sort: SortState | null;
  onSortChange: (next: SortState | null) => void;
  loading: boolean;
  canEdit: boolean;
  onOpen: (contactId: string) => void;
  /**
   * One row's inline stage change. The cell is a per-row control showing that
   * row's own value, so it never acts on the selection — the context menu and
   * the ActionBar are the bulk paths, and both say how many they cover.
   */
  onStage: (row: DealsTableRow, to: SalesStageV2) => void;
  /** Selected ids and their setter — passing both is what turns selection on. */
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  /** Right-click on a row. The view owns one shared menu; this reports the point. */
  onRowContextMenu: (row: DealsTableRow, event: ReactMouseEvent) => void;
  /** Interactive column widths, in px. Without the setter the handles do not render. */
  widths: Readonly<Record<string, number>>;
  onWidthsChange: (next: Record<string, number>) => void;
  empty: ReactNode;
}

/** The module's two densities onto DataTable's three. */
const DENSITY: Record<Density, DataTableDensity> = {
  compact: 'compact',
  comfortable: 'cozy',
};

/** WhatsApp is the only typename carrying one, and the server searches it. */
const phoneOf = (row: DealsTableRow): string | undefined => ('phone' in row ? row.phone : undefined);

/**
 * `attributeMap` walks the row's attribute list, and seven field columns would
 * otherwise walk it seven times per row on every render. Keyed on the array
 * itself, so a row replaced by a live update rebuilds and a row that did not
 * change does not.
 */
const attributeCache = new WeakMap<object, Record<string, string>>();

function valuesOf(row: DealsTableRow): Record<string, string> {
  const key = row.attributes as unknown as object;
  const cached = attributeCache.get(key);
  if (cached) return cached;
  const values = attributeMap(row.attributes);
  attributeCache.set(key, values);
  return values;
}

/**
 * The rows. Column *definitions* are data (`lib/tableColumns.ts`); this file
 * only decides what a cell looks like.
 *
 * The name cell is a real `<button>` rather than relying on the row's click
 * handler: a `<tr onClick>` is reachable with a mouse and nothing else, and
 * "open the deal" is the primary action of the whole view. The row click stays
 * on as a convenience for the mouse.
 *
 * Selection and row navigation are `DataTable`'s, not this file's: passing
 * `selectedIds` + `onSelectionChange` is what renders the checkbox column, and
 * shift-range and the header's tri-state come from `toggleSelection` and
 * `headerCheckboxState` in `~ui`. The one shared `ContextMenu` is mounted by
 * the view — a table cannot wrap its own rows, which is why controlled mode
 * exists — and this component only forwards the point.
 *
 * There is deliberately **no virtualization** — the auto-page cap in
 * `dealsTableStore.ts` bounds the row count instead, which keeps find-in-page,
 * Ctrl+F and the browser's own scroll anchoring working. If that trade ever
 * stops paying, the cap is the number to look at first.
 */
export function DealsTable({
  rows,
  columns,
  hidden,
  bindings,
  density,
  sort,
  onSortChange,
  loading,
  canEdit,
  onOpen,
  onStage,
  selectedIds,
  onSelectionChange,
  onRowContextMenu,
  widths,
  onWidthsChange,
  empty,
}: DealsTableProps) {
  /* Before anything conditional — a hook cannot sit behind a branch. Safe to
   * read here: DealsApp renders the ModuleRoot and this is far below it. */
  const band = useBand();
  const currencyName = bindings.currency.name;

  const render = (spec: TableColumnSpec): ((row: DealsTableRow) => ReactNode) => {
    switch (spec.kind) {
      case 'contact':
        return (row) =>
          isRestrictedRow(row) ? (
            <span className="flex items-center gap-2 text-text-faint">
              <IconLock size={14} />
              Restricted contact
            </span>
          ) : (
            <span className="flex items-center gap-2.5">
              <Avatar src={row.profilePictureUrl ?? undefined} name={contactName(row)} size={26} />
              <button
                type="button"
                title={phoneOf(row)}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(row.id);
                }}
                className="min-w-0 flex-1 truncate rounded text-left font-medium focus-visible:focus-ring"
              >
                {contactName(row)}
              </button>
            </span>
          );

      case 'stage':
        return (row) => {
          const stage = row.salesStageV2;
          if (!canEdit || isRestrictedRow(row)) {
            return stage ? <Tag tone={STAGE_META[stage].tone}>{STAGE_META[stage].label}</Tag> : null;
          }
          return (
            /* The cell owns the click: the row's own handler would open the
               panel the moment the select is touched. */
            <span onClick={(event) => event.stopPropagation()}>
              <Select
                aria-label={`Stage of ${contactName(row)}`}
                value={stage ?? ''}
                placeholder={stage ? undefined : 'No stage'}
                onChange={(value) => onStage(row, value as SalesStageV2)}
                options={STAGES.map((each) => ({ value: each, label: STAGE_META[each].label }))}
                className="h-7 w-full text-xs"
              />
            </span>
          );
        };

      case 'assignee':
        return (row) => <span className="text-text-muted">{assigneeLabel(row)}</span>;

      case 'lastMessage':
        return (row) => <span className="text-text-muted">{shortTime(row.lastConversationMessageTime)}</span>;

      case 'platform':
        return (row) => {
          const platform = platformOf(row.__typename);
          return <Tag tone={platform.tone}>{platform.label}</Tag>;
        };

      case 'unread':
        return (row) => <Badge count={row.unreadMessagesCount} />;

      /* `null` rather than an empty span, here and below. It is identical inside
         a `<td>`, and it is what lets the card mode drop a line that has nothing
         to say instead of printing "Amount" against a blank. */
      case 'note':
        return (row) => (row.note ? <span className="text-text-muted">{row.note}</span> : null);

      default: {
        return (row) => {
          const cell = fieldCell(spec, valuesOf(row), currencyName);
          if (cell.text === '') return null;
          return (
            <span title={cell.title} className={cell.title ? 'text-text-faint' : undefined}>
              {cell.text}
            </span>
          );
        };
      }
    }
  };

  if (band === 'compact') {
    return (
      <DealCards
        {...cardLayout(columns, hidden)}
        render={render}
        rows={rows}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        onOpen={onOpen}
        onRowContextMenu={onRowContextMenu}
        empty={empty}
      />
    );
  }

  const tableColumns: DataTableColumn<DealsTableRow>[] = columns.map((spec) => ({
    key: spec.key,
    header: spec.label,
    width: spec.width,
    align: spec.align,
    sortable: isSortable(spec),
    resizable: true,
    minWidth: 72,
    /* The stage cell holds a control; nowrap would clip it. */
    wrap: spec.kind === 'stage',
    render: render(spec),
  }));

  return (
    <DataTable<DealsTableRow>
      stickyHeader
      density={DENSITY[density]}
      columns={tableColumns}
      hiddenColumns={hidden}
      rows={rows}
      rowKey={(row) => row.id}
      columnWidths={widths}
      onColumnWidthsChange={onWidthsChange}
      loading={loading}
      skeletonRows={8}
      sort={sort}
      onSortChange={onSortChange}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      /* Restricted contacts are excluded from `selectableIds` inside DataTable,
         so the header's tri-state box and shift-range both skip them without
         this file knowing anything about ranges. */
      isRowDisabled={isRestrictedRow}
      rowNavigation
      onRowContextMenu={onRowContextMenu}
      onRowClick={(row) => onOpen(row.id)}
      caption="Deals, most recent conversation first. Arrow keys move between rows, Enter opens, Space selects."
      empty={empty}
    />
  );
}

interface DealCardsProps extends CardLayout {
  /** The table's own cell renderer. Same specs in, same cells out. */
  render: (spec: TableColumnSpec) => (row: DealsTableRow) => ReactNode;
  rows: DealsTableRow[];
  loading: boolean;
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  onOpen: (contactId: string) => void;
  onRowContextMenu: (row: DealsTableRow, event: ReactMouseEvent) => void;
  empty: ReactNode;
}

/**
 * The same deals, one card each, for the compact band — the shape given to
 * `ContactsTable` and `MembersTable`, third of three.
 *
 * `cardLayout` decides *which* columns; this decides what a card looks like.
 * Every cell comes out of the table's own `render`, so a card can never show a
 * differently-formatted amount or a stage the table would have drawn another
 * way — there is one renderer and one column list. A line whose cell renders
 * nothing is dropped rather than left as an empty label, or half the card would
 * be dashes.
 *
 * Two places it departs from the other two, both forced rather than chosen:
 *
 * - **The card is not a `<button>`.** Contacts' is, because none of its cells
 *   are interactive. Here the deal cell already *is* a `<button>` and the stage
 *   cell already *is* a `<Select>`, and nesting either inside a button is
 *   invalid HTML that swallows its own clicks. So the card is a plain `<li>`
 *   whose click opens the deal for the mouse, exactly as `onRowClick` does on
 *   the table, while the name button stays the keyboard-reachable route.
 * - **It keeps the checkbox.** Selection is what the ActionBar's bulk stage
 *   moves and the CSV export run on, and it is the only one of those paths that
 *   survives without a keyboard. Dropping it here would quietly make a phone
 *   read-only. No shift-range: `toggleSelection` is called with a null anchor
 *   because there is no shift key to hold.
 */
function DealCards({
  identity,
  lines,
  render,
  rows,
  loading,
  selectedIds,
  onSelectionChange,
  onOpen,
  onRowContextMenu,
  empty,
}: DealCardsProps) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-gutter">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} variant="block" height="5.5rem" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <>{empty}</>;

  /* Restricted contacts are excluded here for the same reason `DataTable` keeps
     them out of its own `selectableIds`: they can never be acted on. */
  const selectableIds = rows.filter((row) => !isRestrictedRow(row)).map((row) => row.id);

  return (
    <ul className="flex flex-col gap-2 p-gutter">
      {rows.map((row) => {
        const restricted = isRestrictedRow(row);
        const cells = lines
          .map((spec) => ({ spec, value: render(spec)(row) }))
          .filter((line) => line.value !== null && line.value !== undefined && line.value !== '');

        return (
          <li
            key={row.id}
            onClick={restricted ? undefined : () => onOpen(row.id)}
            onContextMenu={restricted ? undefined : (event) => onRowContextMenu(row, event)}
            className={`rounded-card border p-3 transition-colors duration-fast ease-standard ${
              selectedIds.includes(row.id) ? 'border-accent bg-row-selected' : 'border-border bg-surface-raised'
            } ${restricted ? 'opacity-60' : 'cursor-pointer hover:bg-surface-hover'}`}
          >
            <div className="flex items-center gap-2.5">
              {restricted ? null : (
                <span onClick={(event) => event.stopPropagation()} className="flex shrink-0 items-center">
                  <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onChange={() =>
                      onSelectionChange(
                        toggleSelection({
                          ids: selectableIds,
                          selected: selectedIds,
                          id: row.id,
                          anchor: null,
                        }).selected,
                      )
                    }
                    aria-label={`Select ${contactName(row)}`}
                  />
                </span>
              )}
              <span className="min-w-0 flex-1">{identity ? render(identity)(row) : null}</span>
            </div>

            {cells.length > 0 ? (
              <dl className="mt-3 flex flex-col gap-1.5">
                {/* `items-center`, not Contacts' `items-baseline`: the stage
                    line holds a <Select>, and a baseline drops a control's box
                    half a line below its own label. */}
                {cells.map(({ spec, value }) => (
                  <div key={spec.key} className="flex items-center gap-2">
                    <dt className="w-24 shrink-0 text-xs text-text-muted">{spec.label}</dt>
                    <dd className="min-w-0 flex-1 text-sm text-text">{value}</dd>
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
