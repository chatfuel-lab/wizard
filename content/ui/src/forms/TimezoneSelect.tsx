import { useMemo } from 'react';
import { IconGlobe } from '../icons';
import {
  formatInZone,
  isValidTimeZone,
  listTimeZones,
  localTimeZone,
  offsetLabel,
  zoneCityLabel,
  zoneOffsetMinutes,
} from '../lib/time/timezone';
import { Combobox, type ComboboxOption } from './Combobox';

export interface TimezoneSelectProps {
  /** An IANA zone, or null for none. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** The zones offered. Default: everything the engine knows. */
  zones?: readonly string[];
  /** The instant offsets and current times are computed at. Default now, at render. */
  now?: number;
  locale?: string;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

/**
 * A `Combobox` over the zone list. Each row is the zone name with its offset
 * and current wall clock ("UTC+2 · 14:32") — the two facts that let a person
 * confirm they have the right one when three cities share a name. Search
 * matches the city without underscores and the offset label, so `mexico` and
 * `utc-6` both find `America/Mexico_City`.
 *
 * The current value and the user's own zone are always in the list, even if
 * `zones` was narrowed — a picker that cannot show its own value is broken,
 * and "my zone" is the one people reach for first.
 */
export function TimezoneSelect({
  value,
  onChange,
  zones,
  now,
  locale,
  placeholder = 'Choose a time zone',
  clearable = false,
  disabled = false,
  className = '',
  ...aria
}: TimezoneSelectProps) {
  const options = useMemo<ComboboxOption[]>(() => {
    const at = now ?? Date.now();
    const local = localTimeZone();
    const set = new Set<string>(zones ?? listTimeZones());
    if (value && isValidTimeZone(value)) set.add(value);
    set.add(local);
    return [...set]
      .filter(isValidTimeZone)
      .map((zone) => {
        const offset = zoneOffsetMinutes(at, zone);
        return { zone, offset };
      })
      .sort((a, b) => a.offset - b.offset || (a.zone < b.zone ? -1 : 1))
      .map(({ zone, offset }) => ({
        value: zone,
        label: zone,
        description: `${offsetLabel(offset)} · ${formatInZone(at, zone, { locale })}${zone === local ? ' · your zone' : ''}`,
        keywords: [zoneCityLabel(zone), offsetLabel(offset).replace('−', '-'), zone.replace(/[_/]/g, ' ')],
        icon: zone === local ? <IconGlobe size={14} /> : undefined,
      }));
  }, [locale, now, value, zones]);

  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      clearable={clearable}
      disabled={disabled}
      aria-label={aria['aria-label'] ?? 'Time zone'}
      className={className}
    />
  );
}
