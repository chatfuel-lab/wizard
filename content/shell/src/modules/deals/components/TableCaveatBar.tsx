import { useEffect, useRef } from 'react';
import { Alert, Button, DURATION, EASING, prefersReducedMotion } from '~ui';
import type { Caveat } from '../lib/queryPlan';

export interface TableCaveatBarProps {
  caveats: readonly Caveat[];
  /**
   * Offered only when there is something to go back to — dropping the
   * attribute filters and the sort returns the table to engine B, which is
   * live, deal-isolated and exact.
   */
  onRelax?: () => void;
}

/**
 * What the current route costs, in plain language and only when it is true.
 *
 * Every string here comes from `planQuery` or `countGapCaveat`, and every one
 * of them is asserted in `queryPlan.test.ts`. Nothing is composed in this file:
 * a caveat that cannot be written by a tested pure function does not get shown,
 * which is what keeps the bar from drifting into either lies or wallpaper.
 *
 * A bar carrying only the measured count gap is `info` and not `warning` — it
 * is a fact about the bot, not a cost of a choice the user made.
 *
 * **The measured gap is also the table's live count** ("Showing 118 of 124
 * deals"), and a subscription moves it while nobody is looking. A number that
 * changes silently is a number nobody trusts, so a change in the text — not a
 * re-render, not a new array — cross-fades the bar once. The bar's own arrival
 * is a CSS enter; only the in-place update needs WAAPI, and WAAPI cannot see
 * the reduced-motion token collapse, hence the explicit check.
 */
export function TableCaveatBar({ caveats, onRelax }: TableCaveatBarProps) {
  const signature = caveats.map((caveat) => `${caveat.id}:${caveat.text}`).join('|');
  const barRef = useRef<HTMLDivElement>(null);
  const shown = useRef(signature);

  useEffect(() => {
    if (shown.current === signature) return;
    shown.current = signature;
    if (signature === '' || prefersReducedMotion()) return;
    barRef.current?.animate([{ opacity: 0.3 }, { opacity: 1 }], {
      duration: DURATION.base,
      easing: EASING.entrance,
    });
  }, [signature]);

  if (caveats.length === 0) return null;
  const measuredOnly = caveats.every((caveat) => caveat.id === 'gap');
  const single = caveats.length === 1;

  return (
    <div ref={barRef} className="px-gutter pt-3 animate-slide-in-top">
      <Alert
        tone={measuredOnly ? 'info' : 'warning'}
        title={measuredOnly ? undefined : 'This list is an attribute search'}
        action={
          onRelax ? (
            <Button variant="ghost" size="sm" onClick={onRelax}>
              Back to the live list
            </Button>
          ) : undefined
        }
      >
        {single ? (
          <span>{caveats[0]?.text}</span>
        ) : (
          <ul className="list-disc space-y-1 pl-4">
            {caveats.map((caveat) => (
              <li key={caveat.id}>{caveat.text}</li>
            ))}
          </ul>
        )}
      </Alert>
    </div>
  );
}
