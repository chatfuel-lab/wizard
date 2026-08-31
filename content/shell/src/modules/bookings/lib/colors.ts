/**
 * Which colour a booking wears.
 *
 * By default a booking is coloured by its SPECIALIST — that is what a
 * multi-chair salon or a small clinic reads at a glance ("Alex is blue"), and
 * status is drawn structurally on top (dashed = tentative, muted +
 * strikethrough = canceled, glyphs for attended / no-show) so both survive the
 * swap. `color=status` swaps the fill to status tones for a front desk that
 * triages by state.
 *
 * Tones are the design system's eight categorical event tones
 * (`--color-event-1..8`); a specialist's tone is its position in the catalog
 * (stable — the API's order is), wrapping past eight. Unassigned and deleted
 * specialists are neutral. The tone index is a number here; the calendar
 * track maps it to `EventChip`'s `tone`.
 */
import { UNASSIGNED } from './bookingsFilter';

export const EVENT_TONE_COUNT = 8;

/** 1..8 for a catalog position, wrapping. */
export function toneForIndex(index: number): number {
  if (index < 0) return 0;
  return (index % EVENT_TONE_COUNT) + 1;
}

/** 0 = neutral. */
export function specialistTone(specialistKey: string, catalogOrder: readonly string[]): number {
  if (specialistKey === UNASSIGNED) return 0;
  return toneForIndex(catalogOrder.indexOf(specialistKey));
}
