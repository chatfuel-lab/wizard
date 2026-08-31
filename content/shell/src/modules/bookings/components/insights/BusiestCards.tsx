import { Card } from '~ui';
import { peaks, shareOfMax, trimHours, type Bucket } from '../../lib/insights';

/** Column height of the hours plot, px — the axis band sits below it, so the card never scrolls. */
const HOURS_PLOT_PX = 96;
/** Bars are thin marks: 24px is the cap, the band's leftover is air. */
const BAR_MAX_PX = 24;

interface BusiestProps {
  coverage: string;
  stale?: boolean;
}

/**
 * Busiest weekdays: seven horizontal bars, one series, one hue (`event-1` —
 * a slot of the categorical palette, not a status colour). The peak day
 * carries its count in text ink; the rest keep theirs muted so the eye lands
 * on the answer first. Every bar has a title for hover and an aria label,
 * so nothing is colour-only or hover-only.
 */
export function BusiestWeekdaysCard({
  buckets,
  coverage,
  stale = false,
}: BusiestProps & { buckets: readonly Bucket[] }) {
  const top = new Set(peaks(buckets).map((b) => b.key));
  const empty = top.size === 0;
  return (
    <Card
      title="Busiest weekdays"
      description="Bookings by the weekday they start on, in the display zone."
      className={`transition-opacity duration-base ease-standard ${stale ? 'opacity-60' : ''}`}
    >
      <ul className="flex flex-col gap-1.5" aria-label="Bookings per weekday">
        {buckets.map((b) => {
          const share = shareOfMax(b.count, buckets);
          const peak = top.has(b.key);
          return (
            <li
              key={b.key}
              className="flex items-center gap-3 text-xs"
              title={`${b.label}: ${b.count} ${b.count === 1 ? 'booking' : 'bookings'}`}
            >
              <span className="w-8 shrink-0 text-text-muted">{b.label}</span>
              <span
                className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken"
                role="img"
                aria-label={`${b.label}: ${b.count}`}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-r-full bg-event-1 transition-[width] duration-base ease-standard"
                  style={{ width: `${share * 100}%`, opacity: empty ? 0 : peak ? 1 : 0.7 }}
                />
              </span>
              <span
                className={`w-6 shrink-0 text-right tabular-nums ${peak && !empty ? 'font-medium text-text' : 'text-text-faint'}`}
              >
                {b.count}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-micro text-text-faint">{coverage}</p>
    </Card>
  );
}

/**
 * Busiest hours: columns over the trimmed hour axis (`trimHours` — the busy
 * span padded an hour each side, never narrower than a working day). Same
 * hue as the weekdays: it is the same measure. Only the peak columns carry a
 * value; the axis labels every second or third hour so they never collide.
 */
export function BusiestHoursCard({ buckets, coverage, stale = false }: BusiestProps & { buckets: readonly Bucket[] }) {
  const shown = trimHours(buckets);
  const top = new Set(peaks(shown).map((b) => b.key));
  const empty = top.size === 0;
  const labelEvery = shown.length > 14 ? 3 : 2;
  return (
    <Card
      title="Busiest hours"
      description="Bookings by the hour they start in, in the display zone."
      className={`transition-opacity duration-base ease-standard ${stale ? 'opacity-60' : ''}`}
    >
      <div
        className="flex items-end gap-1"
        style={{ height: HOURS_PLOT_PX + 40 }}
        role="img"
        aria-label={shown.map((b) => `${b.label}: ${b.count}`).join(', ')}
      >
        {shown.map((b, i) => {
          const share = shareOfMax(b.count, shown);
          const peak = top.has(b.key) && !empty;
          const labelled = i % labelEvery === 0;
          return (
            <div
              key={b.key}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`${b.label}: ${b.count} ${b.count === 1 ? 'booking' : 'bookings'}`}
            >
              {peak ? <span className="mb-0.5 text-micro font-medium tabular-nums text-text">{b.count}</span> : null}
              <span
                className="w-full rounded-t bg-event-1 transition-[height] duration-base ease-standard"
                style={{
                  height: Math.max(b.count > 0 ? 3 : 1, Math.round(share * HOURS_PLOT_PX)),
                  maxWidth: BAR_MAX_PX,
                  opacity: b.count === 0 ? 0.25 : peak ? 1 : 0.7,
                }}
              />
              <span className={`mt-1 h-4 text-micro tabular-nums text-text-faint ${labelled ? '' : 'invisible'}`}>
                {b.label.replace(':00', '').replace(/^0/, '')}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-micro text-text-faint">{coverage}</p>
    </Card>
  );
}
