/**
 * A byte count, in the words a tile has room for.
 *
 * Decimal units, because that is what every operating system's file dialog and
 * every "max 16 MB" limit in a platform's documentation means — a tile reading
 * 15.3 MiB beside a rule about 16 MB invites exactly the wrong conclusion.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  const units = ['kB', 'MB', 'GB'];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
