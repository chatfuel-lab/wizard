import { Button, IconPlus, IconRefresh, Kbd, PageHeader, Spinner, Tabs, Tooltip } from '~ui';
import { VIEWS, type BookingsView } from '../lib/bookingsParams';
import { VIEW_LABELS } from '../lib/commands';

export interface BookingsHeaderProps {
  view: BookingsView;
  onView: (next: BookingsView) => void;
  /** Whatever the active view considers its total, or null while it does not know. */
  count: number | null;
  /** True while a live event has just landed (the dot pulses briefly). */
  live: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  canEdit: boolean;
  onNewBooking: () => void;
  onOpenPalette: () => void;
}

/**
 * The module's top zone. Shared by all six sections and frozen: a section
 * contributes only its count and its own toolbar below this bar, so adding a
 * section never edits this file. It carries its own `title` because a module
 * ships as an embed with no shell chrome at all.
 */
export function BookingsHeader({
  view,
  onView,
  count,
  live,
  onRefresh,
  refreshing,
  canEdit,
  onNewBooking,
  onOpenPalette,
}: BookingsHeaderProps) {
  return (
    <PageHeader
      title="Bookings"
      meta={
        <>
          {count === null ? null : (
            <span className="text-meta tabular-nums text-text-muted">{count.toLocaleString()}</span>
          )}
          {live ? (
            <Tooltip label="Live — something changed just now">
              <span
                aria-label="Live update received"
                className="size-1.5 rounded-full bg-success motion-safe:animate-pulse"
              />
            </Tooltip>
          ) : null}
        </>
      }
      actions={
        <>
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open the command palette"
            className="hidden items-center gap-1.5 rounded-control border border-border px-2 py-1 text-xs text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring @compact:inline-flex"
          >
            Commands
            <Kbd keys={['mod', 'k']} />
          </button>
          <Tooltip label="Refresh">
            <Button variant="ghost" size="sm" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <Spinner size={14} /> : <IconRefresh />}
            </Button>
          </Tooltip>
          {canEdit ? (
            <Button variant="primary" size="sm" onClick={onNewBooking}>
              <IconPlus />
              <span className="hidden @compact:inline">New booking</span>
            </Button>
          ) : null}
        </>
      }
      tabs={
        <Tabs
          tabs={VIEWS.map((id) => ({ id, label: VIEW_LABELS[id] }))}
          active={view}
          onSelect={(id) => onView(id as BookingsView)}
        />
      }
    />
  );
}
