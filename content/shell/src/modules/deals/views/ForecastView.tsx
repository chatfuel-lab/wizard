import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  DateField,
  EmptyState,
  IconDownload,
  IconKanban,
  PageBody,
  Progress,
  SegmentedControl,
  Skeleton,
  Spinner,
  Toolbar,
} from '~ui';
import { ExportDialog } from '../components/ExportDialog';
import { ForecastCards } from '../components/ForecastCards';
import { WinRateCard } from '../components/WinRateCard';
import { useDealExport } from '../hooks/useDealExport';
import { useDealStats } from '../hooks/useDealStats';
import { exportStatusLabel, isTerminal } from '../lib/csvColumns';
import { toAssigneeFilter } from '../lib/dealsFilter';
import { AssigneeFilter } from '../components/AssigneeFilter';
import {
  EMPTY_RANGE,
  OPEN_STAGES,
  WINDOW_LABELS,
  WINDOW_PRESETS,
  combinedRollup,
  previousWindow,
  resolveWindow,
  rowsInWindow,
  stageStats,
  sumStages,
  weightedForecast,
  windowLabel,
  winRate,
  type CustomRange,
  type StageRows,
  type WindowPreset,
} from '../lib/forecast';
import { STAGES } from '../lib/stages';
import type { DealsViewProps } from './types';

/**
 * Pipeline analytics — deliberately not a predictive model.
 *
 * What is server-truthful: per-stage counts for a window, and the same counts
 * for the window before it, because `DealsByStagesFilter` already carries
 * `salesStageUpdatedAfter` / `Before`. Period-over-period is one operation
 * called twice; nothing new was generated for it.
 *
 * What is not: every money figure. There is no aggregation API of any kind for
 * attribute values, so each total is a client-side sum over loaded rows and
 * renders its coverage beside it, with the action that improves it.
 *
 * And what is missing on purpose: velocity, funnel conversion, time-in-stage
 * and average days to close. The API keeps `lastSalesStageUpdateTime` — the
 * LAST transition — and no history at all, so all four would have to be
 * invented. They are named in the UI rather than greyed out, because a disabled
 * button says "not yet" and the truth is "not from this data".
 *
 * **No key listener lives here.** `DealsApp` owns the module's only window
 * listener through `useHotkeys`, and a second one would race it for `r` and
 * `mod+k`. Everything keyboard on this toolbar is therefore local: the preset
 * row is a `SegmentedControl` (one Tab stop, arrows within it, type-ahead over
 * the labels), and the one effect below moves focus exactly once, on a
 * transition the user asked for.
 */
export function ForecastView({ filter, onFilterChange, fields, onCount, onBusy, refreshToken }: DealsViewProps) {
  const [preset, setPreset] = useState<WindowPreset>('last30');
  const [range, setRange] = useState<CustomRange>(EMPTY_RANGE);
  const [exportOpen, setExportOpen] = useState(false);
  /* Frozen, so a rolling window does not move on every render and refetch
   * forever. The header's refresh button is what advances it. */
  const [now, setNow] = useState(() => Date.now());

  const assigneeFilter = useMemo(() => toAssigneeFilter(filter.assignee), [filter.assignee]);
  const activeWindow = useMemo(() => resolveWindow(preset, now, range), [preset, now, range]);
  const previous = useMemo(() => previousWindow(activeWindow, now), [activeWindow, now]);

  const stats = useDealStats(assigneeFilter, fields.names, activeWindow, previous);
  const exporter = useDealExport();
  const { loading, loadingMore, totals, previousTotals, rows, refetch } = stats;

  const label = useMemo(() => windowLabel(preset, activeWindow), [preset, activeWindow]);
  const total = useMemo(() => sumStages(totals, STAGES), [totals]);
  const openCount = useMemo(() => sumStages(totals, OPEN_STAGES), [totals]);

  /* The hook holds paging state per stage; the pure assembly wants plain rows. */
  const rowsByStage = useMemo<StageRows>(
    () => Object.fromEntries(STAGES.map((stage) => [stage, rows[stage].nodes])) as StageRows,
    [rows],
  );

  const perStage = useMemo(
    () => stageStats(totals, previousTotals, rowsByStage, fields.bindings, activeWindow),
    [totals, previousTotals, rowsByStage, fields.bindings, activeWindow],
  );
  const pipeline = useMemo(
    () => combinedRollup(rowsByStage, OPEN_STAGES, fields.bindings, totals, activeWindow),
    [rowsByStage, fields.bindings, totals, activeWindow],
  );
  const weighted = useMemo(
    () =>
      weightedForecast(
        OPEN_STAGES.flatMap((stage) => rowsInWindow(rowsByStage[stage], activeWindow)),
        fields.bindings,
        openCount,
      ),
    [rowsByStage, fields.bindings, activeWindow, openCount],
  );

  const rate = winRate(totals.Won, totals.Lost);
  const previousRate = previousTotals === null ? null : winRate(previousTotals.Won, previousTotals.Lost);

  useEffect(() => onCount(loading ? null : total), [onCount, loading, total]);
  useEffect(() => onBusy(loading || loadingMore), [onBusy, loading, loadingMore]);

  /**
   * Picking "Custom" reveals two date inputs that were not there a frame ago.
   * Without this, a keyboard user who just committed that choice has to Tab
   * past the control they are standing on to reach the thing they asked for.
   *
   * Only on the *transition* into custom: the `SegmentedControl` uses explicit
   * activation, so arrowing across "Custom" moves focus without selecting it
   * and this stays out of the way. That explicitness is deliberate rather than
   * an ARIA oversight — a preset change fires `DealsTotals` twice and one
   * `DealsColumn` per stage, so selection-follows-focus would launch eight
   * requests per arrow press.
   */
  const customRangeRef = useRef<HTMLDivElement>(null);
  const previousPresetRef = useRef(preset);
  useEffect(() => {
    const entered = preset === 'custom' && previousPresetRef.current !== 'custom';
    previousPresetRef.current = preset;
    if (entered) customRangeRef.current?.querySelector('input')?.focus();
  }, [preset]);

  /* A rolling window refetches by moving; a fixed one has to be told to. */
  const rollingRef = useRef(true);
  rollingRef.current = preset !== 'all' && preset !== 'custom';
  useEffect(() => {
    if (refreshToken === 0) return;
    if (rollingRef.current) setNow(Date.now());
    else refetch();
  }, [refreshToken, refetch]);

  const exporting = exporter.progress !== null && !isTerminal(exporter.progress.phase);
  const empty = !loading && total === 0;

  return (
    <>
      <Toolbar>
        <AssigneeFilter value={filter.assignee} onChange={(assignee) => onFilterChange({ ...filter, assignee })} />
        <SegmentedControl
          aria-label="Reporting window"
          size="sm"
          value={preset}
          onChange={setPreset}
          options={WINDOW_PRESETS.map((value) => ({ value, label: WINDOW_LABELS[value] }))}
        />
        {preset === 'custom' ? (
          <div ref={customRangeRef} className="flex items-center gap-1.5">
            {/* No presets: DateField's are close-date presets and point into the
                future, which is the wrong half of the calendar for a report. */}
            <DateField
              aria-label="Window start"
              presets={false}
              value={range.from}
              onChange={(from) => setRange((current) => ({ ...current, from }))}
            />
            <span className="text-xs text-text-faint">to</span>
            <DateField
              aria-label="Window end"
              presets={false}
              value={range.to}
              onChange={(to) => setRange((current) => ({ ...current, to }))}
            />
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {loadingMore ? (
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <Spinner size={12} /> Loading rows…
            </span>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => setExportOpen(true)}>
            <IconDownload size={14} />
            Export CSV
          </Button>
        </div>
      </Toolbar>

      {/* An export outlives this dialog, so it stays visible while it runs. */}
      {exporting && !exportOpen && exporter.progress ? (
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface-sunken px-gutter py-2">
          <span className="shrink-0 text-xs text-text-muted">{exportStatusLabel(exporter.progress)}</span>
          <Progress
            label={exportStatusLabel(exporter.progress)}
            value={exporter.progress.percent ?? undefined}
            size="sm"
            className="min-w-24 flex-1"
          />
          <Button variant="ghost" size="sm" onClick={() => setExportOpen(true)}>
            Details
          </Button>
        </div>
      ) : null}

      {/* measure stays 'none': the cards are a dashboard grid that wants the
          width it is given, not a reading column. */}
      <PageBody>
        {stats.error !== null ? (
          <Alert
            tone="danger"
            title="Could not load the pipeline"
            className="mb-3"
            action={
              <Button variant="secondary" size="sm" onClick={refetch}>
                Try again
              </Button>
            }
          >
            {stats.error}
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading the pipeline">
            <div className="flex gap-3">
              <Skeleton variant="block" height="8rem" />
              <Skeleton variant="block" height="8rem" />
            </div>
            <Skeleton variant="block" height="16rem" />
          </div>
        ) : empty ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<IconKanban />}
              title="No deals in this window"
              description={`No deal changed stage in this window (${label}). Widen it, or clear the assignee filter.`}
              action={
                preset === 'all' ? undefined : (
                  <Button variant="secondary" size="sm" onClick={() => setPreset('all')}>
                    Show all time
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <ForecastCards
              stats={perStage}
              pipeline={pipeline}
              weighted={weighted}
              windowLabel={label}
              openCount={openCount}
              hasMore={stats.hasMore}
              loadingMore={loadingMore}
              onLoadRest={stats.loadRest}
            >
              <WinRateCard rate={rate} previous={previousRate} windowLabel={label} />
            </ForecastCards>

            {previous === null ? (
              <p className="text-xs text-text-faint">
                An unbounded window has no period before it, so there is nothing to compare against. Pick a fixed window
                to see period-over-period change.
              </p>
            ) : null}
          </div>
        )}
      </PageBody>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        bindings={fields.bindings}
        loadedIds={stats.loadedIds}
        totalDeals={total}
        hasMore={stats.hasMore}
        loadingMore={loadingMore}
        onLoadRest={stats.loadRest}
        exporter={exporter}
      />
    </>
  );
}
