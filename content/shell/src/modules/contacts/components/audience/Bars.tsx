import type { ReactNode } from 'react';
import { Button, Card } from '~ui';

/**
 * The Audience page's marks, in one file so the four cards read as one chart
 * system rather than four charts.
 *
 * Every list here is ONE series — a count of contacts — so every bar in a list
 * wears one hue and identity comes from the label beside it, never from the
 * colour. The two exceptions are the terminal stages: Won and Lost are states,
 * not series, so they take the status tokens, and they are still labelled in
 * words. Nothing is colour-only and nothing is hover-only.
 *
 * Two bar shapes, and the difference is the denominator:
 *
 * - **rank** — the bar is drawn against the biggest row in its own list, so
 *   the shape shows which channel or which owner is the busiest. The track is
 *   the sunken surface.
 * - **meter** — the bar is drawn against a real, known whole (every contact on
 *   the bot), so 40% means forty percent of the address book. The track is a
 *   lighter step of the fill's own hue, which is what makes a half-full meter
 *   read as half-full rather than as a short bar.
 *
 * A `Record`, never a template string: Tailwind reads source as text, and
 * `bg-${tone}` generates no rule at all.
 */
export type BarTone = 'series' | 'accent' | 'success' | 'danger';

const FILL: Record<BarTone, string> = {
  series: 'bg-event-1',
  accent: 'bg-accent',
  success: 'bg-success',
  danger: 'bg-danger',
};

const METER_TRACK: Record<BarTone, string> = {
  series: 'bg-event-1-soft',
  accent: 'bg-accent-soft',
  success: 'bg-success-soft',
  danger: 'bg-danger-soft',
};

export interface BarRowProps {
  label: ReactNode;
  /** Fixed-width leading column, so a list of bars shares one left edge. */
  labelWidth?: string;
  /** 0..1, already clamped by `lib/audience.ts`. */
  fraction: number;
  tone?: BarTone;
  shape?: 'rank' | 'meter';
  /** The figure at the right end. */
  value: ReactNode;
  /** A second, quieter figure — usually the share. */
  detail?: ReactNode;
  /** Full sentence for hover and for screen readers. */
  title: string;
  /** Dims the row: a zero-count row is context, not the answer. */
  muted?: boolean;
  /** A chip after the label — "default set", say. */
  badge?: ReactNode;
}

export function BarRow({
  label,
  labelWidth = '9rem',
  fraction,
  tone = 'series',
  shape = 'rank',
  value,
  detail,
  title,
  muted = false,
  badge,
}: BarRowProps) {
  return (
    <li className="flex items-center gap-3 text-xs" title={title}>
      <span
        className={`flex min-w-0 shrink-0 items-center gap-1.5 truncate ${muted ? 'text-text-faint' : 'text-text-muted'}`}
        style={{ width: labelWidth }}
      >
        <span className="min-w-0 truncate">{label}</span>
        {badge}
      </span>
      {/* Thin mark, square at the baseline and rounded at the data end. */}
      <span
        className={`relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full ${
          shape === 'meter' ? METER_TRACK[tone] : 'bg-surface-sunken'
        }`}
        role="img"
        aria-label={title}
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-r-full ${FILL[tone]} transition-[width] duration-base ease-standard`}
          style={{ width: `${fraction * 100}%`, opacity: muted ? 0.45 : 1 }}
        />
      </span>
      <span className={`w-12 shrink-0 text-right tabular-nums ${muted ? 'text-text-faint' : 'font-medium text-text'}`}>
        {value}
      </span>
      {detail !== undefined ? (
        <span className="w-10 shrink-0 text-right tabular-nums text-text-faint">{detail}</span>
      ) : null}
    </li>
  );
}

export interface SectionCardProps {
  title: string;
  description: string;
  /** An "as of" line, when the card needs one. Usually it does not. */
  coverage?: string;
  error?: string | null;
  onRetry?: () => void;
  /** Held at reduced opacity through a refresh instead of flashing a skeleton. */
  stale?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * One card of the page: header, body, the caveat that applies to this body
 * only, and the coverage line.
 *
 * A section that failed keeps its own card and says why, because the eleven
 * counts behind this page are eleven separate calls and one of them falling
 * over is not a reason to blank the other ten.
 */
export function SectionCard({
  title,
  description,
  coverage,
  error,
  onRetry,
  stale = false,
  actions,
  children,
}: SectionCardProps) {
  return (
    <Card
      title={title}
      description={description}
      actions={actions}
      className={`transition-opacity duration-base ease-standard ${stale ? 'opacity-60' : ''}`}
    >
      {error ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-text-muted">{error}</p>
          {onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : (
        children
      )}
      {coverage ? <p className="mt-3 text-micro text-text-faint">{coverage}</p> : null}
    </Card>
  );
}
