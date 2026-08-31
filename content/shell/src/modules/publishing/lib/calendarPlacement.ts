/**
 * Where a post sits on the calendar, and how it looks once it is there.
 *
 * Everything on the calendar that can be wrong lives in this file. The views
 * are wiring: `CalendarView.tsx` picks a surface and hands it numbers, and the
 * numbers come from here, where a test can ask for them without a browser.
 *
 * ## The calendar is this app's queue, not the account's history
 *
 * `InstagramPost`, `InstagramReel` and `InstagramStory` carry no timestamp of
 * any kind — not a creation time, not a publish time. So media that went out
 * some other way cannot be placed on a day at all, and nothing here ever tries:
 * the only input is `QueuedPost`, whose `scheduledAt` this app wrote itself.
 *
 * ## Times are stored in UTC and drawn in the viewer's zone
 *
 * `scheduledAt` is ISO 8601 UTC. Every function that turns one into a day or a
 * minute takes an IANA zone and reads the wall clock in it, so the same queue
 * drawn in Berlin and in Mexico City puts each post on the day its viewer would
 * call it. The reverse — a day and a minute the viewer pointed at, back to an
 * instant — goes through `wallClockToInstant`, which resolves a daylight-saving
 * gap and a fold explicitly rather than landing an hour out twice a year.
 *
 * Day arithmetic is done on `DayKey` strings and never on `Date`: stepping an
 * instant by 86_400_000 ms crosses a transition 23 or 25 hours later and lands
 * on the wrong day.
 *
 * ## What is NOT here
 *
 * The month cell's "+N more" split. `MonthGrid` owns it, because only the grid
 * knows how tall a row turned out to be — it measures, and clamps whatever cap
 * it is given down to what fits. What this file owns is the cap itself
 * (`monthCellLimit`), which is a design decision and therefore testable.
 */
import {
  MINUTES_PER_DAY,
  bandAtLeast,
  monthMatrix,
  parseDayKey,
  startOfWeek,
  wallClockIn,
  wallClockToInstant,
  weekDays,
  type Band,
  type DayKey,
  type EventChipStatus,
  type EventChipTone,
  type GridDensity,
  type MonthKey,
  type Weekday,
} from '~ui';
import { APP_CONFIG } from '../../shellConfig';
import type { CalendarMode } from './publishingParams';
import type { PostKind, PostStatus, QueuedPost } from '../types';

/**
 * The length a post is drawn with on the week grid.
 *
 * A post has no duration — it is an instant, and the API has nothing to say
 * about how long publishing takes. An hour is a SIZE, not a claim: it is what
 * makes a block tall enough to be the card a post deserves — a picture, a
 * caption and a time — rather than a coloured sliver. Nothing reads it back,
 * which is also why the week grid offers no resize.
 *
 * It is an hour and the grid is drawn at `WEEK_DENSITY` for one reason: at that
 * density one hour is exactly `POST_CARD_PX` tall, so a block's height is
 * always its own minute span. That is what keeps the lane packer honest — two
 * cards sit side by side exactly when their spans overlap, and never because a
 * fixed-size card grew past the minutes underneath it.
 */
export const POST_BLOCK_MIN = 60;

/**
 * The week grid's hour height. `comfortable` is 80px an hour — see
 * `POST_BLOCK_MIN` for why the two numbers are chosen together.
 */
export const WEEK_DENSITY: GridDensity = 'comfortable';

/** A full-size card: `POST_BLOCK_MIN` minutes at `WEEK_DENSITY`, in pixels. */
export const POST_CARD_PX = 80;

/**
 * The shortest a block may be drawn.
 *
 * Under this a card is a sliver with a time on it, so two posts closer together
 * than this are genuinely at the same moment as far as the grid is concerned
 * and the lane packer is allowed to put them side by side.
 */
const POST_BLOCK_MIN_FLOOR = 30;

/** A post as the week grid places it: where it starts, and how tall it is drawn. */
export interface BlockSpan {
  id: string;
  start: number;
  end: number;
}

/**
 * How tall each post in one day's column is drawn.
 *
 * A post is an instant, so the block's length is a SIZE and not a claim — which
 * leaves it free to be chosen for legibility rather than derived from data. It
 * is an hour where an hour is free, and it shortens to meet whatever comes
 * next: two posts half an hour apart become two half-hour cards, one under the
 * other, at the full width of the column.
 *
 * That is the whole reason this exists. A fixed hour would make 10:00 and 10:30
 * overlap, the lane packer would honestly split the column in two, and both
 * posts would be drawn half as wide as they need to be readable. Cutting the
 * earlier one short is the difference between a stack and a pair of slivers,
 * and it costs nothing because the length never meant anything.
 *
 * Below `POST_BLOCK_MIN_FLOOR` it stops giving way: posts that close together
 * do overlap, and side by side is then the honest drawing.
 */
export function blockSpans(
  posts: readonly { id: string; minute: number }[],
  dayEnd: number = MINUTES_PER_DAY,
): BlockSpan[] {
  const sorted = [...posts].sort((a, b) => a.minute - b.minute || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sorted.map((post, index) => {
    const next = sorted[index + 1];
    const room = (next ? next.minute : dayEnd) - post.minute;
    const length = Math.max(POST_BLOCK_MIN_FLOOR, Math.min(POST_BLOCK_MIN, room));
    return { id: post.id, start: post.minute, end: Math.min(dayEnd, post.minute + length) };
  });
}

/**
 * Minutes between the week gutter's hour labels.
 *
 * Every card prints its own time, so the gutter is only ever asked for rough
 * bearings — morning, afternoon, evening. A mark every three hours answers that
 * and leaves the column to the posts; twenty-four of them would be a ruler
 * beside a thing that is already numbered.
 */
export const HOUR_LABEL_STEP_MIN = 180;

/** Minutes a drag or a slot click lands on. */
export const SNAP_MIN = 15;

/** The time of day a click on a bare month cell proposes. */
export const DEFAULT_SLOT_MINUTE = 12 * 60;

/** Where the week grid is scrolled when the week holds nothing. */
export const DEFAULT_SCROLL_MINUTE = APP_CONFIG.calendarScrollMinute;

/** What a post is called when it has no caption to be called by. */
export const KIND_LABEL: Record<PostKind, string> = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
  carousel: 'Carousel',
};

/* -------------------------------------------------------------------------- */
/* Instants → the grid                                                        */
/* -------------------------------------------------------------------------- */

type Timed = Pick<QueuedPost, 'scheduledAt'>;

/** The instant a post is scheduled for, or null when it has no time (a draft). */
function instantOf(post: Timed): number | null {
  if (!post.scheduledAt) return null;
  const at = Date.parse(post.scheduledAt);
  return Number.isFinite(at) ? at : null;
}

/**
 * The day a post falls on, as the viewer's own clock reads it. `''` for a post
 * with no time or an unreadable one — the same empty key `groupByDayKey` drops,
 * so an unplaceable post is left off the grid rather than filed under a wrong
 * day.
 */
export function postDayKey(post: Timed, timeZone: string): DayKey {
  const at = instantOf(post);
  return at === null ? '' : wallClockIn(at, timeZone).dayKey;
}

/** Minute of the day a post falls on, viewer's clock. `-1` when it has no time. */
export function postMinute(post: Timed, timeZone: string): number {
  const at = instantOf(post);
  return at === null ? -1 : wallClockIn(at, timeZone).minuteOfDay;
}

/**
 * Order inside a day: by time, then by id.
 *
 * The id tiebreak is not decoration. Two posts at the same minute would
 * otherwise swap places whenever the store rebuilt its order, and a chip that
 * changes row under the pointer is a chip that gets dragged by mistake.
 */
export function comparePosts(a: QueuedPost, b: QueuedPost): number {
  const left = a.scheduledAt ?? '';
  const right = b.scheduledAt ?? '';
  if (left !== right) return left < right ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Dated posts bucketed by the day they fall on, each bucket in display order. */
export function bucketByDay(posts: readonly QueuedPost[], timeZone: string): Map<DayKey, QueuedPost[]> {
  const buckets = new Map<DayKey, QueuedPost[]>();
  for (const post of posts) {
    const key = postDayKey(post, timeZone);
    if (!key) continue;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(post);
    else buckets.set(key, [post]);
  }
  for (const bucket of buckets.values()) bucket.sort(comparePosts);
  return buckets;
}

/* -------------------------------------------------------------------------- */
/* Windows                                                                    */
/* -------------------------------------------------------------------------- */

/** The seven days of the week `day` sits in, in display order. */
export function weekWindow(day: DayKey, weekStartsOn: Weekday): DayKey[] {
  const start = startOfWeek(day, weekStartsOn);
  return start ? weekDays(start) : [];
}

/**
 * The days a surface covers.
 *
 * A month covers 42 days, not 28–31: the grid is always six rows of seven, so
 * the last days of the previous month and the first of the next are on screen
 * and a post on one of them has to be placed. The list covers everything the
 * queue holds, which is why it answers with no window at all.
 */
export function windowDays(mode: CalendarMode, anchor: DayKey, month: MonthKey, weekStartsOn: Weekday): DayKey[] {
  if (mode === 'month') return monthMatrix(month, weekStartsOn);
  if (mode === 'week') return weekWindow(anchor, weekStartsOn);
  return [];
}

/** The posts that land on one of `days`. An empty window means every post. */
export function postsInDays(posts: readonly QueuedPost[], days: readonly DayKey[], timeZone: string): QueuedPost[] {
  if (days.length === 0) return [...posts];
  const wanted = new Set(days);
  return posts.filter((post) => wanted.has(postDayKey(post, timeZone)));
}

/** Today, as the viewer's own clock reads it. */
export function todayKeyIn(timeZone: string, nowMs: number = Date.now()): DayKey {
  return wallClockIn(nowMs, timeZone).dayKey;
}

/**
 * Which surface actually renders.
 *
 * A month grid needs seven readable columns and a week grid needs seven
 * scrollable ones; below the widths where those exist the honest answer is the
 * list, which is the same posts in the same order and readable at any size.
 */
export function effectiveMode(requested: CalendarMode, band: Band): CalendarMode {
  if (band === 'compact') return 'list';
  /* Both grids are seven columns wide. Under the wide band a column is
     narrower than the time that has to be printed in it, so neither is drawn
     and the list — which is one column by design — stands in for whichever was
     asked for. */
  if (requested !== 'list' && !bandAtLeast(band, 'wide')) return 'list';
  return requested;
}

/**
 * How many chips a month cell offers before it folds the rest into "+N more".
 *
 * An upper bound only: the grid measures its own rows and shows fewer when the
 * container is short. Wider means taller cells, so the cap rises with the band.
 */
export function monthCellLimit(band: Band): number {
  return bandAtLeast(band, 'inline') ? 4 : 3;
}

/** Where the week grid starts scrolled: an hour before the first post in it. */
export function initialScrollMinute(posts: readonly QueuedPost[], timeZone: string): number {
  let earliest = Number.POSITIVE_INFINITY;
  for (const post of posts) {
    const minute = postMinute(post, timeZone);
    if (minute >= 0 && minute < earliest) earliest = minute;
  }
  if (!Number.isFinite(earliest)) return DEFAULT_SCROLL_MINUTE;
  return Math.max(0, earliest - 60);
}

/* -------------------------------------------------------------------------- */
/* The grid → instants                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The instant a slot names, as the ISO 8601 UTC the queue stores.
 *
 * Minute precision: a calendar's finest gesture is a minute, and a drag that
 * carried seconds along would make two posts that look simultaneous sort
 * differently. `''` when the day is not a real date.
 */
export function slotIso(day: DayKey, minuteOfDay: number, timeZone: string): string {
  const civil = parseDayKey(day);
  if (!civil) return '';
  const minute = Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.round(minuteOfDay)));
  const at = wallClockToInstant(
    {
      year: civil.year,
      month: civil.month,
      day: civil.day,
      hour: Math.floor(minute / 60),
      minute: minute % 60,
      second: 0,
    },
    timeZone,
  );
  return new Date(at).toISOString();
}

/**
 * The same post on another day, at the same time of day.
 *
 * The wall clock is what is held constant, not the instant — a 09:00 post
 * dragged across a daylight-saving change is still a 09:00 post, which is a
 * different number of hours from UTC on the two sides of it. `''` when the move
 * cannot be expressed.
 */
export function movedToDay(post: Timed, day: DayKey, timeZone: string): string {
  const minute = postMinute(post, timeZone);
  if (minute < 0) return '';
  return slotIso(day, minute, timeZone);
}

/* -------------------------------------------------------------------------- */
/* What a post looks like, and what it does when clicked                      */
/* -------------------------------------------------------------------------- */

/** What a week-grid card has room to draw. */
export interface PostBlockLayout {
  /** Lines of caption. 0 leaves the header line alone on a card too short for prose. */
  captionLines: 0 | 1 | 2;
  thumbnail: boolean;
  /** The wordless status pill along the bottom. */
  pill: boolean;
  /**
   * Half the padding. The last thing given up before the caption itself: a card
   * that has traded away its picture and its pill has room to spare at the
   * edges long before it has room to spare in the middle.
   */
  dense: boolean;
}

/* The card's own pixel budget, in the order the parts are stacked. These are
   the numbers the component's classes compile to — p-2 padding, a text-micro
   header line, gap-0.5, a text-meta caption line, the h-10 thumbnail, the h-1
   pill — and they live here because deciding what fits is arithmetic, and
   arithmetic in JSX is arithmetic nobody can test. */
const CARD_PAD_PX = 16;
const CARD_PAD_DENSE_PX = 8;
const CARD_HEADER_PX = 14;
const CARD_GAP_PX = 2;
const CARD_CAPTION_LINE_PX = 16;
const CARD_THUMB_PX = 40;
const CARD_PILL_PX = 4;

/** The body sits beside the thumbnail, so it is as tall as the taller of the two. */
function cardHeightPx(layout: PostBlockLayout): number {
  const body = Math.max(layout.thumbnail ? CARD_THUMB_PX : 0, layout.captionLines * CARD_CAPTION_LINE_PX);
  return (
    (layout.dense ? CARD_PAD_DENSE_PX : CARD_PAD_PX) +
    CARD_HEADER_PX +
    (body > 0 ? CARD_GAP_PX + body : 0) +
    (layout.pill ? CARD_GAP_PX + CARD_PILL_PX : 0)
  );
}

/**
 * What a card gives up as it gets shorter, richest first.
 *
 * The order is the order of what a person loses least by losing: the pill
 * repeats the tone of the glyph above it, the thumbnail repeats what the
 * caption says, and the second line of caption is the first thing that was
 * actually information. The time never goes — a calendar entry with no time on
 * it is a card about nothing.
 */
const CARD_LADDER: readonly PostBlockLayout[] = [
  { captionLines: 2, thumbnail: true, pill: true, dense: false },
  { captionLines: 2, thumbnail: true, pill: false, dense: false },
  { captionLines: 2, thumbnail: false, pill: false, dense: false },
  { captionLines: 1, thumbnail: false, pill: false, dense: false },
  { captionLines: 1, thumbnail: false, pill: false, dense: true },
  { captionLines: 0, thumbnail: false, pill: false, dense: true },
];

/**
 * How much of the card `heightPx` has room for — the tallest rung of the ladder
 * that fits.
 *
 * A block is normally exactly `POST_CARD_PX` tall and takes the top rung, but
 * the grid clips at midnight: a post at 23:40 gets twenty minutes of column and
 * a block padded up to the grid's own floor. Clipping is the case this exists
 * for, and it is why the answer is computed from the height the grid measured
 * rather than assumed from the minutes asked for.
 */
export function blockLayout(heightPx?: number): PostBlockLayout {
  if (heightPx === undefined) return CARD_LADDER[0]!;
  return CARD_LADDER.find((step) => cardHeightPx(step) <= heightPx) ?? CARD_LADDER[CARD_LADDER.length - 1]!;
}

/**
 * The trailing glyph on a card, named rather than drawn — this file is read by
 * a test with no DOM, so it decides WHICH mark and the component owns the SVG.
 * `none` is a real answer: a draft's dashed edge already says what it is, and a
 * second glyph beside it would be decoration.
 */
export type PostMark = 'none' | 'clock' | 'hourglass' | 'check' | 'warning';

export interface PostLook {
  tone: EventChipTone;
  /** `tentative` is a dashed edge: written but not committed, or still in flight. */
  chipStatus: EventChipStatus;
  /** Draw the alarm: a danger edge and a warning glyph, no words. */
  alert: boolean;
  /** The status label's tone, for the one surface that lists posts rather than plotting them. */
  tagTone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  /** The small glyph pushed to the right of a card's header line. */
  mark: PostMark;
  /** One word. Read aloud on every surface; printed only on the list. */
  label: string;
}

/**
 * Status → colour and shape.
 *
 * The eight event tones say WHAT, and structure says HOW IT IS GOING — that is
 * the design system's rule and it holds here, with one addition. A failed post
 * is the one state a person must not have to read to notice, and none of the
 * eight tones is a danger colour; so failure is drawn on top of the tone, as a
 * danger edge and a warning glyph, which survives the eight-colour palette and
 * survives colour blindness.
 */
const LOOKS: Record<PostStatus, PostLook> = {
  draft: { tone: 7, chipStatus: 'tentative', alert: false, tagTone: 'neutral', mark: 'none', label: 'Draft' },
  scheduled: { tone: 1, chipStatus: 'default', alert: false, tagTone: 'accent', mark: 'clock', label: 'Scheduled' },
  publishing: {
    tone: 3,
    chipStatus: 'tentative',
    alert: false,
    tagTone: 'warning',
    mark: 'hourglass',
    label: 'Publishing',
  },
  published: { tone: 2, chipStatus: 'default', alert: false, tagTone: 'success', mark: 'check', label: 'Published' },
  failed: { tone: 4, chipStatus: 'default', alert: true, tagTone: 'danger', mark: 'warning', label: 'Failed' },
};

export function postLook(status: PostStatus): PostLook {
  return LOOKS[status] ?? LOOKS.draft;
}

/**
 * Whether a post can be dragged to another time.
 *
 * A published post cannot: it is already on Instagram and this API has no
 * un-publish, so moving its row would only move a note about the past. Neither
 * can one that is publishing right now — the request is already out, and a new
 * time would be a time nobody is waiting for.
 */
export function canReschedule(post: Pick<QueuedPost, 'status'>): boolean {
  return post.status !== 'published' && post.status !== 'publishing';
}

export type ChipAction = { kind: 'compose'; id: string } | { kind: 'open'; url: string };

/**
 * What a click on a chip does. A published post is on Instagram, so its chip
 * goes there; everything else opens in the composer, failures included — a
 * failure is a post to fix, not a record to read.
 */
export function chipAction(post: Pick<QueuedPost, 'id' | 'status' | 'permalink'>): ChipAction {
  if (post.status === 'published' && post.permalink) return { kind: 'open', url: post.permalink };
  return { kind: 'compose', id: post.id };
}

/** The first line of the caption, or what kind of post it is. */
export function postTitle(post: Pick<QueuedPost, 'caption' | 'kind'>): string {
  const line = post.caption.split('\n').find((candidate) => candidate.trim() !== '');
  return line?.trim() ?? KIND_LABEL[post.kind];
}

/**
 * The picture a chip shows.
 *
 * `previewUrl` first: it is what the composer drew, and for an upload still in
 * this tab it is the only thing that resolves. `url` is the one Instagram will
 * fetch, which is a fine second choice and the only one after a reload.
 */
export function thumbnailOf(post: Pick<QueuedPost, 'media'>): string | null {
  const first = post.media[0];
  if (!first) return null;
  return first.previewUrl || first.url || null;
}
