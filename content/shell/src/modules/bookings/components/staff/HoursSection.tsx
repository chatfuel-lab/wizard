import type { Dispatch } from 'react';
import { Alert, Card, Switch, WeekHoursEditor, type Weekday } from '~ui';
import { dayErrors, fieldError, type StaffFormAction, type StaffFormState } from '../../lib/staffFormStore';

export interface HoursSectionProps {
  state: StaffFormState;
  dispatch: Dispatch<StaffFormAction>;
  readOnly: boolean;
  weekStartsOn: number;
  /** The zone the hours are in — the BOT's, always; shown so an operator elsewhere is not surprised. */
  botZone: string | null;
  hour12?: boolean;
}

/**
 * Working hours: a switch, then seven rows. The hours are `HH:mm` in the
 * BOT's zone (availability and the calendar shading read them there); a
 * disabled schedule means the specialist cannot be booked through
 * availability at all, which the wizard says out loud.
 */
export function HoursSection({ state, dispatch, readOnly, weekStartsOn, botZone, hour12 }: HoursSectionProps) {
  const enabled = state.draft.scheduleEnabled;
  const scheduleError = fieldError(state, 'schedule');
  const errors = dayErrors(state);
  const inert = readOnly || state.saving;

  return (
    <Card
      title="Working hours"
      description={
        botZone
          ? `Times are in the bot's zone, ${botZone}. Availability and the calendar's shading follow these.`
          : 'Availability and the calendar shading follow these.'
      }
      actions={
        <Switch
          checked={enabled}
          onChange={(next) => dispatch({ type: 'setScheduleEnabled', enabled: next })}
          label="Has working hours"
          disabled={inert}
        />
      }
    >
      {enabled ? (
        <div className="flex flex-col gap-3">
          <WeekHoursEditor
            value={state.draft.hours}
            onChange={(hours) => dispatch({ type: 'setHours', hours })}
            weekStartsOn={weekStartsOn as Weekday}
            errors={errors}
            hour12={hour12}
            disabled={inert}
          />
          {scheduleError ? <Alert tone="danger">{scheduleError}</Alert> : null}
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          No working hours. This specialist will not appear in the booking wizard's availability until hours are set;
          the calendar still shows their bookings.
        </p>
      )}
    </Card>
  );
}
