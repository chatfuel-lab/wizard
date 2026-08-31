import { useState } from 'react';
import {
  Button,
  DatePickerPopover,
  IconChevronDown,
  IconClock,
  Popover,
  TimeInput,
  TimezoneSelect,
  dayKeyOf,
  formatHHmm,
  parseDayKey,
  parseHHmm,
  wallClockIn,
  wallClockToInstant,
  type DayKey,
} from '~ui';
import { scheduleLabel } from '../../lib/scheduleLabel';

export interface ScheduleButtonProps {
  /** ISO 8601, UTC — the one form the store and the server speak. */
  value: string | null;
  zone: string;
  onChange: (next: string | null) => void;
  onZone: (zone: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Classes for the trigger — how the half is joined to the primary beside it. */
  className?: string;
}

/** The hour a post defaults to when a date is picked before a time. */
const DEFAULT_TIME = '09:00';

/** What the control says while it holds no time. Not a label — an instruction. */
const EMPTY_LABEL = 'Pick a time';

/**
 * When the post goes out, in somebody's own zone.
 *
 * One control that carries its own answer. Three pickers standing open in the
 * form claimed a block of it permanently to say nothing at all most of the
 * time — a post is published now far more often than it is scheduled — so they
 * moved behind the button that states the decision, and the button lives with
 * the other things you press when you are finished rather than among the
 * things you fill in.
 *
 * Three controls and one value. The value that crosses every boundary — the
 * store, the backend, the calendar — is an instant in UTC, and the zone is
 * only ever how it is read and written: an operator in one city scheduling for
 * an audience in another has to be able to say which of the two they meant, and
 * a wall clock with no zone attached cannot.
 *
 * Rendered only where a time can actually be honoured. Where nothing runs beside
 * the browser to make a post go out, this control is absent rather than present
 * and inert — and the primary it would have been joined to becomes a button in
 * its own right rather than one with a flat edge against nothing.
 */
export function ScheduleButton({
  value,
  zone,
  onChange,
  onZone,
  disabled = false,
  invalid = false,
  className = '',
}: ScheduleButtonProps) {
  const [open, setOpen] = useState(false);

  const at = value ? Date.parse(value) : Number.NaN;
  const wall = Number.isNaN(at) ? null : wallClockIn(at, zone);
  const day: DayKey | null = wall ? wall.dayKey : null;
  const time = wall ? formatHHmm(wall.minuteOfDay) : null;
  const label = scheduleLabel(value, zone);

  const compose = (nextDay: DayKey | null, nextTime: string | null, nextZone: string): void => {
    if (!nextDay) {
      onChange(null);
      return;
    }
    const civil = parseDayKey(nextDay);
    if (!civil) {
      onChange(null);
      return;
    }
    const minutes = parseHHmm(nextTime ?? DEFAULT_TIME) ?? 0;
    const instant = wallClockToInstant({ ...civil, hour: Math.floor(minutes / 60), minute: minutes % 60 }, nextZone);
    onChange(new Date(instant).toISOString());
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="top-end"
      aria-label="Publish at"
      trigger={(props) => (
        <Button
          {...props}
          /* Outline rather than a fill: it is the quiet half of a split control
             whose other half is the accent one, and two fills side by side read
             as two primaries. */
          variant={invalid ? 'danger' : 'outline'}
          disabled={disabled}
          /* The value IS the label, so the control needs a name of its own for
             anybody who cannot see that it changed. */
          aria-label={label ? `Publish at ${label}` : EMPTY_LABEL}
          className={className}
        >
          <IconClock />
          <span className="tabular-nums">{label ?? EMPTY_LABEL}</span>
          <IconChevronDown />
        </Button>
      )}
    >
      <div className="flex w-72 max-w-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <DatePickerPopover
            value={day}
            onChange={(next) => compose(next, time, zone)}
            disabled={disabled}
            clearable
            aria-label="Date"
          />
          <TimeInput
            value={time}
            onChange={(next) => compose(day ?? dayKeyOf(Date.now(), zone), next, zone)}
            disabled={disabled}
            invalid={invalid}
            aria-label="Time"
          />
        </div>
        <TimezoneSelect
          value={zone}
          onChange={(next) => {
            const chosen = next ?? zone;
            onZone(chosen);
            /* The wall clock somebody picked is what they meant, so moving the
               zone moves the instant rather than re-reading the same one. */
            compose(day, time, chosen);
          }}
          disabled={disabled}
          aria-label="Time zone"
        />
      </div>
    </Popover>
  );
}
