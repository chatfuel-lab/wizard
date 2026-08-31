import { useMemo, useState } from 'react';
import { MiniCalendar, type MiniCalendarProps } from '../calendar/MiniCalendar';
import { Popover } from '../floating/Popover';
import { IconCalendar, IconClose } from '../icons';
import { dateOfDayKey, dayKeyOf, monthKeyOf, type DayKey, type MonthKey } from '../lib/time/calendarDate';
import { Button } from '../primitives/Button';

export interface DatePickerPopoverProps extends Pick<
  MiniCalendarProps,
  'weekStartsOn' | 'min' | 'max' | 'isDisabled' | 'markers' | 'todayKey' | 'locale'
> {
  value: DayKey | null;
  onChange: (value: DayKey | null) => void;
  /** Controlled month; omit and the picker opens on the value's month (or today's). */
  month?: MonthKey;
  onMonthChange?: (month: MonthKey) => void;
  placeholder?: string;
  /** How the trigger prints the value. Default: `Mon, Aug 17` in the locale. */
  format?: (day: DayKey) => string;
  /** Offer an × to go back to empty. */
  clearable?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

/**
 * A button that shows a date and opens `MiniCalendar` in a Popover.
 *
 * `DateField` — the native `<input type="date">` — stays the default for a
 * plain form date, and this is the documented exception. Reach for it when
 * the calendar itself carries information a native picker cannot: markers
 * per day (which days have free slots), a month the parent fetches on
 * change, disabled days from a schedule, or a "today" that is the bot's day
 * rather than the browser's. The wizard's Day step is that case; a deal's
 * close date is not.
 */
export function DatePickerPopover({
  value,
  onChange,
  month: monthProp,
  onMonthChange,
  placeholder = 'Pick a date',
  format,
  clearable = false,
  disabled = false,
  className = '',
  todayKey,
  locale,
  ...calendar
}: DatePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [ownMonth, setOwnMonth] = useState<MonthKey>(() => monthKeyOf(value ?? todayKey ?? dayKeyOf(new Date())));
  const month = monthProp ?? ownMonth;
  const changeMonth = (next: MonthKey) => {
    setOwnMonth(next);
    onMonthChange?.(next);
  };

  const label = useMemo(() => {
    if (!value) return null;
    if (format) return format(value);
    const date = dateOfDayKey(value);
    return date
      ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
      : value;
  }, [format, locale, value]);

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          /* Re-open on the value's month, not wherever the user last paged to. */
          if (next && !monthProp) setOwnMonth(monthKeyOf(value ?? todayKey ?? dayKeyOf(new Date())));
        }}
        aria-label={calendar['aria-label'] ?? 'Choose a date'}
        placement="bottom-start"
        className="p-2"
        trigger={(props) => (
          <Button {...props} variant="outline" disabled={disabled} aria-label={calendar['aria-label']}>
            <IconCalendar />
            <span className={label ? 'text-text' : 'text-text-faint'}>{label ?? placeholder}</span>
          </Button>
        )}
      >
        <MiniCalendar
          month={month}
          onMonthChange={changeMonth}
          value={value}
          onChange={(day) => {
            onChange(day);
            setOpen(false);
          }}
          todayKey={todayKey}
          locale={locale}
          {...calendar}
        />
      </Popover>
      {clearable && value && !disabled ? (
        <Button iconOnly variant="ghost" size="sm" aria-label="Clear date" onClick={() => onChange(null)}>
          <IconClose />
        </Button>
      ) : null}
    </span>
  );
}
