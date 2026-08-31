import { IconUser, ResourceHeader } from '~ui';
import { dayHoursLabel, toneOf, type CalendarColumn } from '../../lib/calendarLayout';
import { specialistTone } from '../../lib/colors';

export interface DayHeaderProps {
  dayKey: string;
  today: boolean;
  /** Bookings in the column — the count is the header's second line in a week. */
  count: number;
  /** In week mode a click drills into the day. */
  onClick?: () => void;
  locale?: string;
}

/** Local noon of a key — for `Intl` only. */
const dateOf = (dayKey: string) => {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 12);
};

/** "MON 17" with today's number on the accent disc; a button in week mode. */
export function DayHeader({ dayKey, today, count, onClick, locale }: DayHeaderProps) {
  const date = dateOf(dayKey);
  const inner = (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className={`text-micro uppercase ${today ? 'text-accent' : 'text-text-muted'}`}>
        {date.toLocaleDateString(locale, { weekday: 'short' })}
      </span>
      <span
        className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-label tabular-nums ${
          today ? 'bg-accent font-semibold text-accent-fg' : 'font-medium text-text'
        }`}
      >
        {date.getDate()}
      </span>
      {count > 0 ? <span className="hidden text-micro tabular-nums text-text-faint @wide:inline">{count}</span> : null}
    </span>
  );
  if (!onClick) return inner;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}${today ? ', today' : ''} — open the day`}
      className="-mx-1 rounded-control px-1 hover:bg-surface-hover focus-visible:focus-ring"
    >
      {inner}
    </button>
  );
}

export interface SpecialistHeaderProps {
  column: Extract<CalendarColumn, { kind: 'specialist' }>;
  catalogOrder: readonly string[];
  /** Tone dot only when the calendar colours by specialist. */
  showTone: boolean;
  count: number;
  /** `zoneShiftMinutes` for the day — the hours line reads in the display zone. */
  shift: number;
}

/** Avatar · name · tone dot · today's hours; Unassigned and deleted references get a plainer look. */
export function SpecialistHeader({ column, catalogOrder, showTone, count, shift }: SpecialistHeaderProps) {
  const sp = column.specialist;
  if (!sp) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-text-muted">
          <IconUser size={12} />
        </span>
        <span className="min-w-0">
          <span
            className={`block truncate text-label font-medium ${column.deleted ? 'italic text-text-muted' : 'text-text'}`}
          >
            {column.label}
          </span>
          <span className="block truncate text-micro text-text-muted">
            {count === 1 ? '1 booking' : `${count} bookings`}
          </span>
        </span>
      </span>
    );
  }
  const tone = showTone ? toneOf(specialistTone(sp.id, catalogOrder)) : undefined;
  return (
    <ResourceHeader
      name={column.label}
      avatarSrc={sp.profile.logo?.url}
      tone={tone === 'neutral' ? undefined : tone}
      meta={dayHoursLabel(sp, column.dayKey, shift)}
      size="sm"
    />
  );
}
