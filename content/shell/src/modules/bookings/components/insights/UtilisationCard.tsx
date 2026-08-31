import { Card } from '~ui';
import { formatMinutes, formatRate, type Utilisation } from '../../lib/insights';

export interface UtilisationCardProps {
  rows: readonly Utilisation[];
  coverage: string;
  stale?: boolean;
}

/**
 * One meter per specialist: occupied minutes over scheduled minutes. A meter,
 * not a bar chart — each row is a single ratio against its own limit, and the
 * unfilled track is a lighter step of the same hue (accent on accent-soft) so
 * state reads across the whole bar. Rows sort by ratio, "no schedule" last
 * and said in words: there is no denominator, and 0% would be a lie.
 */
export function UtilisationCard({ rows, coverage, stale = false }: UtilisationCardProps) {
  const sorted = [...rows].sort((a, b) => {
    if (a.ratio === null && b.ratio === null) return b.occupiedMinutes - a.occupiedMinutes;
    if (a.ratio === null) return 1;
    if (b.ratio === null) return -1;
    return b.ratio - a.ratio;
  });
  return (
    <Card
      title="Utilisation"
      description="Booked minutes (everything but Canceled) over each specialist's scheduled minutes in the range."
      className={`transition-opacity duration-base ease-standard ${stale ? 'opacity-60' : ''}`}
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-text-muted">No specialists yet — add one under Staff.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((u) => {
            const pct = u.ratio === null ? null : Math.min(1, u.ratio);
            const label =
              u.ratio === null
                ? u.scheduledMinutes === null
                  ? 'No schedule'
                  : 'No hours in range'
                : formatRate(u.ratio);
            const detail =
              u.scheduledMinutes === null
                ? `${formatMinutes(u.occupiedMinutes)} booked · no working hours set`
                : `${formatMinutes(u.occupiedMinutes)} of ${formatMinutes(u.scheduledMinutes)}`;
            return (
              <li key={u.specialistId} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-text">{u.name}</span>
                  <span
                    className={`shrink-0 tabular-nums ${u.ratio === null ? 'text-xs text-text-faint' : 'font-medium text-text'}`}
                  >
                    {label}
                  </span>
                </div>
                {pct === null ? null : (
                  <div
                    role="meter"
                    aria-label={`${u.name} utilisation`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round((u.ratio ?? 0) * 100)}
                    className="h-1.5 w-full overflow-hidden rounded-full bg-accent-soft"
                    title={detail}
                  >
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-base ease-standard"
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                )}
                <span className="text-xs tabular-nums text-text-muted">
                  {detail}
                  {u.ratio !== null && u.ratio > 1 ? <span className="text-warning"> · over-booked</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-micro text-text-faint">{coverage}</p>
    </Card>
  );
}
