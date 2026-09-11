/**
 * The module's deep links, parsed and serialized in one pure place.
 *
 * The view is a path segment — '/contacts/fields' — and everything else is a
 * query parameter. The default view has no segment of its own: '/contacts' IS
 * the list. A '?view=' from an older link is still read, once, and dropped on
 * the next write.
 *
 * Two rules the whole file exists to hold:
 *
 * 1. **An unknown value falls back silently.** A hand-edited or stale link must
 *    render the default, never a white screen.
 * 2. **A default is omitted from what is written.** Otherwise every mount
 *    rewrites the URL with the full schema and a shared link carries ten noise
 *    parameters.
 *
 * Filter GROUPS are deliberately not in the URL: they are unbounded in size
 * and a link carrying twenty predicates is not a link. They live in saved
 * views, which are JSON in per-user server storage.
 */
import { Platform, SalesStageV2, Sort } from '~api/generated/contacts/graphql';
import {
  ALL_PLATFORMS,
  ALL_STAGES,
  ASSIGNEE_PRESETS,
  EMPTY_FILTER,
  assigneeUserId,
  type AssigneeFilterKey,
  type ContactsFilter,
} from './contactsFilter';

export type ContactsView = 'list' | 'fields' | 'audience';
export const VIEWS: readonly ContactsView[] = ['list', 'fields', 'audience'];
export const DEFAULT_VIEW: ContactsView = 'list';

export type RecordTab = 'overview' | 'fields' | 'activity';
export const RECORD_TABS: readonly RecordTab[] = ['overview', 'fields', 'activity'];
export const DEFAULT_TAB: RecordTab = 'overview';

export type Density = 'compact' | 'cozy' | 'comfortable';
export const DENSITIES: readonly Density[] = ['compact', 'cozy', 'comfortable'];
export const DEFAULT_DENSITY: Density = 'cozy';

export interface ContactsParams {
  view: ContactsView;
  /** The contact open as a full record page, or null. */
  contact: string | null;
  tab: RecordTab;
  density: Density;
  /** The half of the filter model a URL can honestly carry. */
  filter: ContactsFilter;
}

export const DEFAULT_PARAMS: ContactsParams = {
  view: DEFAULT_VIEW,
  contact: null,
  tab: DEFAULT_TAB,
  density: DEFAULT_DENSITY,
  filter: EMPTY_FILTER,
};

const ASSIGNEE_TO_PARAM: Record<(typeof ASSIGNEE_PRESETS)[number], string> = {
  Any: 'any',
  Unassigned: 'unassigned',
  FuelyAI: 'ai',
};

function oneOf<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

function parseAssignee(raw: string | null): AssigneeFilterKey {
  if (raw === null || raw === '' || raw === 'any') return 'Any';
  if (raw === 'unassigned') return 'Unassigned';
  if (raw === 'ai') return 'FuelyAI';
  if (raw.startsWith('u:') && raw.length > 2) return raw as AssigneeFilterKey;
  return 'Any';
}

function writeAssignee(key: AssigneeFilterKey): string | null {
  const userId = assigneeUserId(key);
  if (userId) return key;
  const preset = ASSIGNEE_TO_PARAM[key as (typeof ASSIGNEE_PRESETS)[number]];
  return preset === 'any' ? null : (preset ?? null);
}

function parseList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (raw === null || raw === '') return [];
  const seen = new Set<T>();
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if ((allowed as readonly string[]).includes(trimmed)) seen.add(trimmed as T);
  }
  return [...seen];
}

/** Platforms are a positive list; an empty or unparseable one means "all". */
function parsePlatforms(raw: string | null): Platform[] {
  const parsed = parseList(raw, ALL_PLATFORMS);
  return parsed.length === 0 ? [...ALL_PLATFORMS] : parsed;
}

/** `<attribute name>:asc|desc`. The name may contain spaces; only the LAST colon splits. */
function parseSort(raw: string | null): ContactsFilter['sort'] {
  if (raw === null || raw === '') return null;
  const cut = raw.lastIndexOf(':');
  if (cut <= 0) return null;
  const name = raw.slice(0, cut).trim();
  const direction = raw.slice(cut + 1);
  if (name === '' || (direction !== 'asc' && direction !== 'desc')) return null;
  return { name, direction: direction === 'asc' ? Sort.Asc : Sort.Desc };
}

/** An ISO instant, or null. A value Date cannot read is dropped rather than sent. */
function parseInstant(raw: string | null): string | null {
  if (raw === null || raw === '') return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

export function parseContactsParams(params: URLSearchParams, view = ''): ContactsParams {
  const contact = params.get('contact');
  return {
    view: oneOf(view === '' ? params.get('view') : view, VIEWS, DEFAULT_VIEW),
    contact: contact === null || contact === '' ? null : contact,
    tab: oneOf(params.get('tab'), RECORD_TABS, DEFAULT_TAB),
    density: oneOf(params.get('density'), DENSITIES, DEFAULT_DENSITY),
    filter: {
      q: params.get('q') ?? '',
      assignee: parseAssignee(params.get('assignee')),
      stages: parseList(params.get('stage'), ALL_STAGES),
      unreadOnly: params.get('unread') === '1',
      since: parseInstant(params.get('since')),
      until: parseInstant(params.get('until')),
      platforms: parsePlatforms(params.get('platform')),
      groupOperator: EMPTY_FILTER.groupOperator,
      groups: [],
      sort: parseSort(params.get('sort')),
    },
  };
}

/**
 * Rewrites only this module's keys and leaves anything else in `params`
 * untouched — the shell owns the rest of the query string.
 */
export function writeContactsParams(params: URLSearchParams, next: ContactsParams): URLSearchParams {
  const out = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value === null || value === '') out.delete(key);
    else out.set(key, value);
  };

  /* The view lives in the path now; a stale '?view=' is honoured on the way in
     and deleted here. */
  set('view', null);
  set('contact', next.contact);
  set('tab', next.contact === null || next.tab === DEFAULT_TAB ? null : next.tab);
  set('density', next.density === DEFAULT_DENSITY ? null : next.density);
  set('q', next.filter.q.trim() === '' ? null : next.filter.q);
  set('assignee', writeAssignee(next.filter.assignee));
  set('stage', next.filter.stages.length === 0 ? null : next.filter.stages.join(','));
  set('unread', next.filter.unreadOnly ? '1' : null);
  set('since', next.filter.since);
  set('until', next.filter.until);
  set(
    'platform',
    next.filter.platforms.length === 0 || next.filter.platforms.length === ALL_PLATFORMS.length
      ? null
      : next.filter.platforms.join(','),
  );
  set(
    'sort',
    next.filter.sort === null
      ? null
      : `${next.filter.sort.name}:${next.filter.sort.direction === Sort.Asc ? 'asc' : 'desc'}`,
  );

  return out;
}

/** The path segment for a view — the default view has none. */
export const viewSegment = (view: ContactsView): string => (view === DEFAULT_VIEW ? '' : view);

/** The deep link the rest of the app uses to open one contact. */
export const contactLink = (contactId: string): string => `/contacts?contact=${encodeURIComponent(contactId)}`;

/** Where the inbox link points, and which of the two sentences to put on it. */
export interface ChatLink {
  href: string;
  /** True when the contact already has a conversation to open. */
  started: boolean;
}

/**
 * The inbox link for one contact, in the only two forms that work.
 *
 * `?c=` names a conversation, and the inbox's conversation field is non-null:
 * asking for one a contact does not have is a field error, not an empty
 * thread. A contact created through the API or by a CSV import has none, so
 * that contact gets `?contact=`, which is the inbox's own "ensure a
 * conversation exists" path — one mutation, then the thread.
 *
 * `?c=` stays the common form on purpose: it is a read, it costs no round
 * trip, and it needs no permission beyond seeing the inbox.
 *
 * DELIBERATE TWIN of `contactChatLink` in the bookings module
 * (`src/modules/bookings/components/panel/CustomerSection.tsx`), which links
 * the same way from a booking's customer. Modules may not import each other,
 * so the rule is written twice and tested on both sides; change one and change
 * the other.
 */
export function chatLinkFor(contact: { id: string; conversation?: { id: string } | null }): ChatLink {
  const conversation = contact.conversation;
  return conversation
    ? { href: `/livechat?c=${encodeURIComponent(conversation.id)}`, started: true }
    : { href: `/livechat?contact=${encodeURIComponent(contact.id)}`, started: false };
}

/** Two words for one action, and every contacts surface uses these two. */
export const CHAT_LABEL = { open: 'Open in Inbox', start: 'Start a chat' } as const;

export const chatLabel = (started: boolean): string => (started ? CHAT_LABEL.open : CHAT_LABEL.start);

/** Stage list round-trip helper shared with the toolbar: all six means "no filter". */
export function toggleStage(stages: readonly SalesStageV2[], stage: SalesStageV2): SalesStageV2[] {
  const next = stages.includes(stage) ? stages.filter((s) => s !== stage) : [...stages, stage];
  return next.length === ALL_STAGES.length ? [] : next;
}
