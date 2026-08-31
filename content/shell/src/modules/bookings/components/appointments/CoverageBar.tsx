import { Alert, Button, Spinner } from '~ui';
import type { FormatOptions } from '../../lib/appointmentsColumns';
import { canLoadMore, capCaveat, coverageLabel, loadMoreLabel } from '../../lib/appointmentsRange';
import type { AppointmentsRange } from '../../lib/bookingsParams';
import type { DayRange } from '../../lib/calendarRange';

export interface CoverageBarProps {
  range: AppointmentsRange;
  /** The window the list is showing (the requested one; the loaded one lags by a round trip). */
  window: DayRange;
  /** Rows in the window after the tab split but BEFORE the filter/search — what "loaded" means. */
  loaded: number;
  /** Rows shown after filter and search, when narrower than `loaded`. */
  shown: number;
  chunks: number;
  onLoadMore: () => void;
  loading: boolean;
  capped: boolean;
  /** The view's one format object — the same `todayKey`, locale and clock the table prints with. */
  format: FormatOptions;
}

/**
 * The sentence the whole list depends on: what stretch of time these rows
 * cover, and the button that widens it. `bookingsV2` has no pages, so this
 * line is the honest replacement for a "1–50 of 1,234" footer — there is no
 * total to print, only a window. Every string here is a tested pure function
 * in `lib/appointmentsRange.ts`; the bar only lays them out.
 */
export function CoverageBar({
  range,
  window,
  loaded,
  shown,
  chunks,
  onLoadMore,
  loading,
  capped,
  format,
}: CoverageBarProps) {
  const more = loadMoreLabel(range);
  return (
    <>
      {capped ? (
        <div className="px-gutter pt-3">
          <Alert tone="warning">{capCaveat(window, format)}</Alert>
        </div>
      ) : null}
      <div
        className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-gutter py-1.5 text-xs text-text-muted"
        aria-live="polite"
      >
        <span className="tabular-nums">
          {coverageLabel(loaded, window, format)}
          {shown < loaded ? (
            <span className="text-text-faint"> · {shown.toLocaleString(format.locale)} shown</span>
          ) : null}
        </span>
        {loading ? <Spinner size={12} /> : null}
        {more && canLoadMore(range, chunks) ? (
          <Button variant="ghost" size="xs" onClick={onLoadMore} disabled={loading}>
            {more}
          </Button>
        ) : more ? (
          <span className="text-text-faint">
            Loaded the most a list can hold — pick a custom range to look further.
          </span>
        ) : null}
      </div>
    </>
  );
}
