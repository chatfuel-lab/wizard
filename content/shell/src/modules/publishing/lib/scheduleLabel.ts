import { formatInZone } from '~ui';

/**
 * What the schedule control says.
 *
 * The control is one button and it carries the whole answer, because the
 * alternative — a word like "Scheduled" beside three pickers — makes somebody
 * open the pickers to find out what they already decided. A weekday goes in
 * front of the date for the same reason: "26 Aug" is a fact and "Tue 26 Aug" is
 * a plan, and the day of the week is the half people actually check.
 *
 * Read in the zone the post was written against, never the machine's. The two
 * differ exactly when it matters — somebody in one city scheduling for an
 * audience in another — and printing the local reading of their instant would
 * quietly contradict the zone they picked two controls away.
 */
export function scheduleLabel(iso: string | null, zone: string, locale?: string): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;

  const day = formatInZone(at, zone, { weekday: 'short', day: 'numeric', month: 'short', locale });
  /* The clock is the locale's, not this file's. The pickers behind this button
     read the hour the same way, and a button saying 11:00 over a field saying
     11:00 AM is two answers to one question. */
  const time = formatInZone(at, zone, { hour: 'numeric', minute: '2-digit', locale });
  return `${day}, ${time}`;
}
