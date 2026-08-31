import type { ThrottleOptions } from '~api';

// ---------------------------------------------------------------------------
// Caps. Every one of them is a spend decision, and the view prints them.
// ---------------------------------------------------------------------------

/**
 * Contacts per chat-list page. Twenty is a page of the same list the inbox
 * pages, and it keeps the progress readable - a person watches "3 of 10 pages"
 * happen rather than one long silence.
 */
export const CHATS_PER_PAGE = 20;

/** Ten pages. Past that the sweep is browsing history, not reading this week. */
export const MAX_PAGES = 10;

/** What the empty state promises and the summary reports: the 200 most recent chats. */
export const MAX_CONTACTS = CHATS_PER_PAGE * MAX_PAGES;

/**
 * Conversations actually opened. This is the expensive half - one request each -
 * and fifty flagged chats is already more FAQs than anyone will write in a
 * sitting. Newest first, so the fifty are the fifty that matter.
 */
export const MAX_CONVERSATIONS = 50;

/**
 * Messages read per conversation. The hand-off is at the end of the thread by
 * construction, and the question that caused it is a turn or two above it;
 * twelve covers a greeting, a couple of exchanges and the hand-off with room
 * to spare, and asking for a hundred would multiply the payload for nothing.
 */
export const MESSAGES_PER_CONVERSATION = 12;

/**
 * Three conversations in flight. The account's rate limit is shared across
 * every tab and every teammate, so a background report takes a small slice of
 * it: at the batch preset fifty conversations take about ten seconds, which is
 * a progress bar rather than a wait, and the rest of the page keeps loading underneath.
 */
export const SCAN_CONCURRENCY = 3;
export const SCAN_THROTTLE: ThrottleOptions = { rps: 5, concurrency: SCAN_CONCURRENCY };
