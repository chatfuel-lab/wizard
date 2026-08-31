import { SalesStageV2 } from '~api/generated/deals/graphql';
import type { DealFieldBindings } from './dealFieldBinding';
import { attributeMap, currencyOf, formatMoney, readValue } from './dealFieldValue';
import { rollupColumn, type ColumnRollup, type RollupCard } from './dealRollup';
import { STAGES } from './stages';

/**
 * The forecast's arithmetic — and the coverage strings that keep it honest.
 *
 * Two kinds of number live here and they must never be confused on screen:
 *
 * - **Server-truthful counts.** `contactDealsByStages` takes
 *   `salesStageUpdatedAfter` / `Before`, so a per-stage count for a window is
 *   exact, and period-over-period is the same query with a second window.
 * - **Loaded-rows-only money.** There is no aggregation API for attribute
 *   values of any kind, so every sum is over the rows that happen to be
 *   loaded. `coverageLabel` is therefore not decoration: a bare total here
 *   would be a lie, and `lib/dealRollup.ts` already refuses to sum across
 *   currencies for the same reason.
 *
 * The window is the *last* stage update, never a cohort — `contactDealsConnection`
 * is ordered by that same key, which is why a client-side `inWindow` filter over
 * loaded rows agrees with the server's count for those rows.
 *
 * Nothing here reads the clock: `now` arrives as an argument, so every boundary
 * is testable.
 */

export const DAY_MS = 86_400_000;

export type WindowPreset = 'last7' | 'last30' | 'last90' | 'quarter' | 'all' | 'custom';

export const WINDOW_PRESETS: readonly WindowPreset[] = ['last7', 'last30', 'last90', 'quarter', 'all', 'custom'];

export const WINDOW_LABELS: Record<WindowPreset, string> = {
  last7: '7 days',
  last30: '30 days',
  last90: '90 days',
  quarter: 'Quarter',
  all: 'All time',
  custom: 'Custom',
};

/** Half-open `[after, before)` in epoch ms. Null on either side is unbounded. */
export interface DateWindow {
  after: number | null;
  before: number | null;
}

export const ALL_TIME: DateWindow = { after: null, before: null };

/** The two `YYYY-MM-DD` values the custom range's date inputs hold. */
export interface CustomRange {
  from: string | null;
  to: string | null;
}

export const EMPTY_RANGE: CustomRange = { from: null, to: null };

/**
 * `YYYY-MM-DD` → UTC midnight, the same reading `toAttrValue` gives a date
 * field. A local reading would move the boundary by the reader's offset while
 * the timestamps being compared are server-side.
 */
export function parseDay(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(ms) ? ms : null;
}

const startOfQuarter = (now: number): number => {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1);
};

/**
 * A preset plus the custom inputs → one window. A half-filled or reversed
 * custom range degrades rather than throwing: an unset side is unbounded, and
 * a range entered backwards is read in the order that makes sense.
 */
export function resolveWindow(preset: WindowPreset, now: number, range: CustomRange = EMPTY_RANGE): DateWindow {
  switch (preset) {
    case 'last7':
      return { after: now - 7 * DAY_MS, before: null };
    case 'last30':
      return { after: now - 30 * DAY_MS, before: null };
    case 'last90':
      return { after: now - 90 * DAY_MS, before: null };
    case 'quarter':
      return { after: startOfQuarter(now), before: null };
    case 'all':
      return ALL_TIME;
    case 'custom': {
      const from = parseDay(range.from);
      // The "to" day is inclusive to a reader, so the bound is the day after it.
      const to = parseDay(range.to);
      const before = to === null ? null : to + DAY_MS;
      if (from !== null && before !== null && from >= before) {
        return { after: before - DAY_MS, before: from + DAY_MS };
      }
      return { after: from, before };
    }
  }
}

/**
 * The window immediately before this one, same length — the comparison the
 * per-stage deltas are made against. Null when the window has no lower bound,
 * because "before all time" is not a period.
 */
export function previousWindow(window: DateWindow, now: number): DateWindow | null {
  if (window.after === null) return null;
  const end = window.before ?? now;
  const length = end - window.after;
  if (length <= 0) return null;
  return { after: window.after - length, before: window.after };
}

/** The two `DealsByStagesFilter` members. Null means "do not narrow this side". */
export function windowFilterArgs(window: DateWindow): {
  salesStageUpdatedAfter: string | null;
  salesStageUpdatedBefore: string | null;
} {
  return {
    salesStageUpdatedAfter: window.after === null ? null : new Date(window.after).toISOString(),
    salesStageUpdatedBefore: window.before === null ? null : new Date(window.before).toISOString(),
  };
}

export const isUnbounded = (window: DateWindow): boolean => window.after === null && window.before === null;

/**
 * Does this row's LAST stage update fall in the window? A row with no
 * timestamp counts only for the unbounded window — guessing either way would
 * silently move money between periods.
 */
export function inWindow(iso: string | null | undefined, window: DateWindow): boolean {
  if (isUnbounded(window)) return true;
  if (!iso) return false;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return false;
  if (window.after !== null && at < window.after) return false;
  if (window.before !== null && at >= window.before) return false;
  return true;
}

const dayFormat = (locale?: string) =>
  new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** What the window says it is, in words — the caption under every number. */
export function windowLabel(preset: WindowPreset, window: DateWindow, locale?: string): string {
  switch (preset) {
    case 'last7':
      return 'Last 7 days';
    case 'last30':
      return 'Last 30 days';
    case 'last90':
      return 'Last 90 days';
    case 'quarter':
      return 'This quarter';
    case 'all':
      return 'All time';
    case 'custom': {
      if (window.after === null && window.before === null) return 'All time';
      const format = dayFormat(locale);
      const from = window.after === null ? null : format.format(new Date(window.after));
      // `before` is exclusive; the label names the last day the reader chose.
      const to = window.before === null ? null : format.format(new Date(window.before - DAY_MS));
      if (from && to) return from === to ? from : `${from} – ${to}`;
      return from ? `${from} onwards` : `Up to ${to}`;
    }
  }
}

/* ── counts ─────────────────────────────────────────────────────────────── */

export type StageTotals = Record<SalesStageV2, number>;

export const emptyTotals = (): StageTotals => Object.fromEntries(STAGES.map((stage) => [stage, 0])) as StageTotals;

export const OPEN_STAGES: readonly SalesStageV2[] = STAGES.filter(
  (stage) => stage !== SalesStageV2.Won && stage !== SalesStageV2.Lost,
);

export const sumStages = (totals: StageTotals, stages: readonly SalesStageV2[]): number =>
  stages.reduce((sum, stage) => sum + (totals[stage] ?? 0), 0);

export interface Delta {
  absolute: number;
  /** Null when the previous period was zero — "+3 from 0" has no percentage. */
  ratio: number | null;
  direction: 'up' | 'down' | 'flat';
}

export function delta(current: number, previous: number): Delta {
  const absolute = current - previous;
  return {
    absolute,
    ratio: previous === 0 ? null : absolute / previous,
    direction: absolute === 0 ? 'flat' : absolute > 0 ? 'up' : 'down',
  };
}

/** `+12 · +24%` / `+12 · new` / `no change`. */
export function formatDelta(value: Delta): string {
  if (value.direction === 'flat') return 'no change';
  const signed = `${value.absolute > 0 ? '+' : '−'}${Math.abs(value.absolute).toLocaleString()}`;
  if (value.ratio === null) return `${signed} · new`;
  const percent = Math.round(Math.abs(value.ratio) * 100);
  return `${signed} · ${value.absolute > 0 ? '+' : '−'}${percent}%`;
}

export interface WinRate {
  /** 0..1, or null when nothing closed in the window. */
  rate: number | null;
  won: number;
  lost: number;
  decided: number;
}

/**
 * `Won / (Won + Lost)` over the window — exact, because both are server counts.
 * The zero-denominator case is a real state, not an error: a window in which
 * nothing closed has no win rate, and rendering `0%` there would read as "we
 * lost everything".
 */
export function winRate(won: number, lost: number): WinRate {
  const decided = won + lost;
  return { rate: decided === 0 ? null : won / decided, won, lost, decided };
}

export function formatRate(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

/** Bar length as a percentage of the largest value. Never divides by zero. */
export function barPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, (value / max) * 100);
}

/* ── motion, as arithmetic ──────────────────────────────────────────────── */

/**
 * The two numbers behind the view's motion live here rather than in the JSX,
 * for the usual reason: vitest is node-only, so anything left in a component
 * is untestable forever. The durations and easings themselves stay in `~ui` —
 * this file only decides *when* and *how far*, never *how fast*.
 */

/** Gap between one card's entrance and the next. */
export const STAGGER_STEP_MS = 40;
/**
 * And the point at which the stagger stops growing. Without a cap the last
 * card of a long list arrives after the reader has already started reading,
 * which reads as jank rather than as sequence.
 */
export const STAGGER_MAX_MS = 160;

export function staggerDelay(index: number): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  return Math.min(Math.floor(index) * STAGGER_STEP_MS, STAGGER_MAX_MS);
}

/**
 * Ease-out cubic over `[0, 1]`, clamped at both ends.
 *
 * Out, not in-out: a rolling figure has to become *readable* early and then
 * settle, and an ease-in spends its first third on a number nobody can read.
 */
export function rollProgress(elapsed: number, duration: number): number {
  if (!Number.isFinite(elapsed) || !Number.isFinite(duration) || duration <= 0) return 1;
  if (elapsed <= 0) return 0;
  if (elapsed >= duration) return 1;
  const t = elapsed / duration;
  return 1 - (1 - t) ** 3;
}

/** The figure to print `progress` of the way from one value to the next. */
export function rollValue(from: number, to: number, progress: number): number {
  if (!Number.isFinite(from)) return to;
  return from + (to - from) * rollClamp(progress);
}

const rollClamp = (value: number): number => (!Number.isFinite(value) ? 1 : value <= 0 ? 0 : value >= 1 ? 1 : value);

/**
 * Is this change worth animating at all?
 *
 * A first paint is not: rolling every figure up from zero on mount is the
 * dashboard-demo tell, and the number was never *observed* changing. What is
 * worth it is coverage climbing while "load the rest" runs — the one moment on
 * this view where a total genuinely moves under the reader's eyes.
 */
export function shouldRoll(from: number | null, to: number | null): boolean {
  return from !== null && to !== null && Number.isFinite(from) && Number.isFinite(to) && from !== to;
}

/* ── money ──────────────────────────────────────────────────────────────── */

/**
 * The coverage that travels with every sum. There is no aggregation API, so
 * this string is the difference between a total and a claim — it is never
 * omitted, not even when coverage happens to be complete.
 */
export function coverageLabel(counted: number, total: number): string {
  if (total <= 0 && counted === 0) return 'no deals in this window';
  if (counted === 0) return `0 of ${total.toLocaleString()} loaded`;
  if (counted >= total) return `all ${total.toLocaleString()} loaded`;
  return `${counted.toLocaleString()} of ${total.toLocaleString()} loaded`;
}

/** The long form, for a `title`. Says why the number cannot be complete. */
export function coverageNote(rollup: ColumnRollup): string {
  const parts = [
    `Summed over ${rollup.counted} of ${rollup.total} deals (${rollup.loaded} rows loaded). ` +
      'The API has no aggregation for attribute values, so only loaded deals can be summed.',
  ];
  if (rollup.mixedCurrencies) {
    parts.push('These deals use more than one currency, so they are not summed at all.');
  }
  if (rollup.unreadable > 0) {
    parts.push(
      `${rollup.unreadable} deal${rollup.unreadable === 1 ? ' has an amount that' : 's have amounts that'} ` +
        'could not be read.',
    );
  }
  return parts.join(' ');
}

/** `€412k`, falling back to the full number when compact notation is unavailable. */
export function compactMoney(amount: number, currency: string, locale?: string): string {
  const code = /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : '';
  if (code !== '' && Math.abs(amount) >= 10_000) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        notation: 'compact',
        // Currency style defaults the minimum to 2, which renders "€412.0K".
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(amount);
    } catch {
      /* not a real ISO code — fall through to the long form */
    }
  }
  return formatMoney(amount, currency, locale);
}

/** A loaded deal, as much of it as the forecast reads. */
export interface ForecastRow extends RollupCard {
  id: string;
  lastSalesStageUpdateTime?: string | null;
}

export interface WeightedForecast {
  /** Σ amount × probability, or null when nothing summable was found. */
  amount: number | null;
  currency: string;
  /** Deals that carried BOTH an amount and a probability. */
  counted: number;
  /** Deals with an amount but no probability — excluded, never assumed. */
  missingProbability: number;
  unreadable: number;
  mixedCurrencies: boolean;
  loaded: number;
  /** Server truth for the set this was computed over. */
  total: number;
}

/**
 * Σ amount × probability over the open deals that carry both fields.
 *
 * A deal with an amount and no probability is **excluded and counted**, never
 * weighted at some per-stage default: the API stores no stage history, so a
 * stage-derived probability would be a number this module invented. The
 * excluded count is rendered beside the total for exactly that reason.
 */
export function weightedForecast(
  rows: readonly ForecastRow[],
  bindings: DealFieldBindings,
  total: number,
): WeightedForecast {
  const amountName = bindings.amount.name;
  const currencyName = bindings.currency.name;
  const probabilityName = bindings.probability.name;

  let sum = 0;
  let counted = 0;
  let missingProbability = 0;
  let unreadable = 0;
  const currencies = new Set<string>();

  for (const row of rows) {
    const values = attributeMap(row.attributes);
    const amount = readValue('money', values[amountName]);
    if (amount.parsed === null) {
      if (!amount.ok) unreadable += 1;
      continue;
    }
    const probability = readValue('percent', values[probabilityName]);
    if (probability.parsed === null) {
      missingProbability += 1;
      continue;
    }
    sum += (amount.parsed * probability.parsed) / 100;
    counted += 1;
    currencies.add(currencyOf(values, currencyName));
  }

  const mixedCurrencies = currencies.size > 1;
  return {
    amount: counted === 0 || mixedCurrencies ? null : sum,
    currency: currencies.size === 1 ? [...currencies][0]! : '',
    counted,
    missingProbability,
    unreadable,
    mixedCurrencies,
    loaded: rows.length,
    total,
  };
}

/* ── assembly ───────────────────────────────────────────────────────────── */

export interface StageStat {
  stage: SalesStageV2;
  /** Server truth for the window. */
  count: number;
  /** The same count for the preceding window, or null when there is none. */
  previous: number | null;
  delta: Delta | null;
  /** Loaded rows only — always rendered with its coverage. */
  rollup: ColumnRollup;
}

export type StageRows = Partial<Record<SalesStageV2, readonly ForecastRow[]>>;

/** Loaded rows for one stage, narrowed to the window they are being counted in. */
export function rowsInWindow(rows: readonly ForecastRow[] | undefined, window: DateWindow): ForecastRow[] {
  return (rows ?? []).filter((row) => inWindow(row.lastSalesStageUpdateTime, window));
}

/**
 * Everything the stage breakdown renders, in one pure step: the server's
 * windowed count, the previous window's count beside it, and a rollup over
 * whichever loaded rows fall inside the window.
 */
export function stageStats(
  totals: StageTotals,
  previous: StageTotals | null,
  rows: StageRows,
  bindings: DealFieldBindings,
  window: DateWindow,
): StageStat[] {
  return STAGES.map((stage) => {
    const count = totals[stage] ?? 0;
    const before = previous === null ? null : (previous[stage] ?? 0);
    return {
      stage,
      count,
      previous: before,
      delta: before === null ? null : delta(count, before),
      rollup: rollupColumn(rowsInWindow(rows[stage], window), bindings, count),
    };
  });
}

/** One rollup over several stages — the open pipeline, or every stage at once. */
export function combinedRollup(
  rows: StageRows,
  stages: readonly SalesStageV2[],
  bindings: DealFieldBindings,
  totals: StageTotals,
  window: DateWindow,
): ColumnRollup {
  const combined = stages.flatMap((stage) => rowsInWindow(rows[stage], window));
  return rollupColumn(combined, bindings, sumStages(totals, stages));
}
