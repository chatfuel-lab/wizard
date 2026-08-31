import { Card } from '~ui';
import { barPercent, formatDelta, formatRate, type Delta, type WinRate } from '../lib/forecast';

export interface WinRateCardProps {
  rate: WinRate;
  /** The same rate one window earlier, when there is a previous window. */
  previous: WinRate | null;
  windowLabel: string;
}

/**
 * `Won / (Won + Lost)` over the window — exact, because both halves are server
 * counts from `contactDealsByStages`.
 *
 * The caveat is rendered **beside** the number, not in a tooltip: a window
 * selects deals whose *last* stage update falls in it, which is not the set of
 * deals that entered the pipeline in it. Anyone reading this as a cohort win
 * rate would be reading it wrong, and a hover is not a place to put that.
 *
 * A window in which nothing closed has no win rate at all. `0%` would say "we
 * lost them all", so the card says so in words instead.
 */
export function WinRateCard({ rate, previous, windowLabel }: WinRateCardProps) {
  const wonShare = barPercent(rate.won, rate.decided);
  const change: Delta | null =
    previous === null || previous.rate === null || rate.rate === null
      ? null
      : {
          absolute: Math.round(rate.rate * 100) - Math.round(previous.rate * 100),
          ratio: null,
          direction: rate.rate === previous.rate ? 'flat' : rate.rate > previous.rate ? 'up' : 'down',
        };

  return (
    <Card title="Win rate" description={windowLabel}>
      <p className="text-2xl font-semibold tabular-nums text-text">
        {formatRate(rate.rate)}
        {change ? (
          <span className="ml-2 align-middle text-xs font-normal tabular-nums text-text-muted">
            {change.direction === 'flat' ? 'no change' : `${formatDelta(change).split(' · ')[0]} pts`}
          </span>
        ) : null}
      </p>

      {rate.decided === 0 ? (
        <p className="mt-1 text-sm text-text-muted">Nothing closed in this window, so there is no rate to report.</p>
      ) : (
        <>
          {/* Two labelled segments with a surface gap between them — the labels
              carry won/lost, the colours only reinforce it. */}
          <div className="mt-2 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken">
            {/* The same transition the stage bars carry, so the two bars on
                this view do not disagree about how a width changes. */}
            <div
              className="h-full shrink-0 rounded-full bg-success transition-[width] duration-base ease-standard"
              style={{ width: `${wonShare}%` }}
            />
            <div className="h-full flex-1 rounded-full bg-danger" />
          </div>
          <p className="mt-1.5 text-xs tabular-nums text-text-muted">
            <span className="text-success">{rate.won.toLocaleString()} won</span>
            <span className="text-text-faint"> · </span>
            <span className="text-danger">{rate.lost.toLocaleString()} lost</span>
            <span className="text-text-faint"> · {rate.decided.toLocaleString()} closed</span>
          </p>
        </>
      )}

      <p className="mt-2 text-xs text-text-muted">
        Counts the deals whose <em>last</em> stage change falls in this window — not the deals that entered the pipeline
        in it. The API stores one timestamp per deal, so this is a period summary, not a cohort.
      </p>
    </Card>
  );
}
