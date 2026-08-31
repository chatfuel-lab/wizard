/**
 * From the API's availability periods to the slots a wizard offers.
 *
 * `GoodsService.bookingAvailableStartTime(botID, date)` answers per
 * specialist with `availableStartTime: [{start, end}]` — and, in practice,
 * those are START-TIME ranges with an INCLUSIVE end: a 30-min
 * service on a 09:00–18:00 day answers `09:00–17:30`, and a booking at
 * 10:00–10:30 splits it into `09:00–09:30` and `10:30–17:30`. So a start `s`
 * is bookable iff `start ≤ s ≤ end`; the duration is already accounted for.
 * (Slicing with `s + duration ≤ end` — the classic interval reading — would
 * silently drop the last slot of every period.)
 *
 * The `HH:mm` are the BOT zone's wall clock; `slotInstant` turns one into an
 * instant with `zonedInstant`. Past dates still answer with periods — the API
 * has no "now" — so the caller passes `notBefore` to hide what already passed.
 */
import type { AvailabilityEntry } from '../types';
import { zonedInstant } from './zone';

/** The step between offered starts. Cal.com defaults to the duration; 15 gives an operator on the phone more choice. */
export const SLOT_STEP_MIN = 15;

export const parseHHmm = (text: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 24 || mi > 59 || (h === 24 && mi > 0)) return null;
  return h * 60 + mi;
};

export const formatHHmm = (minute: number): string =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export interface SlotPeriod {
  start: string;
  end: string;
}

/**
 * Slot starts (minutes of day) inside inclusive-end start-time periods,
 * aligned to `step` from midnight. Deduped and sorted.
 */
export function sliceStartPeriods(periods: readonly SlotPeriod[], step: number = SLOT_STEP_MIN): number[] {
  const out = new Set<number>();
  for (const period of periods) {
    const start = parseHHmm(period.start);
    const end = parseHHmm(period.end);
    if (start === null || end === null || end < start) continue;
    const first = Math.ceil(start / step) * step;
    for (let s = first; s <= end; s += step) out.add(s);
  }
  return Array.from(out).sort((a, b) => a - b);
}

export interface Slot {
  /** Minute of day in the bot zone. */
  minute: number;
  /** `HH:mm`. */
  label: string;
  /** Specialists free at this start (ids); one entry when a specific specialist was picked. */
  specialistIds: string[];
}

export interface SlotOptions {
  step?: number;
  /** Only these specialists' periods count; omit for "anyone". */
  specialistIds?: readonly string[] | null;
  /** Hide starts before this minute of day (today's "now" in the bot zone). */
  notBefore?: number | null;
}

/**
 * The offered slots for a day: the union across the wanted specialists,
 * each slot listing who is free at that start.
 */
export function slotsFor(entries: readonly AvailabilityEntry[], options: SlotOptions = {}): Slot[] {
  const step = options.step ?? SLOT_STEP_MIN;
  const wanted = options.specialistIds ?? null;
  const byMinute = new Map<number, string[]>();
  for (const entry of entries) {
    if (wanted && !wanted.includes(entry.specialistID)) continue;
    if (!entry.hasSchedule || !entry.isWorkingDay) continue;
    for (const minute of sliceStartPeriods(entry.availableStartTime, step)) {
      if (options.notBefore != null && minute < options.notBefore) continue;
      const list = byMinute.get(minute);
      if (list) {
        if (!list.includes(entry.specialistID)) list.push(entry.specialistID);
      } else byMinute.set(minute, [entry.specialistID]);
    }
  }
  return Array.from(byMinute.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([minute, specialistIds]) => ({ minute, label: formatHHmm(minute), specialistIds }));
}

/** Morning / afternoon / evening buckets for the slot list. */
export type SlotPart = 'morning' | 'afternoon' | 'evening';

export function slotPart(minute: number): SlotPart {
  if (minute < 12 * 60) return 'morning';
  if (minute < 17 * 60) return 'afternoon';
  return 'evening';
}

export function groupSlots(slots: readonly Slot[]): { part: SlotPart; slots: Slot[] }[] {
  const parts: SlotPart[] = ['morning', 'afternoon', 'evening'];
  return parts
    .map((part) => ({ part, slots: slots.filter((s) => slotPart(s.minute) === part) }))
    .filter((g) => g.slots.length > 0);
}

/** The instant a slot starts, in the bot zone. */
export function slotInstant(dateKey: string, minute: number, botZone: string): number {
  return zonedInstant(dateKey, minute, botZone);
}

/**
 * Why a day has no slots — the wizard says which. `null` when there are slots
 * or when the entries do not cover the specialist at all.
 */
export type NoSlotsReason = 'no-schedule' | 'day-off' | 'fully-booked' | 'no-specialists';

export function noSlotsReason(
  entries: readonly AvailabilityEntry[],
  specialistIds: readonly string[] | null,
): NoSlotsReason | null {
  const relevant = specialistIds ? entries.filter((e) => specialistIds.includes(e.specialistID)) : entries;
  if (relevant.length === 0) return 'no-specialists';
  if (relevant.every((e) => !e.hasSchedule)) return 'no-schedule';
  if (relevant.every((e) => !e.hasSchedule || !e.isWorkingDay)) return 'day-off';
  const anyStart = relevant.some(
    (e) => e.hasSchedule && e.isWorkingDay && sliceStartPeriods(e.availableStartTime).length > 0,
  );
  return anyStart ? null : 'fully-booked';
}
