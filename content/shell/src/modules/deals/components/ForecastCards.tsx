import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Card, DURATION, EASING, Spinner, Tag, prefersReducedMotion } from '~ui';
import { rollupAmountLabel, type ColumnRollup } from '../lib/dealRollup';
import {
  barPercent,
  compactMoney,
  coverageLabel,
  coverageNote,
  formatDelta,
  rollProgress,
  rollValue,
  shouldRoll,
  staggerDelay,
  type StageStat,
  type WeightedForecast,
} from '../lib/forecast';
import { STAGE_META } from '../lib/stages';

/**
 * The numbers, and the sentence that has to travel with each of them.
 *
 * Counts come from `contactDealsByStages` and are exact for the window. Money
 * does not: there is no aggregation API, so every total here is a sum over the
 * rows that happen to be loaded and renders its coverage in the same breath —
 * `€412K · 60 of 128 loaded`, with the action that fixes it right there.
 *
 * The bars are magnitude, so they are one hue; the two terminal stages use the
 * status colours instead, because won and lost are states rather than series.
 * Every bar is labelled, so colour never carries identity on its own.
 *
 * **The motion is deliberately narrow.** Two things move: the cards arrive in
 * sequence rather than all at once, and a rollup figure *that changes while
 * you are looking at it* rolls to its new value instead of snapping. Which
 * figures those are is not a style choice — the only totals on this view that
 * move without a refetch are the loaded-rows sums, and they move exactly when
 * "load the rest" is paging. Everything else is server truth for a window: it
 * changes by remounting behind a skeleton, where an animation would be a lie
 * about continuity.
 */

const BAR_TONE: Record<string, string> = {
  Won: 'bg-success',
  Lost: 'bg-danger',
};

/**
 * A figure that rolls when it moves and snaps when it appears.
 *
 * `shouldRoll` is what draws that line: a null-to-number step is a first
 * paint, and rolling there would animate a number nobody watched change. The
 * easing and the frame loop are here because they need a DOM clock; the
 * arithmetic they call is in `lib/forecast.ts` with tests.
 */
function RollingNumber({ value, format }: { value: number; format: (amount: number) => string }) {
  const [shown, setShown] = useState(value);
  /* Read inside the effect, so a roll always starts from what is on screen —
   * including mid-roll, when a second page lands before the first settled. */
  const shownRef = useRef(value);
  shownRef.current = shown;

  useEffect(() => {
    const from = shownRef.current;
    if (!shouldRoll(from, value) || prefersReducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const startedAt = performance.now();
    const step = (at: number) => {
      const progress = rollProgress(at - startedAt, DURATION.slow);
      setShown(rollValue(from, value, progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{format(shown)}</>;
}

/** The money line: a sum, or a refusal to print a wrong one — never a bare number. */
function Money({ rollup, compact = false }: { rollup: ColumnRollup; compact?: boolean }) {
  /* `rollupColumn` already nulls the amount when the currencies are mixed, so
   * one null check covers both refusals. */
  const amount = rollup.amount;

  return (
    <span className={amount === null ? 'text-text-muted' : 'text-text'} title={coverageNote(rollup)}>
      {amount === null ? (
        rollup.mixedCurrencies ? (
          'Mixed currencies'
        ) : (
          'No amounts'
        )
      ) : compact ? (
        /* Only the headline sum rolls. Six per-stage figures ticking at once
         * through one "load the rest" is a slot machine, not a report. */
        <RollingNumber value={amount} format={(value) => compactMoney(value, rollup.currency)} />
      ) : (
        rollupAmountLabel(rollup)
      )}
    </span>
  );
}

function Coverage({ rollup }: { rollup: ColumnRollup }) {
  return (
    <span className="text-text-faint" title={coverageNote(rollup)}>
      {coverageLabel(rollup.counted, rollup.total)}
    </span>
  );
}

function LoadRest({ loading, onLoadRest }: { loading: boolean; onLoadRest: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onLoadRest} disabled={loading}>
      {loading ? <Spinner size={12} /> : null}
      {loading ? 'Loading…' : 'Load the rest'}
    </Button>
  );
}

export interface ForecastCardsProps {
  stats: readonly StageStat[];
  /** The open stages, summed over loaded rows. */
  pipeline: ColumnRollup;
  weighted: WeightedForecast;
  windowLabel: string;
  /** Open deals the server knows about, in this window. */
  openCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadRest: () => void;
  /** The win-rate card, passed in so this file does not own the layout of both. */
  children?: ReactNode;
}

export function ForecastCards({
  stats,
  pipeline,
  weighted,
  windowLabel,
  openCount,
  hasMore,
  loadingMore,
  onLoadRest,
  children,
}: ForecastCardsProps) {
  const busiest = Math.max(1, ...stats.map((stat) => stat.count));

  /* `Card` takes no ref, so the entrance is applied to the two containers'
   * children instead of to each card — the same imperative escape hatch the
   * palette's "focus the search box" command uses, and cheaper than wrapping
   * every card in a div that would break the grid's equal heights.
   *
   * Mount-only by design: the whole block unmounts behind a skeleton whenever
   * the window changes, so it replays exactly when a reader would expect a new
   * set of cards and never while one is being read. */
  const summaryRef = useRef<HTMLDivElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const targets = [...(summaryRef.current?.children ?? []), ...(breakdownRef.current?.children ?? [])];
    for (const [index, node] of targets.entries()) {
      node.animate(
        [
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: DURATION.base,
          easing: EASING.entrance,
          delay: staggerDelay(index),
          /* Backwards, or a card sits at full opacity through its own delay
           * and the stagger is only visible on the movement. */
          fill: 'backwards',
        },
      );
    }
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* One, two, three columns. Nothing structural changes across those
          bands — the same three cards, in the same order — so this is a CSS
          question and asking JS for it meant re-rendering the whole view to
          change a column count. */}
      <div ref={summaryRef} className="grid grid-cols-1 gap-3 @wide:grid-cols-2 @inline:grid-cols-3">
        <Card title="Open pipeline" description={windowLabel}>
          <p className="text-2xl font-semibold tabular-nums text-text">
            {openCount.toLocaleString()}
            <span className="ml-1.5 text-sm font-normal text-text-muted">deal{openCount === 1 ? '' : 's'}</span>
          </p>
          <p className="mt-1 text-sm tabular-nums">
            <Money rollup={pipeline} compact />
            <span className="text-text-faint"> · </span>
            <Coverage rollup={pipeline} />
          </p>
          {hasMore ? (
            <div className="mt-2">
              <LoadRest loading={loadingMore} onLoadRest={onLoadRest} />
            </div>
          ) : null}
        </Card>

        <Card title="Weighted forecast" description="Amount × probability, per deal">
          <p className="text-2xl font-semibold tabular-nums text-text">
            {weighted.mixedCurrencies ? (
              'Mixed currencies'
            ) : weighted.amount === null ? (
              '—'
            ) : (
              <RollingNumber value={weighted.amount} format={(value) => compactMoney(value, weighted.currency)} />
            )}
          </p>
          <p className="mt-1 text-sm tabular-nums text-text-faint">{coverageLabel(weighted.counted, weighted.total)}</p>
          {/* A deal with no probability is excluded, never weighted at some
              stage default — the API stores no stage history to derive one from. */}
          {weighted.missingProbability > 0 ? (
            <p className="mt-2 text-xs text-text-muted">
              {weighted.missingProbability.toLocaleString()} loaded deal
              {weighted.missingProbability === 1 ? ' has' : 's have'} an amount but no probability, so
              {weighted.missingProbability === 1 ? ' it is' : ' they are'} left out rather than guessed at.
            </p>
          ) : null}
          {weighted.counted === 0 && weighted.missingProbability === 0 ? (
            <p className="mt-2 text-xs text-text-muted">
              Set “deal probability” on a deal to weight it. Nothing is inferred from its stage.
            </p>
          ) : null}
        </Card>

        {children}
      </div>

      <div ref={breakdownRef}>
        <Card
          title="By stage"
          description="Counts are exact for the window. Money covers loaded deals only."
          actions={hasMore ? <LoadRest loading={loadingMore} onLoadRest={onLoadRest} /> : null}
        >
          <ul className="flex flex-col gap-2.5">
            {stats.map((stat) => {
              const meta = STAGE_META[stat.stage];
              return (
                <li key={stat.stage} className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="w-24 shrink-0">
                      <Tag tone={meta.tone}>{meta.label}</Tag>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-text">
                      {stat.count.toLocaleString()}
                    </span>
                    {stat.delta ? (
                      <span
                        className={`shrink-0 text-xs tabular-nums ${
                          stat.delta.direction === 'flat' ? 'text-text-faint' : 'text-text-muted'
                        }`}
                        title={`Previous period: ${stat.previous?.toLocaleString() ?? '—'}`}
                      >
                        {formatDelta(stat.delta)}
                      </span>
                    ) : null}
                    <span className="ml-auto min-w-0 truncate text-xs tabular-nums">
                      <Money rollup={stat.rollup} />
                      <span className="text-text-faint"> · </span>
                      <Coverage rollup={stat.rollup} />
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className={`h-full rounded-full transition-[width] duration-base ease-standard ${
                        BAR_TONE[stat.stage] ?? 'bg-accent'
                      }`}
                      style={{ width: `${barPercent(stat.count, busiest)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
