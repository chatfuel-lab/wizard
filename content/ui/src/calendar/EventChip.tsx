import type { ReactNode } from 'react';
import type { EventTone } from '../lib/time/eventPalette';

export type EventChipVariant = 'block' | 'chip';
export type EventChipTone = EventTone | 'neutral';
export type EventChipStatus = 'default' | 'tentative' | 'muted';

export interface EventToneClasses {
  /** Solid: the left bar of a block, the dot of a chip. */
  bar: string;
  /** The block's fill. */
  soft: string;
  /** Text on the soft fill. */
  fg: string;
  /** Solid as a border, for the tentative outline. */
  border: string;
}

/**
 * The tone → class map. A `Record`, never a template: Tailwind reads source
 * as text, and `bg-event-${n}-soft` generates nothing (validate 11(i)).
 * Exported so a module drawing its own legend or its own bar uses the same
 * eight recipes rather than a ninth.
 */
export const EVENT_TONE_CLASSES: Record<EventChipTone, EventToneClasses> = {
  1: { bar: 'bg-event-1', soft: 'bg-event-1-soft', fg: 'text-event-1-fg', border: 'border-event-1' },
  2: { bar: 'bg-event-2', soft: 'bg-event-2-soft', fg: 'text-event-2-fg', border: 'border-event-2' },
  3: { bar: 'bg-event-3', soft: 'bg-event-3-soft', fg: 'text-event-3-fg', border: 'border-event-3' },
  4: { bar: 'bg-event-4', soft: 'bg-event-4-soft', fg: 'text-event-4-fg', border: 'border-event-4' },
  5: { bar: 'bg-event-5', soft: 'bg-event-5-soft', fg: 'text-event-5-fg', border: 'border-event-5' },
  6: { bar: 'bg-event-6', soft: 'bg-event-6-soft', fg: 'text-event-6-fg', border: 'border-event-6' },
  7: { bar: 'bg-event-7', soft: 'bg-event-7-soft', fg: 'text-event-7-fg', border: 'border-event-7' },
  8: { bar: 'bg-event-8', soft: 'bg-event-8-soft', fg: 'text-event-8-fg', border: 'border-event-8' },
  neutral: { bar: 'bg-text-faint', soft: 'bg-surface-sunken', fg: 'text-text-muted', border: 'border-border-strong' },
};

export interface EventChipProps {
  /** `block` fills a time-grid slot; `chip` is a one-line pill for month cells and lists. */
  variant?: EventChipVariant;
  tone?: EventChipTone;
  /** `tentative` = dashed outline (pending, to reschedule); `muted` = greyed and struck (cancelled). */
  status?: EventChipStatus;
  title: ReactNode;
  /** Second line of a block — the service, the customer. */
  subtitle?: ReactNode;
  /** The time. Third line of a tall block, inline in a short one, trailing in a chip. */
  meta?: ReactNode;
  /**
   * The block's rendered height. Picks the layout: under 28px one line
   * (title · meta), under 44px two, otherwise three. The grid passes it from
   * `eventBox`; a block that renders its own three lines into 20px would clip
   * to a fragment of the first.
   */
  heightPx?: number;
  selected?: boolean;
  /** Leading slot of a chip: a dot is drawn by default; pass an avatar to replace it. */
  icon?: ReactNode;
  /** A trailing glyph — a check for attended, a warning for no-show. */
  trailing?: ReactNode;
  className?: string;
}

const ONE_LINE_PX = 28;
const TWO_LINE_PX = 44;

/**
 * The visual of one calendar event. Presentational only — the grid owns
 * position, drag, focus and keyboard; this owns tone, status and how many
 * lines fit. Status is expressed structurally rather than by colour, because
 * colour is already spoken for (it means WHO or WHAT, never how it is going):
 * tentative is a dashed edge, muted is grey and struck through.
 */
export function EventChip({
  variant = 'block',
  tone = 'neutral',
  status = 'default',
  title,
  subtitle,
  meta,
  heightPx,
  selected = false,
  icon,
  trailing,
  className = '',
}: EventChipProps) {
  const classes = EVENT_TONE_CLASSES[status === 'muted' ? 'neutral' : tone];

  if (variant === 'chip') {
    return (
      <span
        data-status={status}
        className={`flex h-5 min-w-0 items-center gap-1.5 rounded-chip px-1.5 text-micro font-medium ${
          status === 'muted' ? 'text-text-faint' : 'text-text'
        } ${selected ? 'bg-accent-soft' : 'hover:bg-surface-hover'} ${className}`}
      >
        {icon ?? (
          <span
            aria-hidden
            className={`h-2 w-2 shrink-0 rounded-full ${classes.bar} ${status === 'tentative' ? 'opacity-50' : ''}`}
          />
        )}
        {meta !== undefined ? <span className="shrink-0 tabular-nums text-text-muted">{meta}</span> : null}
        <span className={`min-w-0 flex-1 truncate ${status === 'muted' ? 'line-through' : ''}`}>{title}</span>
        {trailing !== undefined ? <span className="shrink-0 text-text-muted">{trailing}</span> : null}
      </span>
    );
  }

  const lines = heightPx === undefined ? 3 : heightPx < ONE_LINE_PX ? 1 : heightPx < TWO_LINE_PX ? 2 : 3;
  const surface =
    status === 'tentative'
      ? `border border-dashed ${classes.border} bg-surface-raised ${classes.fg}`
      : `${classes.soft} ${classes.fg}`;

  return (
    <span
      data-status={status}
      className={`@container relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-control pl-2 pr-1.5 text-micro leading-tight ${surface} ${
        lines === 1 ? 'justify-center py-0' : 'py-1'
      } ${status === 'muted' ? 'opacity-70' : ''} ${selected ? 'ring-2 ring-accent ring-inset' : ''} ${className}`}
    >
      {/* The tone bar: 3px, inset, its own element so a tentative block can be
          outlined in the same colour without the bar doubling the edge. */}
      <span aria-hidden className={`absolute inset-y-0.5 left-0.5 w-0.75 rounded-full ${classes.bar}`} />
      {lines === 1 ? (
        <span className="flex min-w-0 items-center gap-1">
          <span className={`min-w-0 flex-1 truncate font-medium ${status === 'muted' ? 'line-through' : ''}`}>
            {title}
          </span>
          {/* The time yields to the name in a lane too narrow for both — a
              container query on the block itself, so a half-lane block in a
              cluster drops it while its full-width neighbour keeps it. */}
          {meta !== undefined ? (
            <span className="hidden shrink-0 tabular-nums opacity-80 @min-[6.5rem]:inline">{meta}</span>
          ) : null}
          {trailing !== undefined ? <span className="shrink-0">{trailing}</span> : null}
        </span>
      ) : (
        <>
          <span className="flex min-w-0 items-start gap-1">
            <span className={`min-w-0 flex-1 truncate font-medium ${status === 'muted' ? 'line-through' : ''}`}>
              {title}
            </span>
            {trailing !== undefined ? <span className="shrink-0">{trailing}</span> : null}
          </span>
          {lines >= 2 && (subtitle !== undefined || (lines === 2 && meta !== undefined)) ? (
            <span className="truncate opacity-80">
              {subtitle ?? meta}
              {lines === 2 && subtitle !== undefined && meta !== undefined ? <> · {meta}</> : null}
            </span>
          ) : null}
          {lines === 3 && meta !== undefined ? (
            <span className="mt-auto truncate tabular-nums opacity-80">{meta}</span>
          ) : null}
        </>
      )}
    </span>
  );
}
