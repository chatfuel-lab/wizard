import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSettings } from '../BookingsSettingsContext';
import { NOW_TICK_MS, dayKeyInZone, localZone, offsetLabel, sameWallClock, usableBotZone } from '../lib/zone';
import type { DisplayZone } from '../types';
import type { PrefsState } from './usePrefs';

export interface DisplayZoneState {
  zone: DisplayZone;
  /** `YYYY-MM-DD` of today in the display zone; recomputed every minute. */
  todayKey: string;
  /** The zone the calendar could switch to, or null when the bot's zone shows the same wall clock as the operator's. */
  otherZone: { label: string; source: 'bot' | 'local' } | null;
  setZoneSource: (source: 'bot' | 'local') => void;
  /** Milliseconds, refreshed every minute — for now-lines and "past" cutoffs. */
  now: number;
}

/**
 * Which wall clock the workspace renders.
 *
 * Default = the BOT's zone: specialist schedules and availability are `HH:mm`
 * in that zone, so a grid in it lines up its shading and its slots with what
 * the AI and the customer see. The operator can flip to their own zone (a
 * per-user preference); the toggle and the caption only appear when the two
 * zones disagree right now. A bot with no usable zone renders in the
 * operator's, and every instant is still SENT in the bot zone (or UTC when
 * there is none — see `lib/zone.ts`).
 */
export function useDisplayZone(prefs: PrefsState): DisplayZoneState {
  const settings = useSettings();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const botZone = usableBotZone(settings.state.timezone);
  const local = localZone();
  const source = prefs.prefs.zoneSource;

  const zone = useMemo<DisplayZone>(() => {
    if (!botZone) return { botZone: null, zone: local, source: 'local' };
    return source === 'local' ? { botZone, zone: local, source: 'local' } : { botZone, zone: botZone, source: 'bot' };
  }, [botZone, local, source]);

  const todayKey = useMemo(() => dayKeyInZone(now, zone.zone), [now, zone.zone]);

  const otherZone = useMemo(() => {
    if (!botZone || sameWallClock(botZone, local, now)) return null;
    return zone.source === 'bot'
      ? { label: `${local} (${offsetLabel(local, now)})`, source: 'local' as const }
      : { label: `${botZone} (${offsetLabel(botZone, now)})`, source: 'bot' as const };
  }, [botZone, local, now, zone.source]);

  const setZoneSource = useCallback((next: 'bot' | 'local') => prefs.update({ zoneSource: next }), [prefs]);

  return { zone, todayKey, otherZone, setZoneSource, now };
}
