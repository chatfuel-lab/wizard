/**
 * Screen-reader sentences, as pure functions, so a row that only changes
 * visually still says what happened. Mirrors deals' and bookings' `announce.ts`.
 */
export const announceSaved = (what: string): string => `${what} saved.`;

export const announceDeleted = (what: string, undoable: boolean): string =>
  `${what} deleted.${undoable ? ' Press Command Z to undo.' : ''}`;

export const announceMoved = (what: string, from: number, to: number, total: number): string =>
  from === to
    ? `${what} stayed at position ${from + 1} of ${total}.`
    : `${what} moved from position ${from + 1} to ${to + 1} of ${total}.`;

export const announceSelection = (count: number, total: number): string =>
  count === 0 ? 'Nothing selected.' : `${count} of ${total} selected.`;

export const announceImported = (count: number, target: string): string =>
  count === 1 ? `1 row added to ${target}.` : `${count} rows added to ${target}.`;

export const announceScan = (scanned: number, found: number): string =>
  found === 0
    ? `Scanned ${scanned} conversations. Nothing the assistant failed to answer.`
    : `Scanned ${scanned} conversations. ${found} question groups found.`;
