import { describe, expect, it } from 'vitest';
import { problemFor, validatePost } from './postValidation';
import { CAPTION_MAX } from './constants';
import type { MediaItem, NewPost, PostKind } from '../types';

const photo = (n = 1, url = `https://example.com/photo-${n}.jpg`): MediaItem => ({
  id: `m-${n}`,
  type: 'image',
  url,
  source: 'link',
});

const video = (n = 1, url = `https://example.com/reel-${n}.mp4`): MediaItem => ({
  id: `v-${n}`,
  type: 'video',
  url,
  source: 'link',
});

const draft = (kind: PostKind, over: Partial<NewPost> = {}): NewPost => ({
  kind,
  caption: '',
  media: [],
  scheduledAt: null,
  ...over,
});

const fields = (post: NewPost, options?: Parameters<typeof validatePost>[1]) =>
  validatePost(post, options).map((problem) => problem.field);

describe('media', () => {
  it('asks for a photo on a feed post', () => {
    expect(problemFor(validatePost(draft('post')), 'media')).toBe('Add a photo.');
  });

  it('asks for a video on a reel', () => {
    expect(problemFor(validatePost(draft('reel')), 'media')).toBe('Add a video.');
  });

  it('takes either on a story', () => {
    expect(validatePost(draft('story', { media: [video(1)] }))).toEqual([]);
    expect(validatePost(draft('story', { media: [photo(1)] }))).toEqual([]);
  });

  it('refuses a carousel of one', () => {
    expect(problemFor(validatePost(draft('carousel', { media: [photo(1)] })), 'media')).toMatch(/at least 2/);
  });

  it('takes a carousel of two', () => {
    expect(validatePost(draft('carousel', { media: [photo(1), photo(2)] }))).toEqual([]);
  });

  it('takes a carousel of ten and refuses eleven', () => {
    const items = Array.from({ length: 11 }, (_, i) => photo(i));
    expect(validatePost(draft('carousel', { media: items.slice(0, 10) }))).toEqual([]);
    expect(problemFor(validatePost(draft('carousel', { media: items })), 'media')).toMatch(/at most 10/);
  });

  it('mixes photos and videos inside a carousel', () => {
    expect(validatePost(draft('carousel', { media: [photo(1), video(2)] }))).toEqual([]);
  });

  it('refuses a second item on a kind that takes one', () => {
    expect(problemFor(validatePost(draft('post', { media: [photo(1), photo(2)] })), 'media')).toMatch(/one item/);
  });

  it('refuses a photo where a reel wants a video', () => {
    expect(problemFor(validatePost(draft('reel', { media: [photo(1)] })), 'media')).toBe('A reel needs a video.');
  });

  it('refuses a video in the feed', () => {
    expect(problemFor(validatePost(draft('post', { media: [video(1)] })), 'media')).toBe('A post takes a photo.');
  });

  it('refuses an item with no address yet', () => {
    const pending: MediaItem = { id: 'm-x', type: 'image', url: '', source: 'upload' };
    expect(problemFor(validatePost(draft('post', { media: [pending] })), 'media')).toBe('One item is not ready yet.');
    expect(problemFor(validatePost(draft('carousel', { media: [photo(1), pending] })), 'media')).toBe(
      'One item is not ready yet.',
    );
  });
});

describe('media that will not last', () => {
  const upload = (n = 1): MediaItem => ({
    id: `u-${n}`,
    type: 'image',
    url: `https://storage.example.com/bot/abc/${n}.jpg`,
    source: 'upload',
    fileId: `bot/abc/${n}`,
  });

  it('lets a fresh upload be published now', () => {
    expect(validatePost(draft('post', { media: [upload()] }))).toEqual([]);
  });

  it('refuses a fresh upload for a post that has to wait', () => {
    const post = draft('post', { media: [upload()] });
    expect(problemFor(validatePost(post, { requireDurableMedia: true }), 'media')).toMatch(/upload/);
  });

  it('lets a pasted link and a library pick wait', () => {
    const library: MediaItem = { ...photo(2), source: 'library' };
    expect(validatePost(draft('carousel', { media: [photo(1), library] }), { requireDurableMedia: true })).toEqual([]);
  });

  it('finds one upload hiding in a carousel', () => {
    const post = draft('carousel', { media: [photo(1), upload(2)] });
    expect(problemFor(validatePost(post, { requireDurableMedia: true }), 'media')).toMatch(/upload/);
  });
});

describe('caption', () => {
  it('takes a caption up to the ceiling', () => {
    expect(validatePost(draft('post', { media: [photo()], caption: 'x'.repeat(CAPTION_MAX) }))).toEqual([]);
  });

  it('refuses one character more', () => {
    const over = draft('post', { media: [photo()], caption: 'x'.repeat(CAPTION_MAX + 1) });
    expect(problemFor(validatePost(over), 'caption')).toMatch(/stops at/);
  });

  /* Measured against the live API: 2200 emoji are accepted, 2201 refused. The
     ceiling is codepoints, and string length would refuse the legal one. */
  it('counts the ceiling in codepoints, not in string length', () => {
    const legal = draft('post', { media: [photo()], caption: '👋'.repeat(CAPTION_MAX) });
    expect(legal.caption.length).toBe(CAPTION_MAX * 2);
    expect(validatePost(legal)).toEqual([]);

    const over = draft('post', { media: [photo()], caption: '👋'.repeat(CAPTION_MAX + 1) });
    expect(problemFor(validatePost(over), 'caption')).toMatch(/stops at/);
  });

  it('refuses a caption on a story', () => {
    const story = draft('story', { media: [photo()], caption: 'Hello' });
    expect(problemFor(validatePost(story), 'caption')).toBe('A story cannot carry a caption.');
  });

  it('lets whitespace stand in for no caption on a story', () => {
    expect(validatePost(draft('story', { media: [photo()], caption: '   ' }))).toEqual([]);
  });
});

describe('reel extras', () => {
  const base = draft('reel', { media: [video()] });

  it('takes a full cover link', () => {
    expect(validatePost({ ...base, reel: { coverURL: 'https://example.com/cover.jpg' } })).toEqual([]);
  });

  it('refuses a cover that is not a link', () => {
    expect(problemFor(validatePost({ ...base, reel: { coverURL: 'cover.jpg' } }), 'cover')).toMatch(/http/);
  });

  it('refuses a local cover the platform could never fetch', () => {
    expect(problemFor(validatePost({ ...base, reel: { coverURL: 'blob:abc-123' } }), 'cover')).toMatch(/http/);
  });

  it('ignores an empty cover', () => {
    expect(validatePost({ ...base, reel: { coverURL: '' } })).toEqual([]);
  });

  it('refuses a negative cover frame', () => {
    expect(problemFor(validatePost({ ...base, reel: { thumbOffset: -1 } }), 'cover')).toMatch(/before the start/);
  });

  it('takes a cover frame of zero', () => {
    expect(validatePost({ ...base, reel: { thumbOffset: 0 } })).toEqual([]);
  });

  it('leaves cover rules alone on other kinds', () => {
    expect(validatePost(draft('post', { media: [photo()], reel: { coverURL: 'nonsense' } }))).toEqual([]);
  });
});

describe('time', () => {
  const at = '2026-09-01T09:00:00.000Z';
  const scheduled = draft('post', { media: [photo()], scheduledAt: at });

  it('takes a future time when the deployment can honour one', () => {
    expect(validatePost(scheduled, { canSchedule: true, now: Date.parse(at) - 1000 })).toEqual([]);
  });

  it('refuses a time already gone', () => {
    expect(problemFor(validatePost(scheduled, { canSchedule: true, now: Date.parse(at) + 1 }), 'schedule')).toBe(
      'That time has already passed.',
    );
  });

  it('refuses a time nothing would act on', () => {
    expect(fields(scheduled, { canSchedule: false })).toEqual(['schedule']);
  });

  it('refuses a time that is not one', () => {
    const broken = draft('post', { media: [photo()], scheduledAt: 'soon' });
    expect(problemFor(validatePost(broken, { canSchedule: true }), 'schedule')).toBe('Pick a date and a time.');
  });

  it('says nothing about time on a draft', () => {
    expect(validatePost(draft('post', { media: [photo()] }), { canSchedule: false, now: Date.now() })).toEqual([]);
  });
});

describe('problemFor', () => {
  it('answers null when the control is clean', () => {
    expect(problemFor(validatePost(draft('post', { media: [photo()] })), 'media')).toBeNull();
  });

  it('reports every wrong control at once', () => {
    const bad = draft('story', { caption: 'Hello', scheduledAt: 'nope' });
    expect(fields(bad).sort()).toEqual(['caption', 'media', 'schedule']);
  });
});
