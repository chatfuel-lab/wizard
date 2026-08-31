import { useId, useMemo } from 'react';
import { DropdownMenu, type MenuItem } from '../floating/DropdownMenu';
import { IconCalendar } from '../icons';
import { Button } from '../primitives/Button';

export interface DateFieldProps {
  /** ISO `YYYY-MM-DD`, or null for empty. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Hide the preset menu. */
  presets?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

/** Local-time ISO date. `toISOString()` is UTC and would shift the day. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function endOfMonth(): string {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function endOfQuarter(): string {
  const now = new Date();
  const quarterEndMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
  return toISODate(new Date(now.getFullYear(), quarterEndMonth, 0));
}

/**
 * Native `<input type="date">` plus the presets that cover most real use.
 *
 * There is no hand-rolled calendar here on purpose. The native control brings
 * locale-correct formatting, the platform date picker on mobile, keyboard
 * stepping and an accessible name for free — every one of which a custom
 * calendar has to re-earn. The presets are the part it genuinely lacks, and
 * they are where a sales close-date actually gets set.
 *
 * The one exception is `DatePickerPopover` (over `MiniCalendar`), for a date
 * whose calendar carries information — availability markers per day, an
 * inline wizard step, a month the parent fetches on change, a "today" that is
 * the bot's day rather than the browser's. A plain form date stays here.
 */
export function DateField({
  value,
  onChange,
  presets = true,
  min,
  max,
  disabled = false,
  className = '',
  ...aria
}: DateFieldProps) {
  const inputId = useId();

  const items = useMemo<MenuItem[]>(
    () => [
      { id: 'today', label: 'Today', onSelect: () => onChange(shiftDays(0)) },
      { id: 'tomorrow', label: 'Tomorrow', onSelect: () => onChange(shiftDays(1)) },
      { id: 'week', label: 'In 7 days', onSelect: () => onChange(shiftDays(7)) },
      { id: 'month-end', label: 'End of month', onSelect: () => onChange(endOfMonth()) },
      { id: 'quarter-end', label: 'End of quarter', onSelect: () => onChange(endOfQuarter()) },
      { kind: 'separator', id: 'sep' },
      { id: 'clear', label: 'Clear', disabled: value === null, onSelect: () => onChange(null) },
    ],
    [onChange, value],
  );

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <input
        id={inputId}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={aria['aria-label']}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        className="h-field rounded-control border border-border bg-surface-sunken px-2.5 text-sm text-text hover:border-border-strong focus-visible:focus-ring disabled:cursor-not-allowed disabled:text-text-faint"
      />
      {presets ? (
        <DropdownMenu
          items={items}
          aria-label="Date presets"
          /* Outline, not ghost: it stands beside a bordered input at the same
             height, and a borderless square there reads as a stray icon. */
          trigger={(props) => (
            <Button {...props} iconOnly variant="outline" disabled={disabled} aria-label="Date presets">
              <IconCalendar />
            </Button>
          )}
        />
      ) : null}
    </span>
  );
}
