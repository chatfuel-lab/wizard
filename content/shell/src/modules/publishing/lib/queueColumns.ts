/**
 * The queue table's column model, and every string one of its cells prints.
 *
 * Nothing here renders. `components/QueueTable.tsx` maps a spec onto a
 * `DataTableColumn` and supplies the JSX; everything that could be wrong —
 * where a caption gets cut, what "in 3h" means, how a list with no times in it
 * sorts — is a pure function with a test beside it, because the suite in this
 * app is node-only and a `.tsx` file is the one thing no test can reach.
 *
 * The sort is computed here rather than asked of a server on purpose: there is
 * no server. A queued post is this app's own record — the publishing API has
 * neither a draft entity nor a timestamp — so the whole list is already in
 * memory and an `orderBy` would have nowhere to go.
 */
import type { SortState, TagProps } from '~ui';
import type { PostKind, PostStatus, QueuedPost } from '../types';

export type QueueColumnKey = 'post' | 'kind' | 'scheduledAt' | 'status' | 'attempts' | 'error';

export type Tone = NonNullable<TagProps['tone']>;

export interface QueueColumnSpec {
  key: QueueColumnKey;
  label: string;
  /** CSS width handed to `<colgroup>`. */
  width: string;
  align?: 'end';
  sortable: boolean;
  /** Let the cell wrap. An error message on one line is a clipped error message. */
  wrap?: boolean;
}

/**
 * The first column is the record's identity — it becomes the card heading in a
 * narrow container — so the thumbnail and the caption share one column rather
 * than the thumbnail owning a headless column of its own.
 */
export const QUEUE_COLUMNS: readonly QueueColumnSpec[] = [
  { key: 'post', label: 'Post', width: '22rem', sortable: true },
  { key: 'kind', label: 'Kind', width: '7rem', sortable: true },
  { key: 'scheduledAt', label: 'Time', width: '9rem', sortable: true },
  { key: 'status', label: 'Status', width: '8rem', sortable: true },
  { key: 'attempts', label: 'Attempts', width: '6.5rem', align: 'end', sortable: true },
  { key: 'error', label: 'Error', width: '18rem', sortable: false, wrap: true },
];

/** Dropped before the caption and the error in a container too narrow for seven columns. */
export const NARROW_HIDDEN: readonly QueueColumnKey[] = ['attempts', 'kind'];

export const STATUS_META: Record<PostStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'accent' },
  publishing: { label: 'Publishing', tone: 'warning' },
  published: { label: 'Published', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
};

/** Lifecycle order, not alphabetical: a status sort nobody can read is a dead control. */
export const STATUS_ORDER: readonly PostStatus[] = ['draft', 'scheduled', 'publishing', 'published', 'failed'];

/**
 * What the table says when a filter matches nothing.
 *
 * Written out rather than composed from the status label, because English does
 * not compose: "No draft posts" is fine and "No publishing posts" is not.
 */
export const STATUS_EMPTY: Record<PostStatus, string> = {
  draft: 'No drafts',
  scheduled: 'Nothing scheduled',
  publishing: 'Nothing publishing',
  published: 'Nothing published',
  failed: 'Nothing failed',
};

export const KIND_LABEL: Record<PostKind, string> = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
  carousel: 'Carousel',
};

const KIND_ORDER: readonly PostKind[] = ['post', 'carousel', 'reel', 'story'];

/* -------------------------------------------------------------------------- */
/* Cells                                                                      */
/* -------------------------------------------------------------------------- */

/** Long enough to recognise a post by, short enough that a row stays one line. */
export const CAPTION_EXCERPT_MAX = 90;

/**
 * A caption on one line.
 *
 * Newlines and runs of spaces collapse first: a caption is written as a block
 * of text with hashtags on their own lines, and pasting that into a table cell
 * unchanged gives a row whose first ninety characters are whitespace. The cut
 * backs off to the last word boundary when there is one nearby, so the excerpt
 * ends on a word rather than mid-syllable.
 */
export function captionExcerpt(caption: string, max = CAPTION_EXCERPT_MAX): string {
  const flat = caption.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** The card heading and the row's first cell. A story cannot carry a caption at all. */
export function postTitle(post: Pick<QueuedPost, 'caption'>): string {
  return captionExcerpt(post.caption) || 'Untitled';
}

/**
 * What the thumbnail shows: the composer's own preview when there is one, and
 * the publish URL otherwise.
 *
 * `previewUrl` may be a `blob:` that exists only in the tab that made it, which
 * is why the two are separate fields on `MediaItem` and why this prefers it —
 * a local file has no public URL until it has been uploaded.
 */
export function thumbnailOf(post: Pick<QueuedPost, 'media'>): string | null {
  const first = post.media[0];
  if (!first) return null;
  if (first.previewUrl) return first.previewUrl;
  /* A video's own URL is an .mp4 and nothing draws it as a picture. */
  return first.type === 'image' ? first.url : null;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const absoluteFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const fullFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' });

/** "24 Aug, 09:00" in the reader's own locale and zone. */
export function formatAbsolute(at: number): string {
  return absoluteFormat.format(new Date(at));
}

export interface WhenLabel {
  /** What the cell prints. Empty when there is no time — a draft has none. */
  text: string;
  /** The exact instant, for the cell's tooltip. Empty when the text is. */
  title: string;
}

/**
 * A scheduled time, relative while it is close and absolute once it is not.
 *
 * `now` is a parameter so every row in one render agrees about the present, and
 * so the rule is testable without faking the clock. Anything unreadable gives
 * an empty cell rather than "NaNd": a corrupt record must not be able to make
 * the table look broken everywhere else.
 */
export function whenLabel(iso: string | null, now: number): WhenLabel {
  if (!iso) return { text: '', title: '' };
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return { text: '', title: '' };

  const title = fullFormat.format(new Date(at));
  const delta = at - now;
  const size = Math.abs(delta);
  if (size < MINUTE) return { text: 'now', title };
  if (size >= WEEK) return { text: formatAbsolute(at), title };

  const step =
    size < HOUR
      ? `${Math.floor(size / MINUTE)}m`
      : size < DAY
        ? `${Math.floor(size / HOUR)}h`
        : `${Math.floor(size / DAY)}d`;
  return { text: delta > 0 ? `in ${step}` : `${step} ago`, title };
}

/* -------------------------------------------------------------------------- */
/* Sorting                                                                    */
/* -------------------------------------------------------------------------- */

const indexIn = <T>(order: readonly T[], value: T): number => {
  const at = order.indexOf(value);
  return at === -1 ? order.length : at;
};

/**
 * The rows in the order the header asks for.
 *
 * Two rules that are not obvious and are the reason this is not an inline
 * `[...rows].sort()`:
 *
 * 1. **No sort at all is the store's own order** — scheduled soonest first,
 *    then drafts by how recently they were touched. That is the order somebody
 *    works down, so a table that "sorted by nothing" alphabetically would be
 *    worse than one that never sorted.
 * 2. **A post with no time sorts last in BOTH directions.** A draft has no
 *    schedule, and floating every draft to the top the moment somebody reverses
 *    the time column would bury the thing they were looking for.
 *
 * The tie-break is the id, so the result is stable and two renders of the same
 * list never disagree.
 */
export function sortRows(rows: readonly QueuedPost[], sort: SortState | null): QueuedPost[] {
  const out = [...rows];
  if (!sort) return out;
  const column = QUEUE_COLUMNS.find((spec) => spec.key === sort.key);
  if (!column?.sortable) return out;

  const sign = sort.dir === 'desc' ? -1 : 1;
  out.sort((a, b) => {
    let delta = 0;
    switch (sort.key as QueueColumnKey) {
      case 'post':
        delta = postTitle(a).localeCompare(postTitle(b));
        break;
      case 'kind':
        delta = indexIn(KIND_ORDER, a.kind) - indexIn(KIND_ORDER, b.kind);
        break;
      case 'status':
        delta = indexIn(STATUS_ORDER, a.status) - indexIn(STATUS_ORDER, b.status);
        break;
      case 'attempts':
        delta = a.attempts - b.attempts;
        break;
      case 'scheduledAt': {
        if (a.scheduledAt === null || b.scheduledAt === null) {
          /* Untimed last whichever way the arrow points, so `sign` is not applied. */
          if (a.scheduledAt === b.scheduledAt) break;
          return a.scheduledAt === null ? 1 : -1;
        }
        delta = a.scheduledAt.localeCompare(b.scheduledAt);
        break;
      }
      default:
        break;
    }
    return delta === 0 ? a.id.localeCompare(b.id) : delta * sign;
  });
  return out;
}
