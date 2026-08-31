import { describe, expect, it } from 'vitest';
import { FileStatus, FileType, type InstagramFileRefFragment } from '~api/generated/publishing/graphql';
import {
  acceptAttribute,
  acceptsOf,
  applyKind,
  canAddMore,
  capacityOf,
  draftFromNode,
  emptyDraft,
  expiringMedia,
  fromLibraryNode,
  guessMediaType,
  hasCaption,
  mediaLabel,
  needsDurableStorage,
  parseMediaLink,
  reorderMedia,
  roomFor,
  toDraft,
  withMedia,
  withoutMedia,
} from './composerDraft';
import type { MediaItem, MediaNode, NewPost, QueuedPost } from '../types';

const photo = (n: number): MediaItem => ({
  id: `m-${n}`,
  type: 'image',
  url: `https://example.com/${n}.jpg`,
  source: 'link',
});

const video = (n: number): MediaItem => ({
  id: `v-${n}`,
  type: 'video',
  url: `https://example.com/${n}.mp4`,
  source: 'link',
});

const draft = (over: Partial<NewPost> = {}): NewPost => ({
  kind: 'post',
  caption: '',
  media: [],
  scheduledAt: null,
  ...over,
});

describe('what a kind is', () => {
  it('takes one item everywhere but a carousel', () => {
    expect(capacityOf('post')).toBe(1);
    expect(capacityOf('reel')).toBe(1);
    expect(capacityOf('story')).toBe(1);
    expect(capacityOf('carousel')).toBe(10);
  });

  it('takes only what it can publish', () => {
    expect(acceptsOf('post')).toEqual(['image']);
    expect(acceptsOf('reel')).toEqual(['video']);
    expect(acceptsOf('story')).toEqual(['image', 'video']);
    expect(acceptsOf('carousel')).toEqual(['image', 'video']);
  });

  it('offers the file picker only what the kind can take', () => {
    /* Every picture format, not one: `accept` filters a file dialog, and
       narrowing it to a single format hides files somebody has and can post. */
    expect(acceptAttribute('post')).toBe('image/*');
    expect(acceptAttribute('reel')).toBe('video/mp4,video/quicktime');
    expect(acceptAttribute('story')).toContain('image/*');
    expect(acceptAttribute('story')).toContain('video/mp4');
  });

  it('gives a story no caption at all', () => {
    expect(hasCaption('story')).toBe(false);
    expect(hasCaption('post')).toBe(true);
    expect(hasCaption('reel')).toBe(true);
    expect(hasCaption('carousel')).toBe(true);
  });

  it('names an item by what it is and where it sits', () => {
    expect(mediaLabel(photo(1), 0)).toBe('Photo 1');
    expect(mediaLabel(video(1), 2)).toBe('Video 3');
  });
});

describe('opening a draft', () => {
  it('starts empty, on a feed post', () => {
    expect(emptyDraft()).toEqual({ kind: 'post', caption: '', media: [], scheduledAt: null });
  });

  it('takes the time a calendar slot handed over', () => {
    expect(emptyDraft('2026-09-01T09:00:00.000Z').scheduledAt).toBe('2026-09-01T09:00:00.000Z');
  });

  it('copies an existing post rather than aliasing it', () => {
    const post: QueuedPost = {
      id: 'p-1',
      kind: 'reel',
      caption: 'Hello',
      media: [video(1)],
      reel: { shareToFeed: true },
      scheduledAt: null,
      status: 'failed',
      attempts: 2,
      mediaId: null,
      permalink: null,
      error: 'nope',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    };
    const copy = toDraft(post);
    expect(copy).toEqual({
      kind: 'reel',
      caption: 'Hello',
      media: [video(1)],
      reel: { shareToFeed: true },
      scheduledAt: null,
    });
    copy.media[0]!.url = 'changed';
    expect(post.media[0]!.url).toBe('https://example.com/1.mp4');
  });
});

describe('changing the kind', () => {
  it('is a no-op for the kind it already is', () => {
    const current = draft({ media: [photo(1)] });
    expect(applyKind(current, 'post')).toBe(current);
  });

  it('keeps a photo going from a post to a carousel', () => {
    const next = applyKind(draft({ media: [photo(1)], caption: 'Hi' }), 'carousel');
    expect(next.media).toEqual([photo(1)]);
    expect(next.caption).toBe('Hi');
  });

  it('drops the photos a reel cannot take', () => {
    const next = applyKind(draft({ kind: 'carousel', media: [photo(1), video(2), photo(3)] }), 'reel');
    expect(next.media).toEqual([video(2)]);
  });

  it('keeps only the first item going down to a single-item kind', () => {
    const next = applyKind(draft({ kind: 'carousel', media: [photo(1), photo(2), photo(3)] }), 'post');
    expect(next.media).toEqual([photo(1)]);
  });

  it('empties the caption on the way to a story, and leaves it empty coming back', () => {
    const story = applyKind(draft({ media: [photo(1)], caption: 'Bags landed' }), 'story');
    expect(story.caption).toBe('');
    expect(applyKind(story, 'post').caption).toBe('');
  });

  it('keeps a story photo when it becomes a feed post', () => {
    const next = applyKind(draft({ kind: 'story', media: [photo(1)] }), 'post');
    expect(next.media).toEqual([photo(1)]);
  });

  it('drops a story video when it becomes a feed post', () => {
    const next = applyKind(draft({ kind: 'story', media: [video(1)] }), 'post');
    expect(next.media).toEqual([]);
  });

  it('gives a reel its own settings and takes them away again', () => {
    const reel = applyKind(draft({ media: [] }), 'reel');
    expect(reel.reel).toEqual({});
    const kept = applyKind({ ...reel, reel: { shareToFeed: true } }, 'story');
    expect(kept.reel).toBeUndefined();
  });

  it('keeps the time whatever the kind becomes', () => {
    const at = '2026-09-01T09:00:00.000Z';
    expect(applyKind(draft({ scheduledAt: at }), 'story').scheduledAt).toBe(at);
  });
});

describe('adding and removing media', () => {
  it('reports the room left', () => {
    expect(roomFor(draft())).toBe(1);
    expect(roomFor(draft({ media: [photo(1)] }))).toBe(0);
    expect(roomFor(draft({ kind: 'carousel', media: [photo(1), photo(2)] }))).toBe(8);
  });

  it('keeps a way in on a kind that takes one, and closes it on a full carousel', () => {
    /* A photo post with a photo in it can still be dropped on: the drop
       replaces. Only a carousel actually fills up. */
    expect(canAddMore(draft())).toBe(true);
    expect(canAddMore(draft({ media: [photo(1)] }))).toBe(true);
    expect(canAddMore(draft({ kind: 'carousel', media: [photo(1)] }))).toBe(true);
    const ten = Array.from({ length: 10 }, (_, i) => photo(i));
    expect(canAddMore(draft({ kind: 'carousel', media: ten }))).toBe(false);
  });

  it('replaces on a kind that takes one', () => {
    const next = withMedia(draft({ media: [photo(1)] }), [photo(2)]);
    expect(next.media).toEqual([photo(2)]);
  });

  it('appends on a carousel and stops at ten', () => {
    const many = Array.from({ length: 12 }, (_, i) => photo(i));
    const next = withMedia(draft({ kind: 'carousel' }), many);
    expect(next.media).toHaveLength(10);
    expect(next.media[0]).toEqual(photo(0));
  });

  it('drops what the kind cannot take', () => {
    expect(withMedia(draft(), [video(1)])).toEqual(draft());
    expect(withMedia(draft({ kind: 'carousel' }), [video(1), photo(2)]).media).toEqual([video(1), photo(2)]);
  });

  it('removes by id and leaves the draft alone when there is nothing to remove', () => {
    const current = draft({ kind: 'carousel', media: [photo(1), photo(2)] });
    expect(withoutMedia(current, 'm-1').media).toEqual([photo(2)]);
    expect(withoutMedia(current, 'nope')).toBe(current);
  });
});

describe('reordering', () => {
  const current = draft({ kind: 'carousel', media: [photo(1), photo(2), photo(3)] });

  it('moves an item forward', () => {
    expect(reorderMedia(current, 0, 2).media.map((item) => item.id)).toEqual(['m-2', 'm-3', 'm-1']);
  });

  it('moves an item back', () => {
    expect(reorderMedia(current, 2, 0).media.map((item) => item.id)).toEqual(['m-3', 'm-1', 'm-2']);
  });

  it('leaves the draft alone for a move that is not one', () => {
    expect(reorderMedia(current, 1, 1)).toBe(current);
    expect(reorderMedia(current, -1, 0)).toBe(current);
    expect(reorderMedia(current, 0, 9)).toBe(current);
  });
});

describe('links', () => {
  it('takes an http and an https link', () => {
    expect(parseMediaLink('https://example.com/a.jpg', 'post', () => 'x')).toEqual({
      id: 'x',
      type: 'image',
      url: 'https://example.com/a.jpg',
      source: 'link',
      previewUrl: 'https://example.com/a.jpg',
    });
    expect(parseMediaLink('http://example.com/a.jpg', 'post', () => 'x')?.url).toBe('http://example.com/a.jpg');
  });

  it('refuses anything the platform could not fetch', () => {
    for (const value of ['', '   ', 'example.com/a.jpg', 'blob:abc', 'data:image/png;base64,AAA', 'file:///a.jpg']) {
      expect(parseMediaLink(value, 'post')).toBeNull();
    }
  });

  it('lets the kind decide the type when only one is possible', () => {
    expect(parseMediaLink('https://example.com/clip', 'reel', () => 'x')?.type).toBe('video');
    expect(parseMediaLink('https://example.com/clip.mp4', 'post', () => 'x')?.type).toBe('image');
  });

  it('guesses from the name when the kind takes either', () => {
    expect(parseMediaLink('https://example.com/a.mp4', 'story', () => 'x')?.type).toBe('video');
    expect(parseMediaLink('https://example.com/a.jpg', 'story', () => 'x')?.type).toBe('image');
  });

  it('guesses past a query string', () => {
    expect(guessMediaType('https://example.com/a.MOV?token=1')).toBe('video');
    expect(guessMediaType('https://example.com/a')).toBe('image');
  });

  it('trims what was pasted', () => {
    expect(parseMediaLink('  https://example.com/a.jpg  ', 'post', () => 'x')?.url).toBe('https://example.com/a.jpg');
  });
});

describe('starting from media already on the account', () => {
  const file = (over: Partial<InstagramFileRefFragment> = {}): InstagramFileRefFragment => ({
    __typename: 'File',
    id: 'f1',
    url: 'https://storage.example.com/media/a.jpg',
    type: FileType.Image,
    status: FileStatus.Downloaded,
    size: 1_000,
    ...over,
  });

  const node = (over: Record<string, unknown> = {}): MediaNode =>
    ({
      __typename: 'InstagramPost',
      id: 'ig-1',
      isUnknown: false,
      caption: 'Bags landed',
      ownerUsername: 'northwind.coffee',
      url: 'https://www.instagram.com/p/ig-1/',
      file: file(),
      thumbnailPreview: file({ id: 'thumb', url: 'https://storage.example.com/media/a-thumb.jpg' }),
      childMedias: [],
      ...over,
    }) as MediaNode;

  const id = () => 'x';

  it('turns a photo on the account into a durable item', () => {
    expect(fromLibraryNode(node(), id)).toEqual({
      id: 'x',
      type: 'image',
      url: 'https://storage.example.com/media/a.jpg',
      source: 'library',
      previewUrl: 'https://storage.example.com/media/a-thumb.jpg',
    });
  });

  it('refuses media the platform could not resolve', () => {
    expect(fromLibraryNode(node({ isUnknown: true }), id)).toBeNull();
  });

  it('refuses a file whose bytes have been collected', () => {
    expect(fromLibraryNode(node({ file: file({ status: FileStatus.Expired }) }), id)).toBeNull();
    expect(fromLibraryNode(node({ file: null }), id)).toBeNull();
  });

  it('opens a photo as a feed post, with its caption', () => {
    expect(draftFromNode(node(), null, id)).toEqual({
      kind: 'post',
      caption: 'Bags landed',
      media: [fromLibraryNode(node(), id)],
      reel: undefined,
      scheduledAt: null,
    });
  });

  it('opens a video as a reel, whatever it was published as', () => {
    const video = node({ file: file({ url: 'https://storage.example.com/media/a.mp4', type: FileType.Video }) });
    const draft = draftFromNode(video, null, id);
    expect(draft?.kind).toBe('reel');
    expect(draft?.reel).toEqual({});
  });

  it('opens a story as a story, and drops the caption it cannot carry', () => {
    const story = node({ __typename: 'InstagramStory', caption: 'ignored', childMedias: undefined });
    const draft = draftFromNode(story, null, id);
    expect(draft?.kind).toBe('story');
    expect(draft?.caption).toBe('');
  });

  it('opens a carousel with every slide it can read, in order', () => {
    const album = node({
      childMedias: [
        { __typename: 'InstagramPost', id: 'c-1', url: '', file: file({ url: 'https://example.com/1.jpg' }) },
        {
          __typename: 'InstagramReel',
          id: 'c-2',
          url: '',
          file: file({ url: 'https://example.com/2.mp4', type: FileType.Video }),
        },
      ],
    });
    const draft = draftFromNode(album, null, id);
    expect(draft?.kind).toBe('carousel');
    expect(draft?.media.map((item) => item.url)).toEqual(['https://example.com/1.jpg', 'https://example.com/2.mp4']);
    expect(draft?.media.map((item) => item.type)).toEqual(['image', 'video']);
  });

  it('leaves out a slide with nothing behind it', () => {
    const album = node({
      childMedias: [
        { __typename: 'InstagramPost', id: 'c-1', url: '', file: file() },
        { __typename: 'InstagramStory' },
        { __typename: 'InstagramPost', id: 'c-3', url: '', file: null },
      ],
    });
    expect(draftFromNode(album, null, id)?.media).toHaveLength(1);
  });

  it('falls back to the whole post when no slide can be read', () => {
    const album = node({
      childMedias: [{ __typename: 'InstagramPost', id: 'c-1', url: '', file: null }],
    });
    const draft = draftFromNode(album, null, id);
    expect(draft?.kind).toBe('post');
    expect(draft?.media).toHaveLength(1);
  });

  it('takes the time it was opened with', () => {
    expect(draftFromNode(node(), '2026-09-01T09:00:00.000Z', id)?.scheduledAt).toBe('2026-09-01T09:00:00.000Z');
  });

  it('refuses a node with nothing publishable at all', () => {
    expect(draftFromNode(node({ isUnknown: true }), null, id)).toBeNull();
    expect(draftFromNode(node({ file: null }), null, id)).toBeNull();
  });

  it('marks what it produces as durable, so a scheduled post may use it', () => {
    const draft = draftFromNode(node(), null, id)!;
    expect(expiringMedia(draft)).toEqual([]);
  });
});

describe('how long a source lasts', () => {
  it('marks an upload as the one that will not', () => {
    expect(needsDurableStorage({ ...photo(1), source: 'upload' })).toBe(true);
    expect(needsDurableStorage({ ...photo(1), source: 'link' })).toBe(false);
    expect(needsDurableStorage({ ...photo(1), source: 'library' })).toBe(false);
  });

  it('finds the ones a scheduled post could not rely on', () => {
    const current = draft({ kind: 'carousel', media: [photo(1), { ...photo(2), source: 'upload' }] });
    expect(expiringMedia(current).map((item) => item.id)).toEqual(['m-2']);
  });
});
