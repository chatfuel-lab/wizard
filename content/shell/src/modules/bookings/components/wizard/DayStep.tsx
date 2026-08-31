import { useCallback, useState } from 'react';
import { MiniCalendar, monthKeyOf, type Weekday } from '~ui';
import { isWorkingDay } from '../../lib/wizardStore';
import type { SpecialistSchedule } from '../../types';

export interface DayStepProps {
  value: string | null;
  onChoose: (dayKey: string) => void;
  /** Today in the display zone: past days are disabled and this one is marked. */
  todayKey: string;
  weekStartsOn: number;
  /** The schedules whose working days get a marker — the chosen specialist's, or everyone offering the service. */
  schedules: readonly (SpecialistSchedule | null | undefined)[];
  /** Named under the calendar ("Alex works Mon–Fri"). */
  who: string;
}

/**
 * Step 3: which day. `MiniCalendar` with the working days marked from the
 * schedules the module already holds — cheap and offline, on purpose: asking
 * `BookingAvailability` for thirty days would be thirty round trips per month
 * turned, for a dot. Past days are disabled. A click chooses and advances;
 * the keyboard reaches every day (arrows, PageUp/PageDown, Enter).
 */
export function DayStep({ value, onChoose, todayKey, weekStartsOn, schedules, who }: DayStepProps) {
  const [month, setMonth] = useState(() => monthKeyOf(value ?? todayKey));
  const markers = useCallback(
    (day: string) => (isWorkingDay(schedules, day) ? ('available' as const) : ('none' as const)),
    [schedules],
  );
  const anySchedule = schedules.some((s) => s?.enabled);

  return (
    <div className="flex flex-col items-center gap-3">
      <MiniCalendar
        month={month}
        onMonthChange={setMonth}
        value={value}
        onChange={onChoose}
        weekStartsOn={weekStartsOn as Weekday}
        min={todayKey}
        todayKey={todayKey}
        markers={anySchedule ? markers : undefined}
        aria-label="Pick a day"
        className="w-full max-w-sm"
      />
      <p className="text-xs text-text-muted">
        {anySchedule ? (
          <>
            <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-available align-middle" />
            Working days for {who}. Free slots are checked on the next step.
          </>
        ) : (
          `${who} has no working hours yet — pick a day and enter the time yourself.`
        )}
      </p>
    </div>
  );
}
