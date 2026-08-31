import { asString, filterItems, isRecord, parseStoredList } from '~ui';

/**
 * The replies an operator types twenty times a day, kept once.
 *
 * There is no API for these. The schema has no canned-response, saved-reply or
 * snippet type anywhere in it, so the only persistence available is the same
 * one the saved views use: `setUserStorageItem` / `currentUser.userStorageItem`
 * from **core**, one arbitrary string under one arbitrary id, scoped to the
 * SIGNED-IN USER. Every label in the UI built on this has to say "your", the
 * way `SavedViewsMenu` does — a team-wide snippet library is a reasonable thing
 * to want and this is not it.
 *
 * The shape is `lib/inboxViews.ts` again, for the same reasons and with the
 * same rule: everything read back is untrusted, because it is whatever some
 * past version of this app wrote and possibly hand-edited since. Nothing here
 * throws. A value that cannot be made sense of is an empty list, because losing
 * canned responses is recoverable and a menu that crashes the inbox is not.
 * The list mechanics — envelope tolerance, id dedupe, the cap — are the shared
 * list core in the UI package; what a response MEANS stays here.
 */

/** Versioned: a future shape change reads back as "none", not as garbage. */
export const CANNED_RESPONSES_KEY = 'chatfuel.livechat.canned-responses.v1';

export const MAX_CANNED_RESPONSES = 50;
export const MAX_CANNED_TITLE_LENGTH = 60;
export const MAX_CANNED_BODY_LENGTH = 2000;

export interface CannedResponse {
  id: string;
  /** What the menu shows. */
  title: string;
  /** What goes into the composer. */
  body: string;
  /** Epoch ms. Ordering only. */
  savedAt: number;
}

function sanitize(value: unknown, index: number, now: number): CannedResponse | null {
  if (!isRecord(value)) return null;
  const body = (asString(value.body) ?? '').slice(0, MAX_CANNED_BODY_LENGTH);
  /* A response with no body is not a response — it would put nothing in the
     composer, which is indistinguishable from the menu being broken. */
  if (body.trim() === '') return null;
  const title = (asString(value.title) ?? '').trim().slice(0, MAX_CANNED_TITLE_LENGTH);
  const savedAt = typeof value.savedAt === 'number' && Number.isFinite(value.savedAt) ? value.savedAt : now;
  return {
    id: asString(value.id)?.trim() || `canned-${index}`,
    /* The body is the fallback title rather than "Untitled": the menu is read
       at a glance and the first words of the reply identify it far better than
       a placeholder does. */
    title: title === '' ? body.trim().slice(0, MAX_CANNED_TITLE_LENGTH) : title,
    body,
    savedAt,
  };
}

export function parseCannedResponses(raw: string | null | undefined, now: number = Date.now()): CannedResponse[] {
  return parseStoredList(raw, (value, index) => sanitize(value, index, now), MAX_CANNED_RESPONSES).entries;
}

/**
 * The menu's list for a query.
 *
 * Title first, body second, so typing the opening words of a reply finds it as
 * readily as typing its name — `filterItems` weights the first text highest and
 * that ordering is the whole point of passing two.
 */
export function searchCannedResponses(responses: readonly CannedResponse[], query: string): CannedResponse[] {
  return filterItems(responses, query, (response) => [response.title, response.body]).map((result) => result.item);
}
