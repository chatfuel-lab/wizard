import { describe, expect, it } from 'vitest';
import type { MediaItem, QueuedPost } from '../types';
import {
  CAPTION_EXCERPT_MAX,
  QUEUE_COLUMNS,
  STATUS_EMPTY,
  STATUS_META,
  STATUS_ORDER,
  captionExcerpt,
  formatAbsolute,
  postTitle,
  sortRows,
  thumbnailOf,
  whenLabel,
} from './queueColumns';

const NOW = Date.parse('2026-08-21T12:00:00.000Z');

const post = (over: Partial<QueuedPost> = {}): QueuedPost => ({
  id: 'p1',
  kind: 'post',
  caption: '',
  media: [],
  scheduledAt: null,
  status: 'draft',
  attempts: 0,
  mediaId: null,
  permalink: null,
  error: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...over,
});

describe('captionExcerpt', () => {
  it('flattens the newlines a real caption is written with', () => {
    expect(captionExcerpt('Bags landed.\n\n#coffee  #roastery')).toBe('Bags landed. #coffee #roastery');
  });

  it('leaves a short caption exactly as written', () => {
    expect(captionExcerpt('Two rooms, one grinder.')).toBe('Two rooms, one grinder.');
  });

  it('cuts on a word boundary when there is one near the end', () => {
    const out = captionExcerpt('alpha bravo charlie delta echo foxtrot golf hotel india', 20);
    expect(out).toBe('alpha bravo charlie…');
    expect(out.endsWith(' …')).toBe(false);
  });

  it('cuts mid-word rather than throwing most of the excerpt away', () => {
    // The last space is at index 5 of 20 — backing off to it would leave "alpha".
    expect(captionExcerpt('alpha bravocharliedeltaechofoxtrot', 20)).toBe('alpha bravocharliede…');
  });

  it('never returns more than the budget plus its ellipsis', () => {
    const long = 'x'.repeat(500);
    expect(captionExcerpt(long).length).toBe(CAPTION_EXCERPT_MAX + 1);
  });
});

describe('the status vocabulary', () => {
  it('names every status once, in lifecycle order, with an empty line for each', () => {
    // A status the filter can select and the table cannot describe is a screen
    // that says nothing when somebody lands on it.
    for (const status of STATUS_ORDER) {
      expect(STATUS_META[status].label).toBeTruthy();
      expect(STATUS_EMPTY[status]).toBeTruthy();
    }
    expect(STATUS_ORDER).toHaveLength(Object.keys(STATUS_EMPTY).length);
    expect(new Set(STATUS_ORDER).size).toBe(STATUS_ORDER.length);
  });
});

describe('postTitle', () => {
  it('falls back for a post that carries no caption — a story never can', () => {
    expect(postTitle({ caption: '' })).toBe('Untitled');
    expect(postTitle({ caption: '   \n ' })).toBe('Untitled');
    expect(postTitle({ caption: 'Saturday hours are back.' })).toBe('Saturday hours are back.');
  });
});

describe('thumbnailOf', () => {
  const item = (over: Partial<MediaItem> = {}): MediaItem => ({
    id: 'm1',
    type: 'image',
    url: 'https://example.com/a.jpg',
    source: 'link',
    ...over,
  });

  it('prefers the composer preview, which may be local to this tab', () => {
    expect(thumbnailOf({ media: [item({ previewUrl: 'blob:local' })] })).toBe('blob:local');
  });

  it('draws nothing for a video with no preview — an .mp4 is not a picture', () => {
    expect(thumbnailOf({ media: [item({ type: 'video', url: 'https://example.com/a.mp4' })] })).toBeNull();
  });

  it('has nothing to draw for a post with no media at all', () => {
    expect(thumbnailOf({ media: [] })).toBeNull();
  });
});

describe('whenLabel', () => {
  it('says nothing for a draft, which has no time', () => {
    expect(whenLabel(null, NOW)).toEqual({ text: '', title: '' });
  });

  it('says nothing rather than NaN for an unreadable record', () => {
    expect(whenLabel('not a date', NOW).text).toBe('');
  });

  it('reads forwards and backwards from the same clock', () => {
    expect(whenLabel('2026-08-21T12:00:30.000Z', NOW).text).toBe('now');
    expect(whenLabel('2026-08-21T12:20:00.000Z', NOW).text).toBe('in 20m');
    expect(whenLabel('2026-08-21T15:00:00.000Z', NOW).text).toBe('in 3h');
    expect(whenLabel('2026-08-23T12:00:00.000Z', NOW).text).toBe('in 2d');
    expect(whenLabel('2026-08-21T11:40:00.000Z', NOW).text).toBe('20m ago');
    expect(whenLabel('2026-08-21T09:00:00.000Z', NOW).text).toBe('3h ago');
    expect(whenLabel('2026-08-19T12:00:00.000Z', NOW).text).toBe('2d ago');
  });

  it('goes absolute past a week, where "in 34d" stops meaning anything', () => {
    const far = '2026-10-01T09:00:00.000Z';
    expect(whenLabel(far, NOW).text).toBe(formatAbsolute(Date.parse(far)));
  });

  it('always carries the exact instant for the cell to hang a tooltip on', () => {
    expect(whenLabel('2026-08-21T15:00:00.000Z', NOW).title).not.toBe('');
  });
});

describe('sortRows', () => {
  const rows = [
    post({
      id: 'a',
      caption: 'Bravo',
      kind: 'reel',
      status: 'failed',
      attempts: 3,
      scheduledAt: '2026-08-22T09:00:00.000Z',
    }),
    post({ id: 'b', caption: 'Alpha', kind: 'post', status: 'draft', attempts: 0, scheduledAt: null }),
    post({
      id: 'c',
      caption: 'Charlie',
      kind: 'story',
      status: 'published',
      attempts: 1,
      scheduledAt: '2026-08-20T09:00:00.000Z',
    }),
  ];
  const ids = (list: readonly QueuedPost[]): string[] => list.map((each) => each.id);

  it('leaves the store order alone when nothing is sorted', () => {
    expect(ids(sortRows(rows, null))).toEqual(['a', 'b', 'c']);
  });

  it('never mutates what it was given', () => {
    const input = [...rows];
    sortRows(input, { key: 'post', dir: 'asc' });
    expect(ids(input)).toEqual(['a', 'b', 'c']);
  });

  it('ignores a sort on a column that cannot be sorted', () => {
    expect(ids(sortRows(rows, { key: 'error', dir: 'asc' }))).toEqual(['a', 'b', 'c']);
    expect(QUEUE_COLUMNS.find((spec) => spec.key === 'error')?.sortable).toBe(false);
  });

  it('sorts captions, and an untitled post sorts under U', () => {
    expect(ids(sortRows(rows, { key: 'post', dir: 'asc' }))).toEqual(['b', 'a', 'c']);
    expect(ids(sortRows(rows, { key: 'post', dir: 'desc' }))).toEqual(['c', 'a', 'b']);
  });

  it('sorts status by the lifecycle, not by the alphabet', () => {
    // Alphabetically "failed" would come before "published"; here it comes last.
    expect(ids(sortRows(rows, { key: 'status', dir: 'asc' }))).toEqual(['b', 'c', 'a']);
  });

  it('keeps a post with no time at the bottom whichever way the arrow points', () => {
    expect(ids(sortRows(rows, { key: 'scheduledAt', dir: 'asc' }))).toEqual(['c', 'a', 'b']);
    expect(ids(sortRows(rows, { key: 'scheduledAt', dir: 'desc' }))).toEqual(['a', 'c', 'b']);
  });

  it('breaks ties on the id so two renders never disagree', () => {
    const tied = [post({ id: 'z', attempts: 1 }), post({ id: 'y', attempts: 1 })];
    expect(ids(sortRows(tied, { key: 'attempts', dir: 'asc' }))).toEqual(['y', 'z']);
    expect(ids(sortRows(tied, { key: 'attempts', dir: 'desc' }))).toEqual(['y', 'z']);
  });
});
