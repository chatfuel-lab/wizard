import { describe, expect, it } from 'vitest';
import { HOUR_PX, MINUTES_PER_DAY, MIN_EVENT_PX } from '~ui';
import {
  DEFAULT_SCROLL_MINUTE,
  POST_BLOCK_MIN,
  POST_CARD_PX,
  WEEK_DENSITY,
  blockLayout,
  bucketByDay,
  canReschedule,
  blockSpans,
  chipAction,
  comparePosts,
  effectiveMode,
  initialScrollMinute,
  monthCellLimit,
  movedToDay,
  postDayKey,
  postLook,
  postMinute,
  postTitle,
  postsInDays,
  slotIso,
  thumbnailOf,
  todayKeyIn,
  weekWindow,
  windowDays,
} from './calendarPlacement';
import type { MediaItem, QueuedPost } from '../types';

const post = (over: Partial<QueuedPost> = {}): QueuedPost => ({
  id: 'p1',
  kind: 'post',
  caption: '',
  media: [],
  scheduledAt: null,
  status: 'scheduled',
  attempts: 0,
  mediaId: null,
  permalink: null,
  error: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...over,
});

const image = (over: Partial<MediaItem> = {}): MediaItem => ({
  id: 'm1',
  type: 'image',
  url: 'https://example.com/a.jpg',
  source: 'link',
  ...over,
});

describe('placing a post on a day', () => {
  const evening = post({ scheduledAt: '2026-08-21T23:30:00.000Z' });

  it('reads the day and the minute off the viewer’s own clock', () => {
    expect(postDayKey(evening, 'UTC')).toBe('2026-08-21');
    expect(postMinute(evening, 'UTC')).toBe(23 * 60 + 30);

    expect(postDayKey(evening, 'America/New_York')).toBe('2026-08-21');
    expect(postMinute(evening, 'America/New_York')).toBe(19 * 60 + 30);

    /* Nine and a half hours later than UTC: the same instant is tomorrow. */
    expect(postDayKey(evening, 'Asia/Tokyo')).toBe('2026-08-22');
    expect(postMinute(evening, 'Asia/Tokyo')).toBe(8 * 60 + 30);
  });

  it('places a post at midnight on the day that starts there', () => {
    const midnight = post({ scheduledAt: '2026-08-21T00:00:00.000Z' });
    expect(postDayKey(midnight, 'UTC')).toBe('2026-08-21');
    expect(postMinute(midnight, 'UTC')).toBe(0);
    /* The same instant is the previous evening four hours west. */
    expect(postDayKey(midnight, 'America/New_York')).toBe('2026-08-20');
    expect(postMinute(midnight, 'America/New_York')).toBe(20 * 60);
  });

  it('refuses to place a post it cannot read a time from', () => {
    expect(postDayKey(post({ scheduledAt: null }), 'UTC')).toBe('');
    expect(postMinute(post({ scheduledAt: null }), 'UTC')).toBe(-1);
    expect(postDayKey(post({ scheduledAt: 'not a time' }), 'UTC')).toBe('');
    expect(postMinute(post({ scheduledAt: 'not a time' }), 'UTC')).toBe(-1);
  });

  it('reads today off the viewer’s clock too', () => {
    const at = Date.parse('2026-08-21T23:30:00.000Z');
    expect(todayKeyIn('UTC', at)).toBe('2026-08-21');
    expect(todayKeyIn('Asia/Tokyo', at)).toBe('2026-08-22');
  });
});

describe('order inside a day', () => {
  it('sorts by time, then by id so equal times never swap', () => {
    const nine = post({ id: 'b', scheduledAt: '2026-08-21T09:00:00.000Z' });
    const nineToo = post({ id: 'a', scheduledAt: '2026-08-21T09:00:00.000Z' });
    const ten = post({ id: 'c', scheduledAt: '2026-08-21T10:00:00.000Z' });
    expect([ten, nine, nineToo].sort(comparePosts).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('buckets by day, each bucket already in order', () => {
    const posts = [
      post({ id: 'late', scheduledAt: '2026-08-21T18:00:00.000Z' }),
      post({ id: 'next-day', scheduledAt: '2026-08-22T09:00:00.000Z' }),
      post({ id: 'early', scheduledAt: '2026-08-21T07:00:00.000Z' }),
      post({ id: 'undated', scheduledAt: null }),
    ];
    const buckets = bucketByDay(posts, 'UTC');
    expect([...buckets.keys()].sort()).toEqual(['2026-08-21', '2026-08-22']);
    expect(buckets.get('2026-08-21')!.map((p) => p.id)).toEqual(['early', 'late']);
    expect(buckets.get('2026-08-22')!.map((p) => p.id)).toEqual(['next-day']);
  });
});

describe('the windows a surface covers', () => {
  it('gives a month six rows of seven, crossing both boundaries', () => {
    /* 2026-08-01 is a Saturday, so a Monday-first grid opens on 27 July and
       runs to 6 September. */
    const days = windowDays('month', '2026-08-15', '2026-08', 1);
    expect(days).toHaveLength(42);
    expect(days[0]).toBe('2026-07-27');
    expect(days[41]).toBe('2026-09-06');

    const sundayFirst = windowDays('month', '2026-08-15', '2026-08', 0);
    expect(sundayFirst[0]).toBe('2026-07-26');
    expect(sundayFirst[41]).toBe('2026-09-05');
  });

  it('gives a week the seven days its anchor sits in', () => {
    expect(weekWindow('2026-08-01', 1)).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ]);
    expect(weekWindow('2026-07-27', 1)[0]).toBe('2026-07-27');
    expect(weekWindow('2026-08-02', 1)[6]).toBe('2026-08-02');
    /* Sunday-first moves the same day into a different week. */
    expect(weekWindow('2026-08-02', 0)[0]).toBe('2026-08-02');
  });

  it('gives the list no window at all', () => {
    expect(windowDays('list', '2026-08-15', '2026-08', 1)).toEqual([]);
  });

  it('keeps a post from a neighbouring month that the grid still shows', () => {
    const july = post({ id: 'july', scheduledAt: '2026-07-31T12:00:00.000Z' });
    const september = post({ id: 'sept', scheduledAt: '2026-09-06T12:00:00.000Z' });
    const october = post({ id: 'oct', scheduledAt: '2026-10-01T12:00:00.000Z' });
    const days = windowDays('month', '2026-08-15', '2026-08', 1);
    expect(postsInDays([july, september, october], days, 'UTC').map((p) => p.id)).toEqual(['july', 'sept']);
  });

  it('treats an empty window as every post', () => {
    const posts = [post({ id: 'a', scheduledAt: '2026-01-01T00:00:00.000Z' })];
    expect(postsInDays(posts, [], 'UTC')).toEqual(posts);
  });
});

describe('which surface renders', () => {
  it('falls back to the list where a grid cannot fit', () => {
    expect(effectiveMode('month', 'wide')).toBe('month');
    expect(effectiveMode('month', 'inline')).toBe('month');
    expect(effectiveMode('month', 'narrow')).toBe('list');
    expect(effectiveMode('month', 'compact')).toBe('list');
    expect(effectiveMode('week', 'narrow')).toBe('list');
    expect(effectiveMode('week', 'wide')).toBe('week');
    expect(effectiveMode('week', 'compact')).toBe('list');
    expect(effectiveMode('list', 'inline')).toBe('list');
  });

  it('offers more chips per month cell the taller the cells get', () => {
    expect(monthCellLimit('wide')).toBe(3);
    expect(monthCellLimit('inline')).toBe(4);
  });
});

describe('where the week grid opens', () => {
  it('starts an hour before the first post of the week', () => {
    const posts = [
      post({ id: 'late', scheduledAt: '2026-08-21T18:00:00.000Z' }),
      post({ id: 'early', scheduledAt: '2026-08-21T10:00:00.000Z' }),
    ];
    expect(initialScrollMinute(posts, 'UTC')).toBe(9 * 60);
  });

  it('never scrolls above the top of the day', () => {
    expect(initialScrollMinute([post({ scheduledAt: '2026-08-21T00:15:00.000Z' })], 'UTC')).toBe(0);
  });

  it('falls back to the working morning when the week is empty', () => {
    expect(initialScrollMinute([], 'UTC')).toBe(DEFAULT_SCROLL_MINUTE);
  });
});

describe('turning a slot back into an instant', () => {
  it('reads the slot as a wall clock in the viewer’s zone', () => {
    expect(slotIso('2026-08-21', 0, 'UTC')).toBe('2026-08-21T00:00:00.000Z');
    expect(slotIso('2026-08-21', 9 * 60 + 30, 'UTC')).toBe('2026-08-21T09:30:00.000Z');
    /* Summer in New York is four hours behind. */
    expect(slotIso('2026-08-21', 9 * 60, 'America/New_York')).toBe('2026-08-21T13:00:00.000Z');
  });

  it('resolves a wall clock that daylight saving skipped', () => {
    /* 02:30 on 8 March 2026 does not exist in New York; the clock goes 01:59 →
       03:00. The slot moves forward past the gap rather than an hour back. */
    expect(slotIso('2026-03-08', 2 * 60 + 30, 'America/New_York')).toBe('2026-03-08T07:30:00.000Z');
  });

  it('resolves a wall clock that happens twice', () => {
    /* 01:30 on 1 November 2026 happens twice in New York. The earlier one — the
       one still on summer time — is the one a person means. */
    expect(slotIso('2026-11-01', 60 + 30, 'America/New_York')).toBe('2026-11-01T05:30:00.000Z');
  });

  it('clamps a minute outside the day and refuses a day that is not one', () => {
    expect(slotIso('2026-08-21', -30, 'UTC')).toBe('2026-08-21T00:00:00.000Z');
    expect(slotIso('2026-08-21', 5000, 'UTC')).toBe('2026-08-21T23:59:00.000Z');
    expect(slotIso('2026-02-30', 0, 'UTC')).toBe('');
    expect(slotIso('', 0, 'UTC')).toBe('');
  });
});

describe('moving a post to another day', () => {
  it('keeps the time of day, not the distance from UTC', () => {
    /* 09:00 in New York on 7 March is winter time; on 9 March it is summer
       time. Holding the instant would land the post at 10:00. */
    const morning = post({ scheduledAt: '2026-03-07T14:00:00.000Z' });
    expect(movedToDay(morning, '2026-03-09', 'America/New_York')).toBe('2026-03-09T13:00:00.000Z');
  });

  it('moves a post across a month boundary', () => {
    const last = post({ scheduledAt: '2026-07-31T12:00:00.000Z' });
    expect(movedToDay(last, '2026-08-01', 'UTC')).toBe('2026-08-01T12:00:00.000Z');
  });

  it('cannot move a post that has no time', () => {
    expect(movedToDay(post({ scheduledAt: null }), '2026-08-01', 'UTC')).toBe('');
  });
});

describe('how a post looks and what it does', () => {
  it('marks a failure so it needs no words', () => {
    expect(postLook('failed').alert).toBe(true);
    for (const status of ['draft', 'scheduled', 'publishing', 'published'] as const) {
      expect(postLook(status).alert).toBe(false);
    }
  });

  it('draws what is not committed yet as tentative', () => {
    expect(postLook('draft').chipStatus).toBe('tentative');
    expect(postLook('publishing').chipStatus).toBe('tentative');
    expect(postLook('scheduled').chipStatus).toBe('default');
    expect(postLook('published').chipStatus).toBe('default');
  });

  it('gives every status its own glyph, and leaves a draft to its dashed edge', () => {
    expect(postLook('draft').mark).toBe('none');
    expect(postLook('scheduled').mark).toBe('clock');
    expect(postLook('publishing').mark).toBe('hourglass');
    expect(postLook('published').mark).toBe('check');
    expect(postLook('failed').mark).toBe('warning');
  });

  it('gives every status a tone of its own', () => {
    const tones = (['draft', 'scheduled', 'publishing', 'published', 'failed'] as const).map(
      (status) => postLook(status).tone,
    );
    expect(new Set(tones).size).toBe(tones.length);
  });

  it('freezes a post that has already gone out, or is going out now', () => {
    expect(canReschedule(post({ status: 'draft' }))).toBe(true);
    expect(canReschedule(post({ status: 'scheduled' }))).toBe(true);
    expect(canReschedule(post({ status: 'failed' }))).toBe(true);
    expect(canReschedule(post({ status: 'publishing' }))).toBe(false);
    expect(canReschedule(post({ status: 'published' }))).toBe(false);
  });

  it('sends a published post to Instagram and everything else to the composer', () => {
    expect(chipAction(post({ id: 'x', status: 'published', permalink: 'https://example.com/p/1/' }))).toEqual({
      kind: 'open',
      url: 'https://example.com/p/1/',
    });
    /* Published but with no link back: the composer is still better than nothing. */
    expect(chipAction(post({ id: 'x', status: 'published', permalink: null }))).toEqual({ kind: 'compose', id: 'x' });
    expect(chipAction(post({ id: 'x', status: 'failed' }))).toEqual({ kind: 'compose', id: 'x' });
    expect(chipAction(post({ id: 'x', status: 'draft' }))).toEqual({ kind: 'compose', id: 'x' });
  });

  it('titles a post by its first written line, or by what it is', () => {
    expect(postTitle(post({ caption: 'Sunset over the harbour\nand a second line' }))).toBe('Sunset over the harbour');
    expect(postTitle(post({ caption: '\n\n  Late start  \n' }))).toBe('Late start');
    expect(postTitle(post({ caption: '', kind: 'reel' }))).toBe('Reel');
    expect(postTitle(post({ caption: '   ', kind: 'carousel' }))).toBe('Carousel');
  });

  it('prefers the picture the composer drew to the one Instagram will fetch', () => {
    expect(thumbnailOf(post({ media: [image({ previewUrl: 'blob:local' })] }))).toBe('blob:local');
    expect(thumbnailOf(post({ media: [image()] }))).toBe('https://example.com/a.jpg');
    expect(thumbnailOf(post({ media: [] }))).toBeNull();
  });
});

describe('how much of a card fits', () => {
  it('draws a block exactly as tall as the minutes under it', () => {
    /* The whole reason the week grid is drawn at this density: a card that grew
       past its own span would overlap the next post without the lane packer —
       which works in minutes — ever knowing about it. */
    expect((POST_BLOCK_MIN / 60) * HOUR_PX[WEEK_DENSITY]).toBe(POST_CARD_PX);
  });

  it('draws the whole card in the height a full block gets', () => {
    expect(blockLayout(POST_CARD_PX)).toEqual({ captionLines: 2, thumbnail: true, pill: true, dense: false });
    /* No measurement yet — assume the block is whole rather than pre-shrinking it. */
    expect(blockLayout()).toEqual({ captionLines: 2, thumbnail: true, pill: true, dense: false });
  });

  it('gives up the pill, then the picture, then the second line, then the padding', () => {
    expect(blockLayout(78)).toEqual({ captionLines: 2, thumbnail: true, pill: true, dense: false });
    expect(blockLayout(77)).toEqual({ captionLines: 2, thumbnail: true, pill: false, dense: false });
    expect(blockLayout(72)).toEqual({ captionLines: 2, thumbnail: true, pill: false, dense: false });
    expect(blockLayout(71)).toEqual({ captionLines: 2, thumbnail: false, pill: false, dense: false });
    expect(blockLayout(64)).toEqual({ captionLines: 2, thumbnail: false, pill: false, dense: false });
    expect(blockLayout(63)).toEqual({ captionLines: 1, thumbnail: false, pill: false, dense: false });
    expect(blockLayout(48)).toEqual({ captionLines: 1, thumbnail: false, pill: false, dense: false });
    /* The half-hour block a stacked pair gets. It keeps a line of the caption
       by giving up its margins, which is the last thing worth trading. */
    expect(blockLayout(47)).toEqual({ captionLines: 1, thumbnail: false, pill: false, dense: true });
    expect(blockLayout(40)).toEqual({ captionLines: 1, thumbnail: false, pill: false, dense: true });
    expect(blockLayout(39)).toEqual({ captionLines: 0, thumbnail: false, pill: false, dense: true });
  });

  it('keeps the time and drops everything else on a block clipped to nothing', () => {
    /* A post at 23:55 gets the grid's own floor and nothing more. */
    expect(blockLayout(MIN_EVENT_PX)).toEqual({ captionLines: 0, thumbnail: false, pill: false, dense: true });
    expect(blockLayout(0)).toEqual({ captionLines: 0, thumbnail: false, pill: false, dense: true });
  });

  it('never shows less on a taller card', () => {
    const weight = (height: number) => {
      const layout = blockLayout(height);
      return layout.captionLines + (layout.thumbnail ? 1 : 0) + (layout.pill ? 1 : 0);
    };
    for (let height = 1; height <= 200; height += 1) {
      expect(weight(height)).toBeGreaterThanOrEqual(weight(height - 1));
    }
  });
});

describe('how tall a post is drawn on the week grid', () => {
  const spans = (minutes: number[]) => blockSpans(minutes.map((minute, index) => ({ id: `p${index}`, minute })));

  it('gives a post the full hour when nothing follows it', () => {
    expect(spans([600])).toEqual([{ id: 'p0', start: 600, end: 660 }]);
  });

  it('cuts a post short to meet the next one, so neither is drawn half-width', () => {
    /* The whole point: 10:00 and 10:30 stack, they do not sit side by side. */
    expect(spans([600, 630])).toEqual([
      { id: 'p0', start: 600, end: 630 },
      { id: 'p1', start: 630, end: 690 },
    ]);
  });

  it('stops giving way below the floor, and lets those two overlap', () => {
    const [first, second] = spans([600, 610]);
    expect(first).toEqual({ id: 'p0', start: 600, end: 630 });
    expect(second!.start).toBeLessThan(first!.end);
  });

  it('never runs past the end of the day', () => {
    const [only] = spans([MINUTES_PER_DAY - 20]);
    expect(only!.end).toBe(MINUTES_PER_DAY);
  });

  it('places posts in time order whatever order they arrive in', () => {
    expect(spans([840, 600]).map((span) => span.start)).toEqual([600, 840]);
  });
});
