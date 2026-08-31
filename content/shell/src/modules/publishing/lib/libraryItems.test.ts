import { describe, expect, it } from 'vitest';
import { FileStatus, FileType, type InstagramFileRefFragment } from '~api/generated/publishing/graphql';
import type { MediaNode } from '../types';
import {
  LIBRARY_KINDS,
  appendNodes,
  childCount,
  countByKind,
  filterByKind,
  kindOf,
  mergeLive,
  thumbnailOf,
  unlistedPublished,
  toTile,
  withLive,
} from './libraryItems';

const file = (over: Partial<InstagramFileRefFragment> = {}): InstagramFileRefFragment => ({
  __typename: 'File' as const,
  id: 'f1',
  url: 'https://example.com/a.jpg',
  type: FileType.Image,
  status: FileStatus.Downloaded,
  size: 1_000,
  ...over,
});

const image = (id: string, over: Record<string, unknown> = {}): MediaNode =>
  ({
    __typename: 'InstagramPost',
    id,
    isUnknown: false,
    caption: 'Bags landed.',
    ownerUsername: 'northwind.coffee',
    url: `https://www.instagram.com/p/${id}/`,
    file: file(),
    thumbnailPreview: file({ id: `${id}-thumb`, url: `https://example.com/${id}-thumb.jpg` }),
    childMedias: [],
    ...over,
  }) as MediaNode;

const reel = (id: string, over: Record<string, unknown> = {}): MediaNode =>
  ({
    __typename: 'InstagramReel',
    id,
    isUnknown: false,
    caption: null,
    ownerUsername: 'northwind.coffee',
    url: `https://www.instagram.com/reel/${id}/`,
    file: file({ id: `${id}-video`, url: `https://example.com/${id}.mp4`, type: FileType.Video }),
    thumbnailPreview: null,
    ...over,
  }) as MediaNode;

const story = (id: string): MediaNode =>
  ({
    __typename: 'InstagramStory',
    id,
    isUnknown: false,
    caption: null,
    ownerUsername: 'northwind.coffee',
    url: `https://www.instagram.com/stories/${id}/`,
    file: file(),
    thumbnailPreview: null,
  }) as MediaNode;

const ad = (id: string, over: Record<string, unknown> = {}): MediaNode =>
  ({
    __typename: 'InstagramAd',
    id,
    isUnknown: false,
    caption: null,
    ownerUsername: 'northwind.coffee',
    url: '',
    file: null,
    thumbnailPreview: null,
    ...over,
  }) as MediaNode;

const carousel = (id: string): MediaNode =>
  image(id, {
    childMedias: [
      { __typename: 'InstagramPost', id: `${id}-1`, url: '', file: null },
      { __typename: 'InstagramPost', id: `${id}-2`, url: '', file: null },
    ],
  });

describe('kindOf', () => {
  it('reads the three kinds that have a type of their own', () => {
    expect(kindOf(reel('r1'))).toBe('reel');
    expect(kindOf(story('s1'))).toBe('story');
    expect(kindOf(ad('a1'))).toBe('ad');
  });

  it('tells a carousel from a plain post by its children, not by a type', () => {
    // There is no carousel type on this API — an album is an InstagramPost
    // whose childMedias is not empty, and that is the whole distinction.
    expect(kindOf(image('p1'))).toBe('post');
    expect(kindOf(carousel('c1'))).toBe('carousel');
  });

  it('classifies media the platform could not resolve by its type all the same', () => {
    expect(kindOf(ad('a2', { isUnknown: true }))).toBe('ad');
  });

  it('has a name for everything the connection can return', () => {
    for (const node of [image('p1'), carousel('c1'), reel('r1'), story('s1'), ad('a1')]) {
      expect(LIBRARY_KINDS).toContain(kindOf(node));
    }
  });
});

describe('filterByKind', () => {
  const nodes = [image('p1'), carousel('c1'), reel('r1'), story('s1'), ad('a1')];

  it('shows everything when no kind is chosen', () => {
    expect(filterByKind(nodes, null)).toHaveLength(5);
  });

  it('keeps a carousel out of the plain posts', () => {
    expect(filterByKind(nodes, 'post').map((node) => node.id)).toEqual(['p1']);
    expect(filterByKind(nodes, 'carousel').map((node) => node.id)).toEqual(['c1']);
  });

  it('can isolate the ads, which nothing here publishes', () => {
    expect(filterByKind(nodes, 'ad').map((node) => node.id)).toEqual(['a1']);
  });

  it('never hands back the array it was given', () => {
    expect(filterByKind(nodes, null)).not.toBe(nodes);
  });

  it('counts every kind, including the ones with nothing in them', () => {
    expect(countByKind([image('p1'), image('p2'), reel('r1')])).toEqual({
      post: 2,
      carousel: 0,
      reel: 1,
      story: 0,
      ad: 0,
    });
  });
});

describe('thumbnailOf', () => {
  it('prefers the preview the platform generated', () => {
    expect(thumbnailOf(image('p1'))).toBe('https://example.com/p1-thumb.jpg');
  });

  it('refuses a video file — no img element draws an .mp4', () => {
    expect(thumbnailOf(reel('r1'))).toBeNull();
  });

  it('falls back to the file itself when it really is a picture', () => {
    expect(thumbnailOf(image('p1', { thumbnailPreview: null }))).toBe('https://example.com/a.jpg');
  });

  it('refuses a file whose bytes have been collected', () => {
    // `status: Expired` means the url resolves to nothing.
    const expired = image('p1', {
      thumbnailPreview: file({ status: FileStatus.Expired }),
      file: file({ status: FileStatus.Expired }),
    });
    expect(thumbnailOf(expired)).toBeNull();
  });

  it('has nothing to draw for media that carries no file at all', () => {
    expect(thumbnailOf(ad('a1'))).toBeNull();
  });
});

describe('toTile', () => {
  it('badges everything except a plain photo, which is the default', () => {
    expect(toTile(image('p1')).badge).toBeUndefined();
    expect(toTile(reel('r1')).badge).toBe('Reel');
    expect(toTile(story('s1')).badge).toBe('Story');
    expect(toTile(ad('a1')).badge).toBe('Ad');
  });

  it('puts the slide count on a carousel, where it is the useful part', () => {
    expect(toTile(carousel('c1')).badge).toBe('Carousel 2');
    expect(childCount(carousel('c1'))).toBe(2);
    expect(childCount(reel('r1'))).toBe(0);
  });

  it('passes isUnknown through — the grid draws those as an unclickable placeholder', () => {
    expect(toTile(ad('a1', { isUnknown: true })).unknown).toBe(true);
    expect(toTile(image('p1')).unknown).toBe(false);
  });

  it('flattens the caption into the alternative text', () => {
    expect(toTile(image('p1', { caption: 'Bags\n\n landed.' })).alt).toBe('Bags landed.');
    expect(toTile(story('s1')).alt).toBe('');
  });

  it('carries the link, empty though it may be', () => {
    expect(toTile(image('p1')).url).toBe('https://www.instagram.com/p/p1/');
    expect(toTile(ad('a1')).url).toBe('');
  });
});

describe('paging and the live feed', () => {
  it('drops a node that arrived on an earlier page', () => {
    // The cursor walks forward over a list that grows at the head, so the same
    // node genuinely arrives twice.
    const merged = appendNodes([image('p1'), image('p2')], [image('p2'), image('p3')]);
    expect(merged.map((node) => node.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('keeps the copy already on screen rather than swapping it out mid-scroll', () => {
    const first = image('p1');
    expect(appendNodes([first], [image('p1')])[0]).toBe(first);
  });

  it('puts a live arrival at the head, once', () => {
    const live = withLive(withLive([], image('p1')), image('p2'));
    expect(live.map((node) => node.id)).toEqual(['p2', 'p1']);
    expect(withLive(live, image('p1')).map((node) => node.id)).toEqual(['p1', 'p2']);
  });

  it('shows a just-published post above a page that does not contain it yet', () => {
    // The connection does not hold new media until a refetch has pulled it
    // down, so the two lists cannot simply be concatenated.
    const merged = mergeLive([image('new')], [image('p1'), image('p2')]);
    expect(merged.map((node) => node.id)).toEqual(['new', 'p1', 'p2']);
  });

  it('does not draw a post twice once the pages catch up with it', () => {
    const merged = mergeLive([image('new')], [image('new'), image('p1')]);
    expect(merged.map((node) => node.id)).toEqual(['new', 'p1']);
  });
});

describe('unlistedPublished', () => {
  const listed = [image('p1'), image('p2')];

  it('finds a post this app published that the account list has not caught up with', () => {
    // Publishing adds nothing to the connection; a pull from Instagram is what
    // does, so this is the signal that one is needed.
    expect(unlistedPublished(['p1', 'brand-new'], listed)).toEqual(['brand-new']);
  });

  it('asks for nothing once everything published is in the list', () => {
    expect(unlistedPublished(['p1', 'p2'], listed)).toEqual([]);
    expect(unlistedPublished([], listed)).toEqual([]);
  });

  it('ignores a post that has no media id yet', () => {
    expect(unlistedPublished([''], listed)).toEqual([]);
  });
});
