import { useMemo } from 'react';
import { DropdownMenu, type MenuItem } from '../floating/DropdownMenu';
import { TimeInput } from '../forms/TimeInput';
import { Switch } from '../forms/Switch';
import { IconClose, IconCopy, IconPlus } from '../icons';
import { dateOfDayKey, shiftDayKey, weekdayOrder, type Weekday } from '../lib/time/calendarDate';
import { parseHHmm } from '../lib/time/timeOfDay';
import { Button } from '../primitives/Button';

export interface DayBreak {
  start: string;
  end: string;
}

export interface DayHours {
  enabled: boolean;
  /** `HH:mm`. */
  start: string;
  end: string;
  /** One break, or none — the API's `SpecialistScheduleInput` has exactly one. */
  break: DayBreak | null;
}

/** 1:1 with the API's per-weekday schedule shape; keyed by `Date.getDay()` weekday. */
export type WeekHours = Record<Weekday, DayHours>;

export interface WeekHoursEditorProps {
  value: WeekHours;
  onChange: (value: WeekHours) => void;
  weekStartsOn?: Weekday;
  /** A message per row, shown under it. From the caller's own validation or the API. */
  errors?: Partial<Record<Weekday, string>>;
  hour12?: boolean;
  locale?: string;
  /** Minutes between listed times. */
  step?: number;
  /**
   * Off for a schedule whose API has no break field. The row then stops
   * offering one, rather than accepting a break the save would silently drop —
   * Chatfuel's opening hours (`FuelyBusinessHoursDayScheduleInput`) are one
   * range per day and nothing else.
   */
  breaks?: boolean;
  disabled?: boolean;
  className?: string;
}

export const DEFAULT_DAY_HOURS: DayHours = { enabled: false, start: '09:00', end: '18:00', break: null };

/** Mon–Fri 09:00–18:00, weekend off — the sensible starting point for a new schedule. */
export function defaultWeekHours(): WeekHours {
  return {
    0: { ...DEFAULT_DAY_HOURS },
    1: { ...DEFAULT_DAY_HOURS, enabled: true },
    2: { ...DEFAULT_DAY_HOURS, enabled: true },
    3: { ...DEFAULT_DAY_HOURS, enabled: true },
    4: { ...DEFAULT_DAY_HOURS, enabled: true },
    5: { ...DEFAULT_DAY_HOURS, enabled: true },
    6: { ...DEFAULT_DAY_HOURS },
  };
}

/**
 * The rule for one row, or null when it is fine. Disabled rows are always
 * fine — the times are kept but not checked, so re-enabling brings them
 * back intact.
 */
export function validateDayHours(day: DayHours): string | null {
  if (!day.enabled) return null;
  const start = parseHHmm(day.start);
  const end = parseHHmm(day.end);
  if (start === null || end === null) return 'Enter a start and an end time';
  if (end <= start) return 'End must be after start';
  if (day.break) {
    const breakStart = parseHHmm(day.break.start);
    const breakEnd = parseHHmm(day.break.end);
    if (breakStart === null || breakEnd === null) return 'Enter the break’s start and end';
    if (breakEnd <= breakStart) return 'Break must end after it starts';
    if (breakStart < start || breakEnd > end) return 'Break must be inside the working hours';
  }
  return null;
}

/** Every row's message, keyed by weekday; empty when the week is valid. */
export function validateWeekHours(value: WeekHours): Partial<Record<Weekday, string>> {
  const out: Partial<Record<Weekday, string>> = {};
  for (const key of Object.keys(value)) {
    const weekday = Number(key) as Weekday;
    const message = validateDayHours(value[weekday]);
    if (message) out[weekday] = message;
  }
  return out;
}

const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5];

/**
 * Seven rows: switch, start–end, one optional break, and a copy menu — the
 * Cal.com availability editor's shape, sized to the API's schedule input,
 * which has exactly one break per day and no second range.
 *
 * "Copy to all" / "Copy to weekdays" copy the ROW (enabled + times + break),
 * because that is what a person means when they set Monday up and reach for
 * the copy button. Validation is the caller's to run (`validateWeekHours`)
 * and pass back as `errors`, so a server-side rejection lands on the same
 * line as a local one.
 */
export function WeekHoursEditor({
  value,
  onChange,
  weekStartsOn = 1,
  errors,
  hour12,
  locale,
  step = 15,
  breaks = true,
  disabled = false,
  className = '',
}: WeekHoursEditorProps) {
  const rows = useMemo(() => {
    const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    const short = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return weekdayOrder(weekStartsOn).map((weekday) => {
      const date = dateOfDayKey(shiftDayKey('2026-08-16', weekday))!;
      return { weekday, long: long.format(date), short: short.format(date) };
    });
  }, [locale, weekStartsOn]);

  const update = (weekday: Weekday, patch: Partial<DayHours>) =>
    onChange({ ...value, [weekday]: { ...value[weekday], ...patch } });

  const copy = (from: Weekday, to: readonly Weekday[]) => {
    const source = value[from];
    const next = { ...value };
    for (const weekday of to) {
      if (weekday === from) continue;
      next[weekday] = { ...source, break: source.break ? { ...source.break } : null };
    }
    onChange(next);
  };

  return (
    <div className={`flex flex-col divide-y divide-border-subtle ${className}`}>
      {rows.map(({ weekday, long, short }) => {
        const day = value[weekday];
        const error = errors?.[weekday];
        const menu: MenuItem[] = [
          {
            id: 'all',
            label: 'Copy to all days',
            onSelect: () => copy(weekday, [0, 1, 2, 3, 4, 5, 6]),
          },
          {
            id: 'weekdays',
            label: 'Copy to weekdays',
            onSelect: () => copy(weekday, WEEKDAYS),
          },
        ];
        return (
          <div key={weekday} className="flex flex-col gap-1.5 py-2.5">
            <div className="flex items-start gap-x-3">
              <div className="flex h-field-sm w-28 shrink-0 items-center gap-2">
                <Switch
                  checked={day.enabled}
                  onChange={(enabled) => update(weekday, { enabled })}
                  disabled={disabled}
                  aria-label={long}
                />
                <span className={`text-body ${day.enabled ? 'text-text' : 'text-text-muted'}`} title={long}>
                  {short}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
                {day.enabled ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <TimeInput
                        value={day.start}
                        onChange={(start) => update(weekday, { start: start ?? day.start })}
                        step={step}
                        hour12={hour12}
                        locale={locale}
                        disabled={disabled}
                        invalid={error !== undefined}
                        size="sm"
                        aria-label={`${long} start`}
                      />
                      <span className="text-label text-text-faint">–</span>
                      <TimeInput
                        value={day.end}
                        onChange={(end) => update(weekday, { end: end ?? day.end })}
                        step={step}
                        max="24:00"
                        hour12={hour12}
                        locale={locale}
                        disabled={disabled}
                        invalid={error !== undefined}
                        size="sm"
                        aria-label={`${long} end`}
                      />
                    </div>

                    {!breaks ? null : day.break ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-label text-text-muted">Break</span>
                        <TimeInput
                          value={day.break.start}
                          onChange={(start) =>
                            update(weekday, { break: { ...day.break!, start: start ?? day.break!.start } })
                          }
                          step={step}
                          min={day.start}
                          max={day.end}
                          hour12={hour12}
                          locale={locale}
                          disabled={disabled}
                          size="sm"
                          aria-label={`${long} break start`}
                        />
                        <span className="text-label text-text-faint">–</span>
                        <TimeInput
                          value={day.break.end}
                          onChange={(end) => update(weekday, { break: { ...day.break!, end: end ?? day.break!.end } })}
                          step={step}
                          min={day.start}
                          max={day.end}
                          hour12={hour12}
                          locale={locale}
                          disabled={disabled}
                          size="sm"
                          aria-label={`${long} break end`}
                        />
                        <Button
                          iconOnly
                          variant="ghost"
                          size="sm"
                          disabled={disabled}
                          aria-label={`Remove ${long} break`}
                          onClick={() => update(weekday, { break: null })}
                        >
                          <IconClose />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => update(weekday, { break: { start: '13:00', end: '14:00' } })}
                      >
                        <IconPlus /> Add break
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="flex h-field-sm items-center text-label text-text-faint">Unavailable</span>
                )}
              </div>

              <div className="shrink-0">
                <DropdownMenu
                  items={menu}
                  aria-label={`Copy ${long}`}
                  trigger={(props) => (
                    <Button
                      {...props}
                      iconOnly
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      aria-label={`Copy ${long} to other days`}
                    >
                      <IconCopy />
                    </Button>
                  )}
                />
              </div>
            </div>
            {error ? (
              <p role="alert" className="pl-31 text-micro text-danger">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
