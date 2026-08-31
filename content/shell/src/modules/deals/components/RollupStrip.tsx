import { SalesStageV2 } from '~api/generated/deals/graphql';
import type { ColumnState } from '../hooks/useDealsBoard';
import type { DealFieldBindings } from '../lib/dealFieldBinding';
import {
  rollupAmountLabel,
  rollupCoverage,
  rollupExplanation,
  rollupGroup,
  type ColumnRollup,
} from '../lib/dealRollup';
import { OPEN_STAGES } from '../lib/stages';

export interface RollupStripProps {
  columns: Record<SalesStageV2, ColumnState>;
  bindings: DealFieldBindings;
}

function Figure({ label, rollup }: { label: string; rollup: ColumnRollup }) {
  const money = rollupAmountLabel(rollup);
  const coverage = rollupCoverage(rollup);
  return (
    /* whitespace-nowrap: a figure is a sentence and breaks as one or not at
       all. Without it three figures share one row, each gets a third of the
       width, and every one of them wraps internally — which is how a 36px strip
       ends up three lines tall and painted over its neighbours. */
    <div className="flex items-baseline gap-1.5 whitespace-nowrap" title={rollupExplanation(rollup)}>
      <span className="text-text-muted">{label}</span>
      <span className="font-medium tabular-nums">{money ?? '—'}</span>
      {/* The coverage already reads "53 of 68", so a bare "(68)" beside it was
          printing the same number twice. The total is only worth its own slot
          when there is no coverage to carry it. */}
      <span className="text-text-faint tabular-nums">{coverage ? `· ${coverage}` : `(${rollup.total})`}</span>
    </div>
  );
}

/**
 * Pipeline / Won / Lost across the top of the board.
 *
 * Every figure carries its coverage, always. There is no aggregation API of any
 * kind for attribute values, so these are sums over the rows that happen to be
 * loaded — a bare "€412k" above a board of 128 deals would be a wrong number
 * presented as a right one.
 */
export function RollupStrip({ columns, bindings }: RollupStripProps) {
  const open = rollupGroup(
    OPEN_STAGES.map((stage) => columns[stage]),
    bindings,
  );
  const won = rollupGroup([columns[SalesStageV2.Won]], bindings);
  const lost = rollupGroup([columns[SalesStageV2.Lost]], bindings);

  return (
    /* px-gutter, and it has to stay in step with the board's scroll container
       below it and the filter bar above it. All three read the same variable,
       so a band change moves them together or not at all — which is the point
       of the gutter being a variable rather than three literals. */
    /* min-h-9 and flex-wrap, not h-9. Three figures do not fit on one line
       below about 700px, and a fixed height cannot say so: the row overflows
       instead of growing, which paints the figures over the filter bar above
       them. Same reasoning as PageHeader and Toolbar — in a narrow container a
       strip of facts grows, it does not crush. */
    <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-6 gap-y-0.5 border-b border-border px-gutter py-1.5 text-xs">
      <Figure label="Open pipeline" rollup={open} />
      <Figure label="Won" rollup={won} />
      <Figure label="Lost" rollup={lost} />
    </div>
  );
}
