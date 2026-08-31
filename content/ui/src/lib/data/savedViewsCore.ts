/**
 * Saved views' persistence core: a list of named entries round-tripped through
 * ONE stored string.
 *
 * The storage behind this holds one string per key, per user, with no server-
 * side validation — so everything read back is untrusted: a value written by
 * an older build, by another tab, or by a person with a console must degrade
 * to a default rather than throw. Nothing here throws; an entry the caller's
 * sanitizer cannot repair is dropped, because losing saved views is
 * recoverable and a crashing menu is not.
 *
 * What each entry MEANS — the filter shape, its enums, its caps — is the
 * caller's: it passes a sanitizer and keeps its own vocabulary. What is shared
 * is everything about the list: the envelope, the id discipline, and the
 * edits.
 *
 * One distinction the parser must keep: "never written" and "written empty"
 * are different answers. Deleting your last view stores `[]`, and a caller
 * that seeds starter views must not resurrect them on the next load — so
 * `empty` is true only when nothing readable was ever stored.
 */

export interface ParsedStoredList<T> {
  entries: T[];
  /** True when nothing readable was ever stored — the caller's cue to seed. */
  empty: boolean;
}

// ---------------------------------------------------------------------------
// Reading untrusted JSON
// ---------------------------------------------------------------------------

/** The two readers every entry sanitizer starts from. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/**
 * The stored string → the caller's entries, plus whether anything was ever
 * stored.
 *
 * Both a bare array and a `{ views: [...] }` envelope are accepted, so a value
 * written by a build that wrapped the list still reads. Anything unparseable
 * reads as "never stored". Entries are deduped by id — two rows that fight
 * over one id is worse than losing the second — and capped, so a hand-edited
 * item cannot smuggle in an unbounded list.
 */
export function parseStoredList<T extends { id: string }>(
  raw: string | null | undefined,
  sanitizeEntry: (value: unknown, index: number) => T | null,
  cap: number,
): ParsedStoredList<T> {
  if (typeof raw !== 'string' || raw.trim() === '') return { entries: [], empty: true };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: [], empty: true };
  }
  const list = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.views) ? parsed.views : null;
  if (list === null) return { entries: [], empty: true };

  const seen = new Set<string>();
  const entries: T[] = [];
  for (const [index, value] of list.entries()) {
    const entry = sanitizeEntry(value, index);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push(entry);
    if (entries.length >= cap) break;
  }
  return { entries, empty: false };
}

export function serializeStoredList<T>(entries: readonly T[], cap: number): string {
  return JSON.stringify(entries.slice(0, cap));
}

// ---------------------------------------------------------------------------
// Editing the list
// ---------------------------------------------------------------------------

/** Stable, readable and collision-free without a uuid dependency. */
export function nextEntryId(entries: readonly { id: string }[], name: string, now: number): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'view';
  const taken = new Set(entries.map((entry) => entry.id));
  const base = `${slug}-${now.toString(36)}`;
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Replace by id, or prepend. Newest first, so a fresh save is visible. */
export function upsertEntry<T extends { id: string }>(entries: readonly T[], entry: T, cap: number): T[] {
  return [entry, ...entries.filter((existing) => existing.id !== entry.id)].slice(0, cap);
}

export const removeEntry = <T extends { id: string }>(entries: readonly T[], id: string): T[] =>
  entries.filter((entry) => entry.id !== id);

export function renameEntry<T extends { id: string; name: string }>(
  entries: readonly T[],
  id: string,
  name: string,
  maxLength: number,
): T[] {
  const trimmed = name.trim().slice(0, maxLength);
  if (trimmed === '') return [...entries];
  return entries.map((entry) => (entry.id === id ? { ...entry, name: trimmed } : entry));
}
