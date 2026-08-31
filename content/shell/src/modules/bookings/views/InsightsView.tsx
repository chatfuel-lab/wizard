import { useCallback, useEffect, useMemo } from 'react';
import { Alert, Button, PageBody, Skeleton, StatTile, usesHour12 } from '~ui';
import { useCatalog } from '../BookingsCatalogContext';
import { BusiestHoursCard, BusiestWeekdaysCard } from '../components/insights/BusiestCards';
import { InsightsToolbar } from '../components/insights/InsightsToolbar';
import { StatusMixCard } from '../components/insights/StatusMixCard';
import { UtilisationCard } from '../components/insights/UtilisationCard';
import { useRangeStore } from '../hooks/useRangeStore';
import { formatMoney, type FormatOptions } from '../lib/appointmentsColumns';
import { matchesFilter } from '../lib/bookingsFilter';
import type { InsightsPeriod } from '../lib/bookingsParams';
import { customRange, periodRange, rangeVars } from '../lib/calendarRange';
import { computeInsights, coverageLine, formatRate } from '../lib/insights';
import { isInitialLoad, selectVisible } from '../lib/rangeStore';
import { shiftDayKey, startOfDayInZone } from '../lib/zone';
import type { BookingsViewProps } from './types';

/**
 * Insights: a handful of numbers over one loaded window, computed here
 * because the API aggregates nothing (`lib/insights.ts` says exactly what
 * each figure is). Own range-store instance keyed on the period; the shared
 * filter applies before anything is counted; every card prints its coverage.
 *
 * On a refetch the previous numbers stay at reduced opacity rather than
 * flashing to skeletons — a dashboard that blanks on every refresh reads as
 * broken (dataviz: hold the previous render).
 */
export function InsightsView({
  params,
  onParams,
  filter,
  onFilterChange,
  band,
  zone,
  todayKey,
  weekStartsOn,
  onCount,
  onBusy,
  refreshToken,
}: BookingsViewProps) {
  const period: InsightsPeriod = params.period;
  const catalog = useCatalog();

  const range = useMemo(
    () => periodRange(period, todayKey, weekStartsOn, params.from, params.to),
    [period, todayKey, weekStartsOn, params.from, params.to],
  );
  const vars = useMemo(
    () => rangeVars(range, zone.zone, zone.botZone ?? 'UTC'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range.startKey, range.endKey, zone.zone, zone.botZone],
  );
  const { state, refetch } = useRangeStore(vars);

  const records = useMemo(() => selectVisible(state).filter((r) => matchesFilter(r, filter)), [state, filter]);
  const format = useMemo<FormatOptions>(() => ({ todayKey, hour12: usesHour12() }), [todayKey]);
  const insights = useMemo(
    () =>
      computeInsights({
        records,
        range,
        zone: zone.zone,
        specialists: catalog.state.specialists,
        weekStartsOn,
        window: {
          startMs: startOfDayInZone(range.startKey, zone.zone),
          endMs: startOfDayInZone(range.endKey, zone.zone),
        },
        format,
      }),
    [records, range, zone.zone, catalog.state.specialists, weekStartsOn, format],
  );
  const coverage = coverageLine(insights, format);

  const initial = isInitialLoad(state);
  const stale = state.loading && !initial;
  useEffect(() => onCount(initial ? null : insights.total), [onCount, initial, insights.total]);
  useEffect(() => onBusy(state.loading), [onBusy, state.loading]);
  useEffect(() => {
    if (refreshToken > 0) refetch();
  }, [refreshToken, refetch]);

  const setPeriod = useCallback(
    (next: InsightsPeriod) => {
      if (next === 'custom' && !params.from && !params.to) {
        const fallback = customRange(null, null, todayKey).range;
        onParams({ period: next, from: fallback.startKey, to: shiftDayKey(fallback.endKey, -1) });
        return;
      }
      onParams({ period: next });
    },
    [onParams, params.from, params.to, todayKey],
  );
  const setDates = useCallback((from: string | null, to: string | null) => onParams({ from, to }), [onParams]);

  const revenueValue =
    insights.revenue.perCurrency.length === 0 ? (
      <span className="text-text-muted">—</span>
    ) : (
      <span className="flex flex-col">
        {insights.revenue.perCurrency.map((r) => (
          <span key={r.currency}>{formatMoney(r.amount, r.currency, format.locale)}</span>
        ))}
      </span>
    );
  const revenueDetail =
    insights.revenue.attended === 0
      ? 'No attended bookings yet'
      : `${insights.revenue.perCurrency.map((r) => `${r.bookings} in ${r.currency}`).join(' · ') || 'none priced'}${
          insights.revenue.unpriced > 0 ? ` · ${insights.revenue.unpriced} unpriced` : ''
        }${insights.revenue.perCurrency.length > 1 ? ' · never summed across currencies' : ''}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <InsightsToolbar
        period={period}
        onPeriod={setPeriod}
        from={params.from}
        to={params.to}
        onDates={setDates}
        filter={filter}
        onFilterChange={onFilterChange}
        band={band}
        todayKey={todayKey}
        weekStartsOn={weekStartsOn}
        coverage={initial ? null : coverage}
        loading={state.loading}
      />

      {state.error ? (
        <div className="px-gutter pt-3">
          <Alert
            tone="danger"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Retry
              </Button>
            }
          >
            {state.error}
          </Alert>
        </div>
      ) : null}

      <PageBody>
        {initial && !state.error ? (
          <div className="grid grid-cols-2 gap-3 @wide:grid-cols-4" aria-busy>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} variant="block" height="6.5rem" />
            ))}
            <Skeleton variant="block" height="14rem" className="col-span-2" />
            <Skeleton variant="block" height="14rem" className="col-span-2" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 @wide:grid-cols-4">
              <StatTile
                label="Bookings"
                value={insights.total.toLocaleString()}
                detail={
                  insights.total === 0
                    ? 'Nothing in this range'
                    : `${insights.statusMix
                        .filter((s) => s.count > 0)
                        .slice(0, 3)
                        .map((s) => `${s.count} ${s.label.toLowerCase()}`)
                        .join(' · ')}`
                }
                coverage={coverage}
                stale={stale}
              />
              <StatTile
                label="No-show rate"
                value={formatRate(insights.noShow.rate)}
                detail={
                  insights.noShow.rate === null
                    ? 'No booking resolved as attended or no-show yet'
                    : `${insights.noShow.noShow} of ${insights.noShow.noShow + insights.noShow.attended} resolved (attended + no-show)`
                }
                coverage={coverage}
                stale={stale}
              />
              <StatTile
                label="Cancel rate"
                value={formatRate(insights.cancel.rate)}
                detail={
                  insights.cancel.rate === null
                    ? 'No bookings to cancel'
                    : `${insights.cancel.canceled} of ${insights.cancel.total} bookings`
                }
                coverage={coverage}
                stale={stale}
              />
              <StatTile
                label="Attended revenue"
                value={revenueValue}
                detail={revenueDetail}
                coverage={coverage}
                stale={stale}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 @wide:grid-cols-2">
              <StatusMixCard mix={insights.statusMix} total={insights.total} coverage={coverage} stale={stale} />
              <UtilisationCard rows={insights.utilisation} coverage={coverage} stale={stale} />
              <BusiestWeekdaysCard buckets={insights.weekdays} coverage={coverage} stale={stale} />
              <BusiestHoursCard buckets={insights.hours} coverage={coverage} stale={stale} />
            </div>

            <p className="text-xs text-text-faint">
              Computed here over the loaded range — the booking API aggregates nothing server-side. Not available: lead
              time (bookings carry no creation time), trends across more than one loaded window, and revenue summed
              across currencies.
            </p>
          </div>
        )}
      </PageBody>
    </div>
  );
}
