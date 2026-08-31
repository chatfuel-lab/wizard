import { Card, Field, Switch } from '~ui';
import type { FuelyConfigBookingAppointmentsUpdateInput } from '~api/generated/bookings/graphql';
import { useSettings } from '../../BookingsSettingsContext';
import { errorMessage } from '../../lib/errors';
import type { BookingConfig } from '../../types';
import { SettingsRow, useRowWrite } from './SettingsRow';

/** The ONE input both reminder rows write — the API takes both flags and both texts together. */
export function appointmentsInputOf(
  config: BookingConfig,
  patch: Partial<FuelyConfigBookingAppointmentsUpdateInput> = {},
): FuelyConfigBookingAppointmentsUpdateInput {
  return {
    twentyFourHoursAppointment: config.twentyFourHoursAppointment,
    twentyFourHoursAppointmentAdditionalInfo: config.twentyFourHoursAppointmentAdditionalInfo,
    twoHoursAppointment: config.twoHoursAppointment,
    twoHoursAppointmentAdditionalInfo: config.twoHoursAppointmentAdditionalInfo,
    ...patch,
  };
}

export interface RemindersSectionProps {
  readOnly: boolean;
}

/**
 * The 24-hour and 2-hour reminders. There is one mutation for both
 * (`fuelyConfigBookingUpdateAppointments` takes the whole
 * `FuelyConfigBookingAppointmentsUpdateInput`), so every switch and every
 * text here re-sends all four fields from the current config with one
 * changed — never a partial.
 */
export function RemindersSection({ readOnly }: RemindersSectionProps) {
  const settings = useSettings();
  const config = settings.state.config;
  const saving = settings.state.saving.includes('appointments');
  const row24 = useRowWrite();
  const row2 = useRowWrite();
  if (!config) return null;

  const write = (patch: Partial<FuelyConfigBookingAppointmentsUpdateInput>) =>
    settings.setAppointments(appointmentsInputOf(config, patch));
  const saveText = (patch: Partial<FuelyConfigBookingAppointmentsUpdateInput>) => async () => {
    try {
      await write(patch);
    } catch (err) {
      throw new Error(errorMessage(err), { cause: err });
    }
  };

  return (
    <Card
      title="Reminders"
      description="Sent before the appointment. Both reminders share one setting on the bot, so a change here saves both."
    >
      <div className="flex flex-col divide-y divide-border">
        <SettingsRow
          label="24 hours before"
          description="A day ahead — the one that reduces no-shows most."
          error={row24.error}
          saving={saving}
        >
          <Switch
            checked={config.twentyFourHoursAppointment}
            aria-label="Send a reminder 24 hours before"
            disabled={readOnly || saving}
            onChange={(next) => row24.run(() => write({ twentyFourHoursAppointment: next }))}
          />
        </SettingsRow>
        {config.twentyFourHoursAppointment && !readOnly ? (
          <div className="py-3">
            <Field
              label="Added to the 24-hour reminder"
              value={config.twentyFourHoursAppointmentAdditionalInfo}
              multiline
              placeholder="e.g. Reply CANCEL to free the slot."
              onSave={(next) => saveText({ twentyFourHoursAppointmentAdditionalInfo: next })()}
            />
          </div>
        ) : config.twentyFourHoursAppointment && config.twentyFourHoursAppointmentAdditionalInfo ? (
          <div className="py-3 text-sm text-text-muted">“{config.twentyFourHoursAppointmentAdditionalInfo}”</div>
        ) : null}

        <SettingsRow label="2 hours before" description="A last nudge on the day." error={row2.error} saving={saving}>
          <Switch
            checked={config.twoHoursAppointment}
            aria-label="Send a reminder 2 hours before"
            disabled={readOnly || saving}
            onChange={(next) => row2.run(() => write({ twoHoursAppointment: next }))}
          />
        </SettingsRow>
        {config.twoHoursAppointment && !readOnly ? (
          <div className="py-3">
            <Field
              label="Added to the 2-hour reminder"
              value={config.twoHoursAppointmentAdditionalInfo}
              multiline
              placeholder="e.g. We are on the second floor."
              onSave={(next) => saveText({ twoHoursAppointmentAdditionalInfo: next })()}
            />
          </div>
        ) : config.twoHoursAppointment && config.twoHoursAppointmentAdditionalInfo ? (
          <div className="py-3 text-sm text-text-muted">“{config.twoHoursAppointmentAdditionalInfo}”</div>
        ) : null}
      </div>
    </Card>
  );
}
