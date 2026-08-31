import { describe, expect, it } from 'vitest';
import { publishInput, type PublishSource } from './publishInput';
import type { MediaItem } from '../types';

const photo = (n = 1): MediaItem => ({
  id: `m-${n}`,
  type: 'image',
  url: `https://example.com/${n}.jpg`,
  source: 'link',
  previewUrl: 'blob:only-in-this-tab',
});

const clip = (n = 1): MediaItem => ({
  id: `v-${n}`,
  type: 'video',
  url: `https://example.com/${n}.mp4`,
  source: 'upload',
  previewUrl: 'blob:only-in-this-tab',
});

const source = (over: Partial<PublishSource>): PublishSource => ({
  kind: 'post',
  caption: '',
  media: [],
  ...over,
});

describe('a feed photo', () => {
  it('sends the public URL and the caption', () => {
    expect(publishInput(source({ media: [photo()], caption: 'Bags landed' }))).toEqual({
      kind: 'post',
      input: { imageURL: 'https://example.com/1.jpg', caption: 'Bags landed' },
    });
  });

  it('never sends the local preview', () => {
    const plan = publishInput(source({ media: [photo()] }));
    expect(JSON.stringify(plan)).not.toContain('blob:');
  });

  it('sends no caption rather than an empty one', () => {
    expect(publishInput(source({ media: [photo()], caption: '   ' })).input).toMatchObject({ caption: null });
  });

  it('keeps the line breaks somebody wrote', () => {
    const plan = publishInput(source({ media: [photo()], caption: 'One\n\nTwo  ' }));
    expect(plan.input).toMatchObject({ caption: 'One\n\nTwo  ' });
  });
});

describe('a reel', () => {
  const base = source({ kind: 'reel', media: [clip()], caption: 'Thirty seconds' });

  it('sends the video and the caption', () => {
    expect(publishInput(base)).toEqual({
      kind: 'reel',
      input: { videoURL: 'https://example.com/1.mp4', caption: 'Thirty seconds' },
    });
  });

  it('leaves the settings out when nothing was chosen', () => {
    const { input } = publishInput(base);
    expect('coverURL' in input).toBe(false);
    expect('shareToFeed' in input).toBe(false);
    expect('thumbOffset' in input).toBe(false);
  });

  it('sends each setting that was', () => {
    const plan = publishInput({
      ...base,
      reel: { coverURL: ' https://example.com/cover.jpg ', shareToFeed: true, thumbOffset: 2500 },
    });
    expect(plan.input).toMatchObject({
      coverURL: 'https://example.com/cover.jpg',
      shareToFeed: true,
      thumbOffset: 2500,
    });
  });

  it('sends share-to-feed off, which is not the same as unsaid', () => {
    expect(publishInput({ ...base, reel: { shareToFeed: false } }).input).toMatchObject({ shareToFeed: false });
  });

  it('drops a cover that is only whitespace', () => {
    expect('coverURL' in publishInput({ ...base, reel: { coverURL: '  ' } }).input).toBe(false);
  });

  it('sends a whole number of milliseconds', () => {
    expect(publishInput({ ...base, reel: { thumbOffset: 1500.6 } }).input).toMatchObject({ thumbOffset: 1501 });
    expect(publishInput({ ...base, reel: { thumbOffset: -5 } }).input).toMatchObject({ thumbOffset: 0 });
  });
});

describe('a story', () => {
  it('names the media type and carries no caption field at all', () => {
    const plan = publishInput(source({ kind: 'story', media: [photo()], caption: 'ignored' }));
    expect(plan).toEqual({
      kind: 'story',
      input: { mediaURL: 'https://example.com/1.jpg', mediaType: 'Image' },
    });
    expect('caption' in plan.input).toBe(false);
  });

  it('says Video for a video story', () => {
    const plan = publishInput(source({ kind: 'story', media: [clip()] }));
    expect(plan.input).toMatchObject({ mediaType: 'Video' });
  });
});

describe('a carousel', () => {
  it('sends every item in order, each with its own type', () => {
    const plan = publishInput(source({ kind: 'carousel', media: [photo(1), clip(2), photo(3)], caption: 'Three' }));
    expect(plan).toEqual({
      kind: 'carousel',
      input: {
        caption: 'Three',
        items: [
          { mediaURL: 'https://example.com/1.jpg', mediaType: 'Image' },
          { mediaURL: 'https://example.com/2.mp4', mediaType: 'Video' },
          { mediaURL: 'https://example.com/3.jpg', mediaType: 'Image' },
        ],
      },
    });
  });

  it('leaves out an item that has no address yet', () => {
    const pending: MediaItem = { id: 'x', type: 'image', url: '  ', source: 'upload' };
    const plan = publishInput(source({ kind: 'carousel', media: [photo(1), pending] }));
    expect(plan.input).toMatchObject({ items: [{ mediaURL: 'https://example.com/1.jpg', mediaType: 'Image' }] });
  });
});

describe('nothing to publish', () => {
  it('refuses rather than sending an empty address', () => {
    for (const kind of ['post', 'reel', 'story', 'carousel'] as const) {
      expect(() => publishInput(source({ kind }))).toThrow();
    }
  });

  it('refuses an item whose upload has not resolved', () => {
    const pending: MediaItem = { id: 'x', type: 'image', url: '', source: 'upload' };
    expect(() => publishInput(source({ media: [pending] }))).toThrow();
  });
});
