import { useEffect } from 'react';
import { Alert, Button, PageBody, Skeleton } from '~ui';
import { useSettings } from '../BookingsSettingsContext';
import { AutonomySection } from '../components/settings/AutonomySection';
import { BookingPageSection } from '../components/settings/BookingPageSection';
import { NotificationsSection } from '../components/settings/NotificationsSection';
import { RemindersSection } from '../components/settings/RemindersSection';
import { TimezoneSection } from '../components/settings/TimezoneSection';
import type { BookingsViewProps } from './types';

/**
 * Settings: the bot's AI booking configuration and its time zone, from
 * `useSettings()` (loaded once by `BookingsApp`, reconciled from every
 * setter's response). Rows save on change; each shows its own saving state
 * and inline error. Nothing here is optimistic — a settings row is cheap to
 * wait on and expensive to get wrong.
 */
export function SettingsView({ role, zone, onCount, onBusy, refreshToken }: BookingsViewProps) {
  const settings = useSettings();
  const { config, loading, error } = settings.state;

  useEffect(() => onCount(null), [onCount]);
  useEffect(() => onBusy(loading), [onBusy, loading]);
  const refresh = settings.refresh;
  useEffect(() => {
    if (refreshToken > 0) refresh();
  }, [refreshToken, refresh]);

  const readOnly = !role.canManage;

  return (
    <PageBody measure="form">
      <div className="flex flex-col gap-4">
        {error ? (
          <Alert
            tone="danger"
            title="Could not load the booking settings"
            action={
              <Button size="sm" variant="secondary" onClick={() => refresh()}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}
        {readOnly && config ? (
          <Alert tone="info" title="Read only">
            Your role can see these settings but not change them — editing needs the Ai · Edit permission on this bot.
          </Alert>
        ) : null}

        {!config && loading ? (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading settings">
            <Skeleton variant="block" height="10rem" />
            <Skeleton variant="block" height="8rem" />
            <Skeleton variant="block" height="12rem" />
          </div>
        ) : config ? (
          <>
            <NotificationsSection readOnly={readOnly} />
            <RemindersSection readOnly={readOnly} />
            <AutonomySection readOnly={readOnly} />
            <TimezoneSection readOnly={readOnly} zone={zone} />
            <BookingPageSection />
          </>
        ) : !error ? (
          <Alert tone="warning" title="No booking configuration">
            This bot answered without an AI booking configuration. Enable AI booking on the bot in Chatfuel, then
            refresh.
          </Alert>
        ) : null}
      </div>
    </PageBody>
  );
}
