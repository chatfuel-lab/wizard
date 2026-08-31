import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { MEDIA } from './samples';
import {
  createMediaCache,
  filterMedia,
  lookupAll,
  matchesKind,
  mediaKindLabelOf,
  mediaKindOf,
  resolveMedia,
  takeBatch,
  unresolvedIds,
} from './mediaLookup';

const media = (id: string, kind: MediaKindOf = 'InstagramPost') =>
  resolveMedia(id, { __typename: kind, id, isUnknown: false, caption: id, url: 'u', thumbnailPreview: null });
type MediaKindOf = 'InstagramPost' | 'InstagramReel' | 'InstagramAd' | 'InstagramStory';

describe('resolveMedia', () => {
  it('maps every media typename to a kind and trims the caption', () => {
    expect(mediaKindLabelOf('InstagramPost')).toBe('post');
    expect(mediaKindLabelOf('InstagramReel')).toBe('reel');
    expect(mediaKindLabelOf('InstagramAd')).toBe('ad');
    expect(mediaKindLabelOf('InstagramStory')).toBe('story');
    expect(mediaKindLabelOf('Whatever')).toBe('unknown');
    const resolved = resolveMedia('m1', {
      __typename: 'InstagramReel',
      id: 'm1',
      isUnknown: false,
      caption: '  hello  ',
      url: 'https://x',
      thumbnailPreview: { url: 't' },
    });
    expect(resolved).toEqual({
      id: 'm1',
      kind: 'reel',
      caption: 'hello',
      thumbnailUrl: 't',
      url: 'https://x',
      isUnknown: false,
    });
  });

  it('a null answer (unknown id) and an isUnknown node both read as Unavailable', () => {
    expect(resolveMedia('gone', null)).toMatchObject({
      id: 'gone',
      kind: 'unknown',
      isUnknown: true,
      thumbnailUrl: null,
      caption: null,
    });
    expect(
      resolveMedia('m', { __typename: 'InstagramPost', id: 'm', isUnknown: true, caption: null, url: 'u' }),
    ).toMatchObject({ kind: 'unknown', isUnknown: true });
  });

  it('resolves every stand media, including the one flagged unknown', () => {
    for (const node of MEDIA) {
      const resolved = resolveMedia(node.id, node);
      expect(resolved.id).toBe(node.id);
      expect(resolved.isUnknown).toBe(node.isUnknown);
      if (!node.isUnknown) expect(resolved.kind).not.toBe('unknown');
    }
  });
});

describe('scope → kind', () => {
  it('story replies pick stories; every other scope picks posts (posts, reels and ads)', () => {
    expect(mediaKindOf(FuelyAutomationScope.InstagramStoryReplies)).toBe('stories');
    expect(mediaKindOf(FuelyAutomationScope.InstagramPostComments)).toBe('posts');
    expect(mediaKindOf(FuelyAutomationScope.FacebookPostComments)).toBe('posts');
    expect(matchesKind({ __typename: 'InstagramStory' }, 'stories')).toBe(true);
    expect(matchesKind({ __typename: 'InstagramStory' }, 'posts')).toBe(false);
    expect(matchesKind({ __typename: 'InstagramAd' }, 'posts')).toBe(true);
    expect(matchesKind({ __typename: 'InstagramReel' }, 'posts')).toBe(true);
  });
});

describe('filterMedia', () => {
  it('searches captions case-insensitively, falls back to the id, and keeps everything on an empty query', () => {
    expect(filterMedia(MEDIA, '')).toHaveLength(MEDIA.length);
    expect(filterMedia(MEDIA, '   ')).toHaveLength(MEDIA.length);
    const hits = filterMedia(MEDIA, 'HYDRAFACIAL');
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) expect(hit.caption?.toLowerCase()).toContain('hydrafacial');
    expect(filterMedia(MEDIA, 'ig-media-15').map((m) => m.id)).toEqual(['ig-media-15']);
    expect(filterMedia(MEDIA, 'no such caption anywhere')).toEqual([]);
  });
});

describe('the cache', () => {
  it('evicts the least recently used entry past capacity, and a get refreshes recency', () => {
    const cache = createMediaCache(3);
    cache.set('a', media('a'));
    cache.set('b', media('b'));
    cache.set('c', media('c'));
    expect(cache.size).toBe(3);
    cache.get('a'); // a is now the freshest
    cache.set('d', media('d')); // evicts b
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.keys()).toEqual(['c', 'a', 'd']);
    expect(cache.get('zzz')).toBeUndefined();
  });

  it('a set on an existing id replaces and refreshes', () => {
    const cache = createMediaCache(2);
    cache.set('a', media('a'));
    cache.set('b', media('b'));
    cache.set('a', media('a', 'InstagramReel'));
    cache.set('c', media('c')); // evicts b, not a
    expect(cache.keys()).toEqual(['a', 'c']);
    expect(cache.get('a')?.kind).toBe('reel');
  });

  it('unresolvedIds skips cached, in-flight, blank and duplicate ids and keeps order', () => {
    const cache = createMediaCache();
    cache.set('x', media('x'));
    expect(unresolvedIds(['x', ' y ', 'z', 'y', '', 'w'], cache, new Set(['z']))).toEqual(['y', 'w']);
  });

  it('takeBatch fills the free slots only', () => {
    expect(takeBatch(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['a', 'b', 'c']);
    expect(takeBatch(['a', 'b', 'c', 'd'], 2, 3)).toEqual(['a']);
    expect(takeBatch(['a'], 3, 3)).toEqual([]);
    expect(takeBatch([], 0)).toEqual([]);
  });

  it('lookupAll answers per id, undefined for the unresolved', () => {
    const cache = createMediaCache();
    cache.set('a', media('a'));
    expect(lookupAll(['a', 'b'], cache)).toEqual({ a: media('a'), b: undefined });
  });
});
