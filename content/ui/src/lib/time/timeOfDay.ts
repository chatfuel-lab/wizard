/**
 * Minutes of a day: `HH:mm` in and out, the forgiving parse a time field
 * wants, labels, snapping and durations.
 *
 * The unit is the MINUTE OF DAY, 0–1440, everywhere in the calendar: the
 * grid, the drag machine, the availability slicer, the schedule editor. A
 * `Date` never appears here — a schedule's "09:00" is not an instant, it is
 * 09:00 on every working day in the bot's zone, and the one type that says
 * that is a number. 1440 is allowed as an END (a span to midnight), never as a
 * start.
 *
 * ## 12- vs 24-hour, and `hourCycle: 'h23'`
 *
 * `formatMinuteOfDay` asks Intl for the label, so a US bot sees `9:30 AM` and
 * a German one `09:30`. When the caller forces 24-hour it passes
 * `hourCycle: 'h23'`, not `hour12: false` — because `hour12: false` in Chrome
 * selects `h24`, which prints midnight as `24:00`, and a gutter that reads
 * 23:00, 24:00, 01:00 is a bug report waiting to be filed. It is a known and
 * unfixed quirk of the spec's option mapping; `h23` sidesteps it.
 */

export const MINUTES_PER_DAY = 1440;

const pad2 = (n: number): string => `${n}`.padStart(2, '0');

/** `'09:30'` → 570; `'24:00'` → 1440. Anything else → null. */
export function parseHHmm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59) return null;
  if (hours > 24 || (hours === 24 && minutes !== 0)) return null;
  return hours * 60 + minutes;
}

/** 570 → `'09:30'`; the canonical form the API and the store speak. */
export function formatHHmm(minute: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, Math.round(minute)));
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
}

/** Does this locale write 9:30 PM rather than 21:30? */
export function usesHour12(locale?: string): boolean {
  try {
    const options = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
    if (typeof options.hour12 === 'boolean') return options.hour12;
    return options.hourCycle === 'h11' || options.hourCycle === 'h12';
  } catch {
    return false;
  }
}

export interface TimeLabelOptions {
  hour12?: boolean;
  locale?: string;
  /**
   * Drop `:00` for whole hours on a 12-hour clock (`9 AM`) — the gutter's
   * style. A 24-hour clock keeps them: `09` alone reads as a count, not a time.
   */
  short?: boolean;
}

const LABEL_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function labelFormatter(hour12: boolean, locale: string | undefined, withMinutes: boolean): Intl.DateTimeFormat {
  const key = `${locale ?? ''}|${hour12 ? 12 : 23}|${withMinutes ? 'm' : ''}`;
  let formatter = LABEL_FORMATTERS.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: withMinutes ? '2-digit' : undefined,
      /* h23, not `hour12: false` — see the header. */
      hourCycle: hour12 ? 'h12' : 'h23',
      timeZone: 'UTC',
    });
    LABEL_FORMATTERS.set(key, formatter);
  }
  return formatter;
}

/**
 * The label for a minute of the day. Intl does the locale work; the minute is
 * placed on 1970-01-01 UTC and formatted in UTC so no real zone can shift it.
 * 1440 formats as midnight (`0:00` / `12 AM`).
 */
export function formatMinuteOfDay(minute: number, options: TimeLabelOptions = {}): string {
  const hour12 = options.hour12 ?? usesHour12(options.locale);
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, Math.round(minute))) % MINUTES_PER_DAY;
  const withMinutes = !(options.short && hour12 && clamped % 60 === 0);
  const text = labelFormatter(hour12, options.locale, withMinutes).format(clamped * 60_000);
  /* Some locales insert U+202F before AM/PM; a plain space keeps the label
     searchable and the widths predictable. */
  return text.replace(/\u202f/g, ' ');
}

/**
 * What a person types into a time field, in every shape people actually type
 * it: `9`, `930`, `9:30`, `09.30`, `2130`, `9p`, `9:30 pm`, `12am`, `noon`,
 * `midnight`. Returns the minute of the day, or null when it is not a time.
 * Bare hours 1–12 with no meridiem are read as typed on a 24-hour clock
 * (`9` → 09:00) — guessing PM for `2` is how a booking lands at 02:00.
 */
export function parseTimeInput(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (text === '') return null;
  if (text === 'noon') return 12 * 60;
  if (text === 'midnight') return 0;

  const match = /^(\d{1,4})(?:[:.h](\d{2}))?(a|am|p|pm)?$/.exec(text);
  if (!match) return null;
  const digits = match[1]!;
  let hours: number;
  let minutes: number;
  if (match[2] !== undefined) {
    if (digits.length > 2) return null;
    hours = Number(digits);
    minutes = Number(match[2]);
  } else if (digits.length <= 2) {
    hours = Number(digits);
    minutes = 0;
  } else {
    /* `930` and `2130` arrive with no separator: the last two digits are the minutes. */
    hours = Number(digits.slice(0, -2));
    minutes = Number(digits.slice(-2));
  }
  return finish(hours, minutes, match[3]);
}

function finish(hours: number, minutes: number, meridiem: string | undefined): number | null {
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    const pm = meridiem.startsWith('p');
    hours = (hours % 12) + (pm ? 12 : 0);
  } else if (hours > 24 || (hours === 24 && minutes !== 0)) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Every minute on the `step` grid inside `[min, max]` — the options of a time
 * picker. `max` is inclusive: a schedule may END at 24:00.
 */
export function timeSteps(step: number, bounds: { min?: number; max?: number } = {}): number[] {
  if (!(step > 0)) return [];
  const min = Math.max(0, bounds.min ?? 0);
  const max = Math.min(MINUTES_PER_DAY, bounds.max ?? MINUTES_PER_DAY);
  const out: number[] = [];
  for (let m = Math.ceil(min / step) * step; m <= max; m += step) out.push(m);
  return out;
}

/** Nearest (default), previous or next multiple of `step`. Step ≤ 0 → unchanged. */
export function snapMinute(minute: number, step: number, mode: 'nearest' | 'floor' | 'ceil' = 'nearest'): number {
  if (!(step > 0)) return minute;
  const q = minute / step;
  const snapped = mode === 'floor' ? Math.floor(q) : mode === 'ceil' ? Math.ceil(q) : Math.round(q);
  /* `|| 0` turns the -0 that Math.round(-0.4) yields back into a plain 0. */
  return snapped * step || 0;
}

/**
 * `09:30 – 10:15`, or `9:30 – 10:15 AM` — the meridiem is said once when both
 * ends share it, which is how a person would say it.
 */
export function timeRangeLabel(start: number, end: number, options: TimeLabelOptions = {}): string {
  const hour12 = options.hour12 ?? usesHour12(options.locale);
  const a = formatMinuteOfDay(start, { ...options, hour12 });
  const b = formatMinuteOfDay(end, { ...options, hour12 });
  if (hour12) {
    const suffix = (s: string) => /\s?[AP]M$/i.exec(s)?.[0]?.trim();
    const sa = suffix(a);
    const sb = suffix(b);
    if (sa && sb && sa === sb) return `${a.replace(/\s?[AP]M$/i, '')} – ${b}`;
  }
  return `${a} – ${b}`;
}

/** The chips a duration field offers, in minutes. */
export const DURATION_PRESETS: readonly number[] = [15, 30, 45, 60, 90, 120];

/** 90 → `1 h 30 min`; 60 → `1 h`; 45 → `45 min`; 0 → `0 min`. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * `90`, `1h30`, `1h 30m`, `1:30`, `1.5h`, `45m`, `2 hours` → minutes.
 * A bare number is minutes. Null when it is not a duration or is 0.
 */
export function parseDuration(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (text === '') return null;
  let minutes: number | null = null;

  const bare = /^(\d+)$/.exec(text);
  const clock = /^(\d{1,2}):(\d{2})$/.exec(text);
  const units = /^(?:(\d+(?:\.\d+)?)h(?:ours?|rs?)?)?(?:(\d+)(?:m(?:in(?:utes?)?)?)?)?$/.exec(text);

  if (bare) minutes = Number(bare[1]);
  else if (clock) minutes = Number(clock[1]) * 60 + Number(clock[2]);
  else if (units && (units[1] !== undefined || units[2] !== undefined)) {
    minutes = Math.round(Number(units[1] ?? 0) * 60) + Number(units[2] ?? 0);
  }
  return minutes !== null && minutes > 0 && Number.isFinite(minutes) ? minutes : null;
}
