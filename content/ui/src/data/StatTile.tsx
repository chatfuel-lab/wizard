import type { ReactNode } from 'react';
import { Card } from '../primitives/Card';

export interface StatTileProps {
  /** Sentence case, no trailing colon. */
  label: string;
  /** The figure — proportional digits, never tabular at this size. */
  value: ReactNode;
  /** One line under the figure: the denominator, the split, the caveat. */
  detail?: ReactNode;
  /**
   * The window the number was measured over — "Last 30 days · all staff".
   *
   * Optional, and the judgement is in what it is FOR: a number over a window a
   * reader cannot see is untrustworthy, so an insights tile must carry one. A
   * tile counting a whole address book, or the rows on this page, has no window
   * to state — and filling the slot anyway produces a caption that restates the
   * label, which readers learn to skip and which makes the real ones easier to
   * skip too.
   */
  coverage?: string;
  /** Held at reduced opacity while a refetch is in flight — no skeleton flash. */
  stale?: boolean;
  className?: string;
}

/**
 * A stat tile (dataviz: "the number is the chart"). Label · value · detail ·
 * coverage. The value wears the text token, not a series colour; whatever
 * meaning the number carries is in the words beside it. A null rate arrives
 * already formatted as `—` — `0%` would claim a perfect record.
 *
 * Grew up in bookings' Insights view and moved here once other modules wanted
 * the same lines. `coverage` became optional on the way: a rate over the last
 * thirty days is meaningless without its window, and a plain count has no
 * window to state.
 */
export function StatTile({ label, value, detail, coverage, stale = false, className = '' }: StatTileProps) {
  return (
    <Card className={`transition-opacity duration-base ease-standard ${stale ? 'opacity-60' : ''} ${className}`}>
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold leading-tight text-text">{value}</p>
      {detail !== undefined && detail !== null ? <p className="mt-1 text-xs text-text-muted">{detail}</p> : null}
      {coverage ? <p className="mt-2 text-micro text-text-faint">{coverage}</p> : null}
    </Card>
  );
}
