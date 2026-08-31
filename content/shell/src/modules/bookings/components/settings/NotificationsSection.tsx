import { Card, Field, RadioGroup, Select, Switch } from '~ui';
import { DashboardLocale, FuelyBookingNotificationChannel } from '~api/generated/bookings/graphql';
import { useSettings } from '../../BookingsSettingsContext';
import { errorMessage } from '../../lib/errors';
import { SettingsRow, useRowWrite } from './SettingsRow';

const CHANNEL_OPTIONS = [
  {
    value: FuelyBookingNotificationChannel.Chatfuel,
    label: 'Chatfuel',
    description: 'Chatfuel sends the confirmations and reminders.',
  },
  {
    value: FuelyBookingNotificationChannel.ConnectedWhatsapp,
    label: 'Connected WhatsApp',
    description: 'They go out from the bot’s own WhatsApp number.',
  },
] as const;

const LOCALE_OPTIONS: { value: DashboardLocale; label: string }[] = [
  { value: DashboardLocale.En, label: 'English' },
  { value: DashboardLocale.Es, label: 'Spanish' },
  { value: DashboardLocale.Pt, label: 'Portuguese' },
  { value: DashboardLocale.Id, label: 'Indonesian' },
  { value: DashboardLocale.Ms, label: 'Malay' },
];

export interface NotificationsSectionProps {
  readOnly: boolean;
}

/**
 * How and in which language customers hear from the bot about their booking:
 * the channel, the confirmation message (a switch plus the extra text it
 * carries), and the locale. Each row writes its own mutation and the store
 * reconciles from the response.
 */
export function NotificationsSection({ readOnly }: NotificationsSectionProps) {
  const settings = useSettings();
  const config = settings.state.config;
  const saving = settings.state.saving;
  const channel = useRowWrite();
  const confirmation = useRowWrite();
  const locale = useRowWrite();
  if (!config) return null;

  return (
    <Card title="Messages to customers" description="Confirmations and reminders the bot sends about a booking.">
      <div className="flex flex-col divide-y divide-border">
        <SettingsRow
          label="Send through"
          description="Which number the messages come from."
          error={channel.error}
          saving={saving.includes('notificationChannel')}
          stacked
        >
          <RadioGroup
            value={config.notificationChannel}
            options={CHANNEL_OPTIONS}
            aria-label="Notification channel"
            disabled={readOnly || saving.includes('notificationChannel')}
            onChange={(next) => void channel.run(() => settings.setNotificationChannel(next))}
          />
        </SettingsRow>

        <SettingsRow
          label="Confirmation message"
          description="Sent right after a booking is made."
          error={confirmation.error}
          saving={saving.includes('confirmation')}
        >
          <Switch
            checked={config.bookingConfirmation}
            aria-label="Send a confirmation message"
            disabled={readOnly || saving.includes('confirmation')}
            onChange={(next) =>
              confirmation.run(() => settings.setConfirmation(next, config.bookingConfirmationAdditionalInfo))
            }
          />
        </SettingsRow>
        {config.bookingConfirmation && !readOnly ? (
          <div className="py-3">
            <Field
              label="Added to the confirmation"
              value={config.bookingConfirmationAdditionalInfo}
              multiline
              placeholder="e.g. Please arrive five minutes early."
              onSave={async (next) => {
                try {
                  await settings.setConfirmation(true, next);
                } catch (err) {
                  throw new Error(errorMessage(err), { cause: err });
                }
              }}
            />
          </div>
        ) : config.bookingConfirmation && config.bookingConfirmationAdditionalInfo ? (
          <div className="py-3 text-sm text-text-muted">“{config.bookingConfirmationAdditionalInfo}”</div>
        ) : null}

        <SettingsRow
          label="Language"
          description="The language of every message the bot sends about bookings."
          error={locale.error}
          saving={saving.includes('locale')}
        >
          <Select
            value={config.locale}
            options={LOCALE_OPTIONS}
            aria-label="Language"
            disabled={readOnly || saving.includes('locale')}
            onChange={(next) => void locale.run(() => settings.setLocale(next as DashboardLocale))}
          />
        </SettingsRow>
      </div>
    </Card>
  );
}
