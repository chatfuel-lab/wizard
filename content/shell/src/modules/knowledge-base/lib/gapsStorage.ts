/**
 * The gaps a person has dismissed, serialised for `setUserStorageItem`.
 *
 * There is no API for this. The schema has nothing that could hold "I have
 * decided not to write this FAQ", so the only persistence available is the one
 * bookings' preferences and livechat's saved views use: one arbitrary string
 * under one arbitrary id in `currentUser.userStorageItem`, scoped to the
 * SIGNED-IN USER. A teammate's Gaps page will still show what you ignored, and
 * the UI has to say "you" rather than implying otherwise.
 *
 * Everything read back is UNTRUSTED. It is whatever some past version of this
 * app wrote and possibly hand-edited since, or - because the id is a plain
 * string in a shared namespace - something another feature wrote entirely.
 * Nothing in here throws: a value that cannot be made sense of reads as "you
 * have ignored nothing", because a lost ignore list is one extra row on a
 * report and a page that crashes on a bad string is a broken product.
 *
 * Entries are stored as the QUESTION TEXT rather than a hash, for two reasons:
 * the "Show ignored" list has to be able to name what it is showing, and the
 * match is by word overlap (`isIgnored` in lib/gaps.ts), which needs the words.
 */

/** Versioned: a future shape change reads back as "none", not as garbage. */
export const GAP_IGNORE_KEY = 'chatfuel.knowledge.gaps.ignored.v1';

/**
 * One `userStorageItem` holds the whole list, so the list has to stay small
 * enough to send on every change. Two hundred dismissed questions is far more
 * than anyone will accumulate, and the oldest fall off rather than the write
 * growing without bound.
 */
export const MAX_IGNORED = 200;

/** Matches `MAX_QUESTION_LENGTH` in lib/gaps.ts - nothing longer is ever stored. */
export const MAX_IGNORED_QUESTION_LENGTH = 300;

export interface IgnoredGap {
  /** The cluster's representative question, as it read when it was dismissed. */
  question: string;
  /** Epoch ms. Ordering and the "Show ignored" list only. */
  ignoredAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function sanitize(value: unknown, now: number): IgnoredGap | null {
  if (!isRecord(value)) return null;
  const question = (typeof value.question === 'string' ? value.question : '')
    .trim()
    .slice(0, MAX_IGNORED_QUESTION_LENGTH);
  /* An entry with no question matches nothing and names nothing - it is not a
   * dismissal, it is a row that would sit in "Show ignored" saying blank. */
  if (question === '') return null;
  const ignoredAt = typeof value.ignoredAt === 'number' && Number.isFinite(value.ignoredAt) ? value.ignoredAt : now;
  return { question, ignoredAt };
}

/**
 * Read the stored value. Accepts the bare array this writes and a
 * `{ ignored: [...] }` envelope, because the sibling features in this repo
 * disagree about which they use and a reader that only knows one of them is a
 * silent data loss waiting for the first refactor.
 */
export function parseIgnored(raw: string | null | undefined, now: number = Date.now()): IgnoredGap[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.ignored)
      ? parsed.ignored
      : null;
  if (list === null) return [];

  const out: IgnoredGap[] = [];
  const seen = new Set<string>();
  for (const value of list) {
    const entry = sanitize(value, now);
    if (!entry) continue;
    /* Exact duplicates only. Near-duplicates are the point of the similarity
     * match in `isIgnored` and must stay in the list - two phrasings both
     * recorded is more coverage, not less. */
    const identity = entry.question.toLocaleLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);
    out.push(entry);
  }
  return out.sort((a, b) => b.ignoredAt - a.ignoredAt).slice(0, MAX_IGNORED);
}

export function serializeIgnored(list: readonly IgnoredGap[]): string {
  return JSON.stringify(list.slice(0, MAX_IGNORED));
}

/** Newest first, capped, no exact duplicates. */
export function addIgnored(list: readonly IgnoredGap[], question: string, now: number = Date.now()): IgnoredGap[] {
  const entry = sanitize({ question, ignoredAt: now }, now);
  if (!entry) return [...list];
  const identity = entry.question.toLocaleLowerCase();
  return [entry, ...list.filter((item) => item.question.toLocaleLowerCase() !== identity)].slice(0, MAX_IGNORED);
}

/** Undo one dismissal. Compared case-insensitively, the way `addIgnored` dedupes. */
export function removeIgnored(list: readonly IgnoredGap[], question: string): IgnoredGap[] {
  const identity = question.trim().toLocaleLowerCase();
  return list.filter((item) => item.question.toLocaleLowerCase() !== identity);
}
