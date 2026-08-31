import type { AutomationRef, EventSet, EventSetView, Setting, SettingSlot } from '../types';

/**
 * The two settings this surface owns, picked out of the automation's settings
 * array by `__typename`. Everything else in that array belongs to other
 * surfaces and is left alone — a write names one setting at a time, so
 * carrying the rest is not this module's job.
 */
const ADS = 'FuelySettingListOfAds';
const EVENTS = 'FuelySettingSendEventsToMeta';

function slotOf<T>(setting: Setting | undefined, value: T): SettingSlot<T> | null {
  if (!setting) return null;
  return {
    value,
    inheritsFrom: (setting.inheritsFrom as AutomationRef | null) ?? null,
    canInheritFrom: setting.canInheritFrom ?? [],
  };
}

export function toView(set: EventSet): EventSetView {
  const ads = set.settings.find((s) => s.__typename === ADS);
  const events = set.settings.find((s) => s.__typename === EVENTS);
  return {
    id: set.id,
    isBase: set.isBase,
    name: set.name ?? null,
    enabled: set.enabled,
    updatedAt: set.updatedAt,
    ads: ads && ads.__typename === ADS ? slotOf(ads, ads.adIDs ?? []) : null,
    events: events && events.__typename === EVENTS ? slotOf(events, events.events ?? []) : null,
  };
}

/** The base set first, then the custom ones by name — the order of the rail. */
export function orderSets(sets: readonly EventSet[]): EventSet[] {
  return [...sets].sort((a, b) => {
    if (a.isBase !== b.isBase) return a.isBase ? -1 : 1;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });
}

/** The set a rail click should land on when the address names none. */
export function defaultSetId(sets: readonly EventSet[]): string | null {
  const ordered = orderSets(sets);
  return ordered[0]?.id ?? null;
}
