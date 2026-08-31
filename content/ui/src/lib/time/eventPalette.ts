/**
 * Which of the eight event tones a thing gets.
 *
 * Two assignment rules, for two kinds of key:
 *
 * - `assignTones(ids)` — ORDERED. The first id gets tone 1, the second tone
 *   2, cycling past eight. For a catalog of specialists this is what a person
 *   expects: Alex is blue because Alex is first in the list, and stays blue
 *   when Maria is added after him. Order matters, so pass a stable order (the
 *   catalog's), never a Set.
 * - `eventToneFor(key)` — HASHED. Deterministic per string, so a service that
 *   appears in two different lists is the same colour in both, without either
 *   list knowing about the other. Same hash as `Avatar` — same shape of
 *   problem — but over eight tones, not seven hues.
 *
 * The tone is a NUMBER, 1–8. The classes it maps to (`bg-event-3-soft`) live
 * in `calendar/EventChip.tsx` as a `Record` — never assembled from the number
 * (validate 11(i)), and never assembled here, because this file has no DOM
 * and no CSS to be right about.
 */

export const EVENT_TONE_COUNT = 8;

export type EventTone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const EVENT_TONES: readonly EventTone[] = [1, 2, 3, 4, 5, 6, 7, 8];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic tone for a string key. Empty key → tone 1. */
export function eventToneFor(key: string): EventTone {
  return ((hash(key) % EVENT_TONE_COUNT) + 1) as EventTone;
}

/** Tone by position, cycling. Duplicate ids keep their first tone. */
export function assignTones(ids: readonly string[]): Map<string, EventTone> {
  const out = new Map<string, EventTone>();
  let index = 0;
  for (const id of ids) {
    if (out.has(id)) continue;
    out.set(id, ((index % EVENT_TONE_COUNT) + 1) as EventTone);
    index += 1;
  }
  return out;
}

export function isEventTone(value: unknown): value is EventTone {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= EVENT_TONE_COUNT;
}
