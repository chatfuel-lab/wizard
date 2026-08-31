import { BookingStatus } from '~api/generated/bookings/graphql';
import { Card } from '~ui';
import { formatRate, type StatusSlice } from '../../lib/insights';
import type { StatusTone } from '../../lib/status';

export interface StatusMixCardProps {
  mix: readonly StatusSlice[];
  total: number;
  coverage: string;
  stale?: boolean;
}

/**
 * Status tones are STATUS colours — reserved for state, which is exactly what
 * this bar shows — so the segments wear them. Pending and Reschedule share the
 * warning hue (both are "tentative"); Reschedule takes the lighter step of it,
 * and the legend beside the bar carries every identity with its count, so
 * colour never stands alone. A `Record`, never a template: Tailwind reads
 * source as text.
 */
const SEGMENT: Record<StatusTone, string> = {
  neutral: 'bg-text-faint',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};
const RESCHEDULE_SEGMENT = 'bg-warning/60';

export function StatusMixCard({ mix, total, coverage, stale = false }: StatusMixCardProps) {
  const present = mix.filter((s) => s.count > 0);
  return (
    <Card
      title="Status mix"
      description="Every booking in the range, by its current status."
      className={`transition-opacity duration-base ease-standard ${stale ? 'opacity-60' : ''}`}
    >
      {total === 0 ? (
        <p className="text-sm text-text-muted">No bookings in this range.</p>
      ) : (
        <>
          {/* Thin marks, a 2px surface gap between segments (the `gap-0.5` on a
              surface-sunken track), no borders. */}
          <div
            className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken"
            role="img"
            aria-label={present.map((s) => `${s.label} ${s.count}`).join(', ')}
          >
            {present.map((s) => (
              <div
                key={s.status}
                title={`${s.label}: ${s.count} (${formatRate(s.share)})`}
                className={`h-full rounded-full ${s.status === BookingStatus.Reschedule ? RESCHEDULE_SEGMENT : SEGMENT[s.tone]} transition-[flex-basis] duration-base ease-standard`}
                style={{ flexBasis: `${s.share * 100}%`, flexGrow: 0, flexShrink: 1, minWidth: 4 }}
              />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs @wide:grid-cols-3">
            {mix.map((s) => (
              <li
                key={s.status}
                className={`flex items-center gap-2 ${s.count === 0 ? 'text-text-faint' : 'text-text-muted'}`}
              >
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-full ${s.status === BookingStatus.Reschedule ? RESCHEDULE_SEGMENT : SEGMENT[s.tone]} ${s.count === 0 ? 'opacity-40' : ''}`}
                />
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span className="tabular-nums text-text">{s.count.toLocaleString()}</span>
                <span className="w-9 text-right tabular-nums">{formatRate(s.share)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-micro text-text-faint">{coverage}</p>
    </Card>
  );
}
