/* The units the wire can name, largest first. */
const DURATION_UNITS = [
  ['d', 'day'],
  ['h', 'hour'],
  ['m', 'minute'],
  ['s', 'second'],
] as const;

/**
 * "24h:00m:00s" -> "24 hours", "1h23m" -> "1 hour 23 minutes".
 *
 * The auto-close system message reports its delay as a string the server has
 * already formatted, and it has been seen in two shapes — "1h23m" and
 * "24h:00m:00s" — so both are read here. The two largest units that carry a
 * value are printed and nothing is carried between them: 24 hours stays 24
 * hours and is never rewritten as 1 day, because the auto-close setting offers
 * "24 hours" and "3 days" as separate choices and folding one into the other
 * would report a setting nobody made.
 *
 * Returns '' for a duration that is empty or adds up to nothing — the caller
 * has a sentence for that — and the input unchanged for anything that is not a
 * run of numbers and units, since a string we cannot read still says more than
 * a blank one.
 */
export function humanDuration(raw: string): string {
  const text = raw.trim();
  if (!text) return '';

  const value = new Map<string, number>();
  /* Each match is cut from a copy; whatever survives is the part we did not
     understand, and its presence disqualifies the whole string. */
  let rest = text.toLowerCase();
  for (const [whole, digits, unit] of text.toLowerCase().matchAll(/(\d+)\s*([dhms])/g)) {
    if (value.has(unit)) return text;
    value.set(unit, Number(digits));
    rest = rest.replace(whole, '');
  }
  if (value.size === 0 || rest.replace(/[:\s]/g, '') !== '') return text;

  const said: string[] = [];
  for (const [unit, word] of DURATION_UNITS) {
    const count = value.get(unit);
    if (!count || said.length === 2) continue;
    said.push(`${count} ${word}${count === 1 ? '' : 's'}`);
  }
  return said.join(' ');
}
