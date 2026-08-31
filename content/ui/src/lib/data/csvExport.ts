/**
 * The CSV fragments every client-side export repeats: the escaping, the file
 * shape, and the download trigger. Which columns exist and what a row says
 * stay with the caller — those are API decisions, not formatting.
 *
 * Escaping is RFC 4180: a field containing a comma, a quote, a newline or an
 * edge space is quoted and inner quotes doubled; rows end in CRLF. Cells that
 * begin with `=`, `+`, `-`, `@`, a tab or a CR are prefixed with a `'` so a
 * spreadsheet never executes them — EXCEPT a plain phone/number like
 * `+12025550100`, which is what a phone column is for.
 */

const NEEDS_QUOTES = /[",\r\n]/;
const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[+-]?[\d\s().-]+$/;

/** One CSV field from any value; null/undefined → empty. */
export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (FORMULA_START.test(text) && !PLAIN_NUMBER.test(text)) text = `'${text}`;
  const edgeSpace = text !== text.trim();
  if (NEEDS_QUOTES.test(text) || edgeSpace) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Rows of unescaped cells → the whole file: comma-separated, CRLF-terminated,
 * no BOM (the caller adds one for Excel). The header is simply the first row.
 */
export function csvText(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const lines = rows.map((row) => row.map(csvEscape).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

/** UTF-8 BOM so Excel opens accented names correctly. */
export const CSV_BOM = '\uFEFF';

/* Path separators, the punctuation Windows refuses, and control characters.
   Spaces, dots, hyphens and underscores survive: they are what a readable
   filename is made of, and a dot in the middle is the extension. */
// eslint-disable-next-line no-control-regex -- control characters are the very thing this strips
const UNSAFE_NAME = /[\u0000-\u001f\u007f/\\:*?"<>|]/g;
const RESERVED_NAME = /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i;

/**
 * A filename the OS will take: no separators, no traversal, no control
 * characters, and not one of Windows' reserved device names.
 *
 * Browsers sanitise `download` themselves and disagree about how. That is a
 * reason to do it here rather than a reason to skip it: the name is built from
 * a view title or a record name that came off the wire, and `../` in it is a
 * question about the download directory that this code should never be asking.
 */
export function safeFileName(name: string, fallback = 'download'): string {
  /* Leading dots go: they are how a name becomes `..` or a hidden file, and no
     export is meant to be either. */
  const cleaned = name
    .replace(UNSAFE_NAME, '-')
    .replace(/^[.\s]+/, '')
    .trim()
    .slice(0, 200);
  if (cleaned === '' || RESERVED_NAME.test(cleaned)) return fallback;
  return cleaned;
}

/**
 * Hand the browser a file it writes itself, so the name and the bytes are all
 * this page owns. The object URL is revoked a beat later — after the click
 * has been consumed — rather than leaked for the life of the tab.
 */
export function downloadTextFile(name: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFileName(name);
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
