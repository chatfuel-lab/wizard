import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { IconChevronLeft, IconChevronRight } from '../icons';
import {
  addMonths,
  dateOfDayKey,
  monthBounds,
  monthKeyOf,
  monthMatrix,
  parseDayKey,
  shiftDayKey,
  weekdayOrder,
  type DayKey,
  type MonthKey,
  type Weekday,
} from '../lib/time/calendarDate';
import { Button } from '../primitives/Button';

export type DayMarker = 'available' | 'busy' | 'none';

export interface MiniCalendarProps {
  /** Controlled: the month shown. The parent owns it so it can fetch that month's availability. */
  month: MonthKey;
  onMonthChange: (month: MonthKey) => void;
  value?: DayKey | null;
  onChange?: (day: DayKey) => void;
  weekStartsOn?: Weekday;
  /** Inclusive bounds. */
  min?: DayKey;
  max?: DayKey;
  /** Beyond min/max — a closed day, a day with no schedule. */
  isDisabled?: (day: DayKey) => boolean;
  /** A dot under the number: green for a day with free slots, grey for a day that is full. */
  markers?: (day: DayKey) => DayMarker;
  /** Which day is today — in the BOT's zone, which is why it is a prop and not `new Date()`. */
  todayKey?: DayKey | null;
  locale?: string;
  'aria-label'?: string;
  className?: string;
}

const MARKER_CLASS: Record<DayMarker, string> = {
  available: 'bg-available',
  busy: 'bg-busy',
  none: '',
};

/**
 * A month at a glance, keyboard-complete: ←/→ ±1 day, ↑/↓ ±7, PageUp/PageDown
 * ±1 month, Home/End the week's ends, Enter/Space selects. Arrowing past the
 * visible matrix turns the month, and focus follows the day into it.
 *
 * Always 6×7 (`monthMatrix`), so paging never moves the rows. Days outside
 * the month are shown faint but are real days: a click on the 31st that
 * belongs to last month picks it AND turns the month to it, because that is
 * what the user pointed at.
 *
 * `todayKey` is a prop, not `new Date()`: the calendar this sits in shows the
 * bot's days, and "today" for a Berlin bot viewed from Mexico City at 22:00
 * local is already tomorrow.
 */
export function MiniCalendar({
  month,
  onMonthChange,
  value = null,
  onChange,
  weekStartsOn = 1,
  min,
  max,
  isDisabled,
  markers,
  todayKey = null,
  locale,
  className = '',
  ...aria
}: MiniCalendarProps) {
  const days = useMemo(() => monthMatrix(month, weekStartsOn), [month, weekStartsOn]);
  const bounds = monthBounds(month);
  const [focusedKey, setFocusedKey] = useState<DayKey | null>(null);
  const pendingFocus = useRef<DayKey | null>(null);
  const cellRefs = useRef(new Map<DayKey, HTMLButtonElement>());

  const disabled = useCallback(
    (day: DayKey) =>
      (min !== undefined && day < min) || (max !== undefined && day > max) || (isDisabled?.(day) ?? false),
    [isDisabled, max, min],
  );

  const monthLabel = useMemo(() => {
    const first = bounds ? dateOfDayKey(bounds.first) : null;
    return first ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(first) : month;
  }, [bounds, locale, month]);

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    /* 2026-08-16 is a Sunday; walk from it so the label matches the weekday index. */
    return weekdayOrder(weekStartsOn).map((weekday) => {
      const date = dateOfDayKey(shiftDayKey('2026-08-16', weekday))!;
      return { weekday, narrow: formatter.format(date), long: long.format(date) };
    });
  }, [locale, weekStartsOn]);

  /* Focus lands on the day that asked for it, once its cell exists — which
     may be one render later, if the arrow key also turned the month. */
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    const node = cellRefs.current.get(key);
    if (node) {
      pendingFocus.current = null;
      node.focus();
    }
  });

  const moveFocus = (day: DayKey) => {
    if (!parseDayKey(day)) return;
    setFocusedKey(day);
    pendingFocus.current = day;
    if (!days.includes(day)) onMonthChange(monthKeyOf(day));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, day: DayKey) => {
    let next: DayKey | null;
    switch (event.key) {
      case 'ArrowLeft':
        next = shiftDayKey(day, -1);
        break;
      case 'ArrowRight':
        next = shiftDayKey(day, 1);
        break;
      case 'ArrowUp':
        next = shiftDayKey(day, -7);
        break;
      case 'ArrowDown':
        next = shiftDayKey(day, 7);
        break;
      case 'PageUp': {
        const target = addMonths(monthKeyOf(day), -1);
        const targetBounds = monthBounds(target);
        next = targetBounds ? `${target}-${day.slice(8)}` : null;
        if (next && !parseDayKey(next)) next = targetBounds?.last ?? null;
        break;
      }
      case 'PageDown': {
        const target = addMonths(monthKeyOf(day), 1);
        const targetBounds = monthBounds(target);
        next = targetBounds ? `${target}-${day.slice(8)}` : null;
        if (next && !parseDayKey(next)) next = targetBounds?.last ?? null;
        break;
      }
      case 'Home': {
        const index = days.indexOf(day);
        next = index >= 0 ? days[index - (index % 7)]! : null;
        break;
      }
      case 'End': {
        const index = days.indexOf(day);
        next = index >= 0 ? days[index - (index % 7) + 6]! : null;
        break;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!disabled(day)) select(day);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next) moveFocus(next);
  };

  const select = (day: DayKey) => {
    onChange?.(day);
    setFocusedKey(day);
    if (monthKeyOf(day) !== month) onMonthChange(monthKeyOf(day));
  };

  /* Exactly one Tab stop: the selected day if visible, else today, else the 1st. */
  const tabStop =
    focusedKey && days.includes(focusedKey)
      ? focusedKey
      : value && days.includes(value)
        ? value
        : todayKey && days.includes(todayKey)
          ? todayKey
          : (bounds?.first ?? days[0]);

  return (
    <div className={`w-64 select-none ${className}`} aria-label={aria['aria-label']} role="group">
      <div className="mb-1 flex items-center justify-between">
        <Button
          iconOnly
          variant="ghost"
          size="sm"
          aria-label="Previous month"
          onClick={() => onMonthChange(addMonths(month, -1))}
        >
          <IconChevronLeft />
        </Button>
        <span aria-live="polite" className="text-label font-medium text-text">
          {monthLabel}
        </span>
        <Button
          iconOnly
          variant="ghost"
          size="sm"
          aria-label="Next month"
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          <IconChevronRight />
        </Button>
      </div>

      <div role="grid" aria-label={monthLabel} className="grid grid-cols-7 gap-y-0.5">
        <div role="row" className="contents">
          {weekdayLabels.map((label) => (
            <div
              key={label.weekday}
              role="columnheader"
              aria-label={label.long}
              className="h-6 text-center text-micro font-medium text-text-faint"
            >
              {label.narrow}
            </div>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} role="row" className="contents">
            {days.slice(row * 7, row * 7 + 7).map((day) => {
              const outside = monthKeyOf(day) !== month;
              const off = disabled(day);
              const selected = value === day;
              const today = todayKey === day;
              const marker = markers?.(day) ?? 'none';
              return (
                <div key={day} role="gridcell" aria-selected={selected} className="flex justify-center">
                  <button
                    ref={(node) => {
                      if (node) cellRefs.current.set(day, node);
                      else cellRefs.current.delete(day);
                    }}
                    type="button"
                    tabIndex={tabStop === day ? 0 : -1}
                    disabled={off}
                    aria-label={`${dateOfDayKey(day)?.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) ?? day}${today ? ', today' : ''}`}
                    aria-current={today ? 'date' : undefined}
                    onClick={() => select(day)}
                    onKeyDown={(event) => onKeyDown(event, day)}
                    onFocus={() => setFocusedKey(day)}
                    className={`relative flex h-8 w-8 flex-col items-center justify-center rounded-control text-label tabular-nums transition-colors duration-fast ease-standard focus-visible:focus-ring disabled:cursor-not-allowed ${
                      selected
                        ? 'bg-accent font-semibold text-accent-fg'
                        : today
                          ? 'font-semibold text-accent hover:bg-surface-hover'
                          : outside
                            ? 'text-text-faint hover:bg-surface-hover'
                            : 'text-text hover:bg-surface-hover'
                    } ${off ? 'text-text-faint opacity-50 line-through' : ''}`}
                  >
                    {Number(day.slice(8))}
                    {marker !== 'none' ? (
                      <span
                        aria-hidden
                        className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? 'bg-accent-fg' : MARKER_CLASS[marker]}`}
                      />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
