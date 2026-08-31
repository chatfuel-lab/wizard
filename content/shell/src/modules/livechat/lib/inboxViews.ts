import { asString, isRecord, parseStoredList } from '~ui';
import {
  ASSIGNEE_PRESETS,
  EMPTY_INBOX_FILTER,
  STAGES,
  activeFilterCount,
  describeInboxFilter,
  sameInboxFilter,
  type AssigneeKey,
  type InboxFilter,
} from './inboxFilter';

/**
 * Saved views for the inbox: an `InboxFilter` round-tripped through one string.
 *
 * `setUserStorageItem` / `currentUser.userStorageItem` is the only persistence
 * this API offers, it is scoped to the signed-in user, and it holds one string
 * per id — so the whole list lives under a single key and every mutation
 * rewrites all of it. There is no sharing, no team scope, and no server-side
 * validation of what goes in.
 *
 * This file is the half that never touches the wire, and it is the half that
 * carries the risk: everything read back is untrusted — whatever some past
 * version of the app wrote, possibly hand-edited — and this is the only thing
 * standing between a bad storage item and a white screen. Nothing here throws;
 * a value it cannot make sense of is an empty list, because losing saved views
 * is recoverable and a menu that crashes the inbox is not.
 *
 * The list mechanics — the envelope, the id discipline, dedupe, caps, and the
 * edits — are the shared list core in the UI package; this file keeps only
 * what an inbox view MEANS: the filter vocabulary, its sanitizers, equality,
 * and the captions.
 */

/** Versioned: a future shape change reads back as "no views", not as garbage. */
export const SAVED_VIEWS_KEY = 'chatfuel.livechat.saved-views.v1';

export const MAX_SAVED_VIEWS = 50;
export const MAX_NAME_LENGTH = 60;
const MAX_QUERY_LENGTH = 200;

export interface SavedInboxView {
  id: string;
  name: string;
  filter: InboxFilter;
  /** Epoch ms. Ordering and the menu's caption only. */
  savedAt: number;
}

function sanitizeStages(value: unknown): InboxFilter['stages'] {
  if (!Array.isArray(value)) return [];
  const wanted = new Set(value.filter((entry): entry is string => typeof entry === 'string'));
  // Canonical order, deduped, unknown members dropped — one spelling per set.
  return STAGES.filter((stage) => wanted.has(stage));
}

function sanitizeAssignee(value: unknown): AssigneeKey {
  const assignee = asString(value);
  if (assignee === null) return EMPTY_INBOX_FILTER.assignee;
  if ((ASSIGNEE_PRESETS as readonly string[]).includes(assignee)) return assignee as AssigneeKey;
  /* `u:` alone is not a user id. Sent as one it filters by an empty
     UserAccountID, which matches nobody — an inbox that looks quiet rather
     than broken, which is the worst way for this to fail. */
  return assignee.startsWith('u:') && assignee.length > 2 ? (assignee as AssigneeKey) : EMPTY_INBOX_FILTER.assignee;
}

/** Any value → a filter this module can actually run. Never throws. */
export function sanitizeFilter(value: unknown): InboxFilter {
  if (!isRecord(value)) return EMPTY_INBOX_FILTER;
  return {
    assignee: sanitizeAssignee(value.assignee),
    q: (asString(value.q) ?? '').slice(0, MAX_QUERY_LENGTH),
    stages: sanitizeStages(value.stages),
    unreadOnly: value.unreadOnly === true,
  };
}

function sanitizeView(value: unknown, index: number, now: number): SavedInboxView | null {
  if (!isRecord(value)) return null;
  const name = (asString(value.name) ?? '').trim().slice(0, MAX_NAME_LENGTH);
  const savedAt = typeof value.savedAt === 'number' && Number.isFinite(value.savedAt) ? value.savedAt : now;
  return {
    id: asString(value.id)?.trim() || `view-${index}`,
    name: name === '' ? 'Untitled view' : name,
    filter: sanitizeFilter(value.filter),
    savedAt,
  };
}

/**
 * The stored string → the list. Anything unparseable is an empty list: losing
 * saved views is recoverable, a crashing menu is not. The envelope tolerance,
 * the id dedupe and the cap are `parseStoredList`; this wrapper keeps the
 * repair of what a view means in `sanitizeView` above.
 */
export function parseSavedViews(raw: string | null | undefined, now: number = Date.now()): SavedInboxView[] {
  return parseStoredList(raw, (value, index) => sanitizeView(value, index, now), MAX_SAVED_VIEWS).entries;
}

/** Which saved view the current filter IS, if any — the menu's check mark. */
export function findMatchingView(views: readonly SavedInboxView[], filter: InboxFilter): SavedInboxView | null {
  return views.find((entry) => sameInboxFilter(entry.filter, filter)) ?? null;
}

/** The one-line caption under a saved view's name. */
export function describeSavedView(view: SavedInboxView, teamName?: (id: string) => string): string {
  if (activeFilterCount(view.filter) === 0) return 'No filters';
  return describeInboxFilter(view.filter, teamName);
}
