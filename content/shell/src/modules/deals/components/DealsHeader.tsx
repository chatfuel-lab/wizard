import type { ReactNode } from 'react';
import { Button, IconRefresh, PageHeader, SegmentedControl, Spinner, Tooltip } from '~ui';
import type { DealsView } from '../lib/dealsParams';
import { VIEWS } from '../lib/dealsParams';

const VIEW_LABELS: Record<DealsView, string> = {
  board: 'Board',
  table: 'Table',
  forecast: 'Forecast',
};

export interface DealsHeaderProps {
  view: DealsView;
  onView: (next: DealsView) => void;
  /** Whatever the active view considers its total, or null while it does not know. */
  count: number | null;
  /** The server's own "something changed on this page" flag. */
  live: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  /** The saved-views menu; a slot so the header never depends on one view. */
  actions?: ReactNode;
}

/**
 * The module's top zone. Shared by all three views and frozen: a view
 * contributes only its count and its own toolbar below this bar, so adding a
 * view never edits this file.
 *
 * The bar itself is `PageHeader` now — this file is the canon that primitive
 * was extracted from, so what is left here is only the parts that are about
 * deals: which number, which dot, which three views.
 *
 * It carries its own `title` because a module ships as an embed with no shell
 * chrome at all. That used to duplicate the dev shell's `Topbar`; the topbar now
 * names the bot and the workspace, and the module names itself, so the two say
 * different things and both are needed.
 */
export function DealsHeader({ view, onView, count, live, onRefresh, refreshing, actions }: DealsHeaderProps) {
  return (
    <PageHeader
      title="Deals"
      meta={
        <>
          {count === null ? null : (
            <span className="text-meta tabular-nums text-text-muted">{count.toLocaleString()}</span>
          )}
          {live ? (
            <Tooltip label="Something changed on this page">
              <span
                aria-label="Live updates pending"
                className="size-1.5 rounded-full bg-success motion-safe:animate-pulse"
              />
            </Tooltip>
          ) : null}
        </>
      }
      actions={
        <>
          {actions}
          <SegmentedControl
            aria-label="Deals view"
            size="sm"
            value={view}
            onChange={onView}
            options={VIEWS.map((value) => ({ value, label: VIEW_LABELS[value] }))}
          />
          <Tooltip label="Refresh">
            <Button variant="ghost" size="sm" aria-label="Refresh" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <Spinner size={14} /> : <IconRefresh />}
            </Button>
          </Tooltip>
        </>
      }
    />
  );
}
