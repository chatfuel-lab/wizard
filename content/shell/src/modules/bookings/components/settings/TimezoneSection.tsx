import { Card, TimezoneSelect } from '~ui';
import { useSettings } from '../../BookingsSettingsContext';
import { offsetLabel } from '../../lib/zone';
import type { DisplayZone } from '../../types';
import { SettingsRow, useRowWrite } from './SettingsRow';

export interface TimezoneSectionProps {
  readOnly: boolean;
  zone: DisplayZone;
}

/**
 * The bot's time zone — the one every schedule, availability period and
 * booking time is read in (see `lib/zone.ts`). Changing it re-frames the
 * whole calendar: the caption in the header changes with it.
 */
export function TimezoneSection({ readOnly, zone }: TimezoneSectionProps) {
  const settings = useSettings();
  const saving = settings.state.saving.includes('timezone');
  const row = useRowWrite();
  const now = Date.now();
  const botZone = settings.state.timezone;

  return (
    <Card
      title="Time zone"
      description="The calendar shows times in this zone; staff hours and availability are in it too. Bookings are stored as instants, so changing it moves nothing — it changes the clock they are read on."
    >
      <SettingsRow
        label="Bot time zone"
        description={
          botZone
            ? zone.botZone
              ? `${botZone} · ${offsetLabel(zone.botZone, now)}`
              : `${botZone} — not a zone this browser knows; the calendar falls back to yours.`
            : 'Not set — the calendar renders in your own zone until one is chosen.'
        }
        error={row.error}
        saving={saving}
        stacked
      >
        <div className="w-full max-w-md">
          <TimezoneSelect
            value={botZone}
            now={now}
            disabled={readOnly || saving}
            aria-label="Bot time zone"
            onChange={(next) => {
              if (next) void row.run(() => settings.setTimezone(next));
            }}
          />
        </div>
      </SettingsRow>
    </Card>
  );
}
