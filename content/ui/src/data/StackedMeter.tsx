import { type ReactNode } from 'react';
import { EVENT_TONE_CLASSES, type EventChipTone } from '../calendar/EventChip';

export interface StackedMeterSegment {
  id: string;
  label: string;
  value: number;
  tone?: EventChipTone;
  /** Replaces the computed "42%" under the label — a character count, a size, a price. */
  display?: ReactNode;
}

export interface StackedMeterProps {
  segments: readonly StackedMeterSegment[];
  /**
   * The denominator. Omit and the segments' own sum is used — which is the
   * right default for a composition ("what is this made of") and wrong for a
   * quota ("how much of the allowance is gone"). Pass it only when a real
   * ceiling exists; a made-up one turns a fact into a guess.
   */
  total?: number;
  /** Names the bar for a screen reader. */
  label: string;
  /** One line under the bar instead of the legend — for a rail or a card. */
  compact?: boolean;
  /** Rendered at the end of the legend: a caveat, a link, a warning. */
  footer?: ReactNode;
  className?: string;
}

/** Segments smaller than this keep a visible sliver rather than vanishing. */
const MIN_VISIBLE_PERCENT = 1.5;

const percent = (value: number, total: number): number => (total > 0 ? (value / total) * 100 : 0);

const format = (value: number): string => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * One bar split into labelled parts — what a quantity is MADE OF, as opposed
 * to `Progress`, which is how far along one quantity is.
 *
 * The distinction matters because the two read as opposites: a progress bar
 * that is nearly full is nearly done and good; a composition bar that is
 * nearly all one colour is lopsided and usually bad. Anything that answers
 * "where did it all go" — a storage breakdown, a budget, a status mix — is
 * this component, and it deliberately does not accept a `max` it can render as
 * empty track unless the caller passes a real `total`.
 *
 * Zero-value segments are dropped rather than drawn as a hairline, but a
 * segment with a real, tiny value keeps a visible sliver: "almost nothing" and
 * "nothing" are different answers and the bar must not merge them.
 */
export function StackedMeter({ segments, total, label, compact = false, footer, className = '' }: StackedMeterProps) {
  const present = segments.filter((segment) => segment.value > 0);
  const sum = present.reduce((accumulator, segment) => accumulator + segment.value, 0);
  const denominator = total ?? sum;
  const empty = present.length === 0 || denominator <= 0;

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={
          empty
            ? `${label}: nothing yet`
            : `${label}: ${present.map((segment) => `${segment.label} ${format(segment.value)}`).join(', ')}`
        }
        className="flex h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        {present.map((segment) => {
          const width = Math.max(MIN_VISIBLE_PERCENT, percent(segment.value, denominator));
          const classes = EVENT_TONE_CLASSES[segment.tone ?? 'neutral'];
          return <span key={segment.id} className={`h-full ${classes.bar}`} style={{ width: `${width}%` }} />;
        })}
      </div>

      {compact ? (
        <p className="mt-1.5 truncate text-micro text-text-faint">
          {empty
            ? 'Nothing yet'
            : present
                .map((segment) => `${segment.label} ${Math.round(percent(segment.value, denominator))}%`)
                .join(' · ')}
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 @compact:grid-cols-2">
          {present.map((segment) => {
            const classes = EVENT_TONE_CLASSES[segment.tone ?? 'neutral'];
            return (
              <li key={segment.id} className="flex min-w-0 items-center gap-2">
                <span aria-hidden className={`size-2 shrink-0 rounded-full ${classes.bar}`} />
                <span className="min-w-0 flex-1 truncate text-xs text-text">{segment.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-text-muted">
                  {segment.display ?? `${Math.round(percent(segment.value, denominator))}%`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {footer ? <div className="mt-2 text-xs text-text-muted">{footer}</div> : null}
    </div>
  );
}
