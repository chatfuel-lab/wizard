/**
 * The module's address.
 *
 * The view is a path segment and everything else is a query parameter, the same
 * split the rest of the app uses: `/publishing` is the calendar, `/publishing/queue`
 * and `/publishing/library` are the other two, and `?compose=` names the post whose
 * composer is open.
 *
 * Two rules this file exists to hold. **Unknown values fall back silently** — a
 * hand-edited address must never white-screen, so `/publishing/nonsense` is the
 * calendar and `?kind=purple` is no filter at all. And **defaults are omitted**
 * from what is written, so a link that says nothing is the shortest link there
 * is and the back stack does not fill with equivalent addresses.
 */
import type { PostKind, PostStatus } from '../types';

export type PublishingView = 'calendar' | 'queue' | 'library';

export const DEFAULT_VIEW: PublishingView = 'calendar';

const VIEWS: readonly PublishingView[] = ['calendar', 'queue', 'library'];

/**
 * Calendar display modes.
 *
 * The week is the one a person opens on. A month of a publishing queue is
 * mostly empty cells — a handful of posts spread over thirty days — and it
 * answers "what did I plan for October" rather than "what is going out". The
 * week answers the question somebody opened the module to ask, and it is the
 * only one of the three with room to draw a post as a post.
 */
export type CalendarMode = 'month' | 'week' | 'list';
const CALENDAR_MODES: readonly CalendarMode[] = ['month', 'week', 'list'];
export const DEFAULT_CALENDAR_MODE: CalendarMode = 'week';

/** What `?compose=` says when the composer is open on a post that has no id yet. */
export const NEW_POST = 'new';

const STATUSES: readonly PostStatus[] = ['draft', 'scheduled', 'publishing', 'published', 'failed'];

/**
 * What the library's `?kind=` may say.
 *
 * Wider than `PostKind`, which is the list of things this app can be asked to
 * publish. The library shows what is already on the account, and that includes
 * ads — nothing here creates one, but the connection returns them, and a filter
 * that cannot name a category leaves those tiles belonging to nothing.
 */
export type LibraryKind = PostKind | 'ad';

const KINDS: readonly LibraryKind[] = ['post', 'reel', 'story', 'carousel', 'ad'];

export interface PublishingAddress {
  view: PublishingView;
  /** The post whose composer is open: an id, `new`, or null for closed. */
  compose: string | null;
  /**
   * The media a new post is being started from — an `InstagramMediaID` off the
   * library. Only meaningful beside `compose=new`, and set in the same write as
   * it, which is the reason it is an address key rather than a second call.
   */
  from: string | null;
  /**
   * The time a calendar slot handed a new post — an instant, as written by the
   * slot that was clicked. Only meaningful beside `compose`, and cleared with it.
   */
  at: string | null;
  /** Calendar only. */
  mode: CalendarMode;
  /** Calendar only: the month on screen, as `YYYY-MM`. Null means "this one". */
  month: string | null;
  /** Queue only. Empty means every status. */
  status: PostStatus | null;
  /** Library only. Empty means every kind. */
  kind: LibraryKind | null;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const oneOf = <T extends string>(allowed: readonly T[], value: string | null | undefined): T | null =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : null;

/** `view` is the path segment the shell handed down; '' is the module root. */
export function parseAddress(view: string, params: URLSearchParams): PublishingAddress {
  const segment = view.split('/')[0]?.trim() ?? '';
  const month = params.get('month')?.trim() ?? '';
  return {
    view: oneOf(VIEWS, segment) ?? DEFAULT_VIEW,
    compose: params.get('compose')?.trim() || null,
    from: params.get('from')?.trim() || null,
    at: params.get('at')?.trim() || null,
    mode: oneOf(CALENDAR_MODES, params.get('mode')?.trim()) ?? DEFAULT_CALENDAR_MODE,
    month: MONTH_RE.test(month) ? month : null,
    status: oneOf(STATUSES, params.get('status')?.trim()),
    kind: oneOf(KINDS, params.get('kind')?.trim()),
  };
}

/** The path segment for a view — '' for the default, so `/publishing` IS the calendar. */
export const viewSegment = (view: PublishingView): string => (view === DEFAULT_VIEW ? '' : view);

/**
 * Rewrite only this module's keys, leaving anything else in `current` alone —
 * a host may be carrying parameters of its own.
 */
export function writeAddress(current: URLSearchParams, next: PublishingAddress): URLSearchParams {
  const out = new URLSearchParams(current);
  const set = (key: string, value: string | null, omitWhen?: string): void => {
    if (!value || value === omitWhen) out.delete(key);
    else out.set(key, value);
  };
  set('compose', next.compose);
  set('from', next.from);
  set('at', next.at);
  set('mode', next.mode, DEFAULT_CALENDAR_MODE);
  set('month', next.month);
  set('status', next.status);
  set('kind', next.kind);
  return out;
}
