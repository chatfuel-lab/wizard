import { useMemo, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import {
  Avatar,
  Checkbox,
  DataTable,
  IconCalendar,
  Skeleton,
  Tag,
  toggleSelection,
  type DataTableColumn,
  type DataTableDensity,
  type SortState,
} from '~ui';
import {
  APPOINTMENT_COLUMNS,
  customerCell,
  durationCell,
  priceCell,
  serviceCell,
  specialistCell,
  statusCell,
  timeCell,
  type FormatOptions,
} from '../../lib/appointmentsColumns';
import type { AppointmentsSortKey } from '../../lib/bookingsParams';
import type { Density } from '../../lib/layout';
import type { BookingRecord } from '../../types';

export interface AppointmentsTableProps {
  rows: BookingRecord[];
  hidden: readonly AppointmentsSortKey[];
  /** Compact band: a card list instead of the table (see `AppointmentCards`). */
  cards: boolean;
  density: Density;
  /** The display zone — every wall clock in the table is this zone's. */
  zone: string;
  format: FormatOptions;
  sort: SortState;
  onSortChange: (next: SortState | null) => void;
  loading: boolean;
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  onOpen: (id: string) => void;
  onRowContextMenu: (row: BookingRecord, event: ReactMouseEvent) => void;
  /** Ids that just rolled back — the row flashes once (`rangeStore.flash`). */
  flashing: Readonly<Record<string, number>>;
  empty: ReactNode;
}

/** The module's two densities onto DataTable's three. */
const DENSITY: Record<Density, DataTableDensity> = { compact: 'compact', comfortable: 'cozy' };

/**
 * The rows. Column definitions and cell contents are `lib/appointmentsColumns.ts`
 * (tested); this file decides what a cell looks like.
 *
 * The customer name is a real `<button>` as well as the row being clickable:
 * a `<tr onClick>` is reachable by mouse only, and "open the booking" is the
 * primary action of the list. Selection, shift-range and the header's
 * tri-state come from `DataTable`; the one shared `ContextMenu` is mounted by
 * the view (a table cannot wrap its own rows), and this only forwards the
 * point. Every row is actionable — there is no restricted booking — so
 * `isRowDisabled` is not passed.
 */
export function AppointmentsTable({
  rows,
  hidden,
  cards,
  density,
  zone,
  format,
  sort,
  onSortChange,
  loading,
  selectedIds,
  onSelectionChange,
  onOpen,
  onRowContextMenu,
  flashing,
  empty,
}: AppointmentsTableProps) {
  const compact = density === 'compact';

  const columns = useMemo<DataTableColumn<BookingRecord>[]>(() => {
    const render = (key: AppointmentsSortKey): ((row: BookingRecord) => ReactNode) => {
      switch (key) {
        case 'start':
          return (row) => {
            const t = timeCell(row, zone, format);
            const flash = row.id in flashing;
            /* Two lines in both densities: the range is what the row is for,
               and one line of "Mon, Aug 17 · 10:00 AM – 10:30 AM" truncates
               at every width a table gets. Compact rows grow by a few px. */
            return (
              <span className={`flex flex-col ${compact ? 'leading-tight' : ''} ${flash ? 'text-danger' : ''}`}>
                <span className="truncate font-medium">{t.day}</span>
                <span className="truncate text-xs tabular-nums text-text-muted">{t.range}</span>
              </span>
            );
          };
        case 'customer':
          return (row) => {
            const c = customerCell(row);
            const placeholder = c.kind === 'walkin' || c.kind === 'gcal';
            return (
              <span className="flex min-w-0 items-center gap-2.5">
                {compact ? null : c.kind === 'gcal' ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-muted">
                    <IconCalendar size={14} />
                  </span>
                ) : (
                  <Avatar src={c.avatar ?? undefined} name={c.name} size={24} />
                )}
                <span className="flex min-w-0 flex-col">
                  <button
                    type="button"
                    title={c.detail ?? undefined}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(row.id);
                    }}
                    className={`min-w-0 truncate rounded text-left focus-visible:focus-ring ${placeholder ? 'text-text-muted' : 'font-medium'}`}
                  >
                    {c.name}
                  </button>
                  {!compact && c.detail ? (
                    <span className="truncate text-xs tabular-nums text-text-muted">{c.detail}</span>
                  ) : null}
                </span>
              </span>
            );
          };
        case 'service':
          return (row) => {
            const s = serviceCell(row);
            if (!s) return <span className="text-text-faint">No service</span>;
            return s.deleted ? (
              <span
                className="text-text-muted"
                title="This service was deleted from the catalog; the booking keeps its name and price"
              >
                Deleted · {s.title}
              </span>
            ) : (
              <span>{s.title}</span>
            );
          };
        case 'specialist':
          return (row) => {
            const s = specialistCell(row);
            if (!s) return <span className="text-text-faint">Unassigned</span>;
            return (
              <span className="flex min-w-0 items-center gap-2">
                {compact || s.deleted ? null : <Avatar src={s.avatar ?? undefined} name={s.name} size={20} />}
                <span
                  className={`truncate ${s.deleted ? 'text-text-muted' : ''}`}
                  title={s.deleted ? 'This specialist was deleted' : undefined}
                >
                  {s.deleted ? `Deleted · ${s.name}` : s.name}
                </span>
              </span>
            );
          };
        case 'status':
          return (row) => {
            const meta = statusCell(row);
            return <Tag tone={meta.tone}>{meta.label}</Tag>;
          };
        case 'duration':
          return (row) => <span className="tabular-nums text-text-muted">{durationCell(row).label}</span>;
        case 'price':
          return (row) => {
            const p = priceCell(row, format.locale);
            return p ? <span className="tabular-nums">{p.label}</span> : <span className="text-text-faint">—</span>;
          };
      }
    };
    return APPOINTMENT_COLUMNS.map((spec) => ({
      key: spec.key,
      header: spec.label,
      width: spec.width,
      align: spec.align,
      sortable: spec.sortable,
      resizable: true,
      minWidth: 72,
      render: render(spec.key),
    }));
  }, [compact, zone, format, flashing, onOpen]);

  if (cards) {
    return (
      <AppointmentCards
        rows={rows}
        zone={zone}
        format={format}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        onOpen={onOpen}
        onRowContextMenu={onRowContextMenu}
        flashing={flashing}
        empty={empty}
      />
    );
  }

  return (
    <DataTable<BookingRecord>
      stickyHeader
      density={DENSITY[density]}
      columns={columns}
      hiddenColumns={hidden}
      rows={rows}
      rowKey={(row) => row.id}
      loading={loading}
      skeletonRows={8}
      sort={sort}
      onSortChange={onSortChange}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      rowNavigation
      onRowContextMenu={onRowContextMenu}
      onRowClick={(row) => onOpen(row.id)}
      caption="Appointments in the loaded range. Arrow keys move between rows, Enter opens, Space selects."
      empty={empty}
    />
  );
}

interface AppointmentCardsProps {
  rows: BookingRecord[];
  zone: string;
  format: FormatOptions;
  loading: boolean;
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  onOpen: (id: string) => void;
  onRowContextMenu: (row: BookingRecord, event: ReactMouseEvent) => void;
  flashing: Readonly<Record<string, number>>;
  empty: ReactNode;
}

/**
 * The same appointments, one card each, for the compact band. A 360px module
 * cannot hold four table columns without a horizontal scroll that hides the
 * time range — the one thing a phone reader came for — so below `compact` the
 * list is cards: when · customer · service · status, checkbox kept (the bulk
 * bar and the CSV export run on the selection, and that is the only one of
 * those paths that survives without a keyboard). The card is a plain `<li>`
 * whose click opens — the name is already a `<button>`, and nesting buttons
 * is invalid HTML.
 */
function AppointmentCards({
  rows,
  zone,
  format,
  loading,
  selectedIds,
  onSelectionChange,
  onOpen,
  onRowContextMenu,
  flashing,
  empty,
}: AppointmentCardsProps) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-gutter" aria-busy>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} variant="block" height="4.5rem" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <>{empty}</>;
  const ids = rows.map((row) => row.id);
  return (
    <ul className="flex flex-col gap-2 p-gutter" aria-label="Appointments">
      {rows.map((row) => {
        const t = timeCell(row, zone, format);
        const c = customerCell(row);
        const s = serviceCell(row);
        const sp = specialistCell(row);
        const meta = statusCell(row);
        const selected = selectedIds.includes(row.id);
        const flash = row.id in flashing;
        return (
          <li
            key={row.id}
            onClick={() => onOpen(row.id)}
            onContextMenu={(event) => onRowContextMenu(row, event)}
            className={`cursor-pointer rounded-card border p-3 transition-colors duration-fast ease-standard hover:bg-surface-hover ${
              selected ? 'border-accent bg-row-selected' : 'border-border bg-surface-raised'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span onClick={(event) => event.stopPropagation()} className="flex shrink-0 items-center pt-0.5">
                <Checkbox
                  checked={selected}
                  onChange={() =>
                    onSelectionChange(
                      toggleSelection({ ids, selected: selectedIds, id: row.id, anchor: null }).selected,
                    )
                  }
                  aria-label={`Select ${c.name}`}
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {/* The time gets the whole first line — it is what the card is
                    for; the status sits beside the name, where a truncation
                    costs a phone digit rather than the end of the range. */}
                <span className={`text-xs tabular-nums ${flash ? 'text-danger' : 'text-text-muted'}`}>
                  <span className="font-medium text-text">{t.day}</span> · {t.range}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(row.id);
                    }}
                    className={`min-w-0 truncate rounded text-left text-sm focus-visible:focus-ring ${c.kind === 'walkin' || c.kind === 'gcal' ? 'text-text-muted' : 'font-medium text-text'}`}
                  >
                    {c.name}
                    {c.detail ? <span className="font-normal text-text-muted"> · {c.detail}</span> : null}
                  </button>
                  <Tag tone={meta.tone}>{meta.label}</Tag>
                </span>
                <span className="truncate text-xs text-text-muted">
                  {s ? (s.deleted ? `Deleted · ${s.title}` : s.title) : 'No service'}
                  {sp ? ` · ${sp.name}` : ''}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
