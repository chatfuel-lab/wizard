/**
 * Instagram media, the pure half of the pickers and of `useMediaLookup`.
 *
 * A ListOfPosts / ListOfStories entry carries only an id. To show a thumbnail
 * and a caption the module resolves each id through `instagramAccount.media(id)`
 * (one query per id — the API has no batch form; unknown id → null). Resolved
 * answers are cached per bot for the session in a small LRU map, so a rule
 * with the same two posts on the Channels page, the Rules panel and the picker
 * asks once. Everything the hook has to DECIDE — which ids still need asking,
 * how many to ask at once, what an answer becomes — is here, node-only testable.
 */
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { MediaKind } from '../components/pickers/types';

/** The shape both the picker connection and `media(id)` answer with. */
export interface MediaNodeLike {
  __typename: string;
  id: string;
  isUnknown: boolean;
  caption?: string | null;
  url?: string | null;
  thumbnailPreview?: { url: string } | null;
}

export type MediaKindLabel = 'post' | 'reel' | 'ad' | 'story' | 'unknown';

export interface ResolvedMedia {
  id: string;
  kind: MediaKindLabel;
  caption: string | null;
  thumbnailUrl: string | null;
  url: string | null;
  /** The account no longer has this media (deleted, or never its own) — not selectable, still listed. */
  isUnknown: boolean;
}

export const MEDIA_KIND_LABELS: Record<MediaKindLabel, string> = {
  post: 'Post',
  reel: 'Reel',
  ad: 'Ad',
  story: 'Story',
  unknown: 'Unavailable',
};

export function mediaKindLabelOf(typename: string): MediaKindLabel {
  switch (typename) {
    case 'InstagramPost':
      return 'post';
    case 'InstagramReel':
      return 'reel';
    case 'InstagramAd':
      return 'ad';
    case 'InstagramStory':
      return 'story';
    default:
      return 'unknown';
  }
}

/** What an answer becomes. `null` (unknown id) is a real answer: "Unavailable". */
export function resolveMedia(id: string, node: MediaNodeLike | null | undefined): ResolvedMedia {
  if (!node) return { id, kind: 'unknown', caption: null, thumbnailUrl: null, url: null, isUnknown: true };
  return {
    id: node.id || id,
    kind: node.isUnknown ? 'unknown' : mediaKindLabelOf(node.__typename),
    caption: node.caption?.trim() ? node.caption.trim() : null,
    thumbnailUrl: node.thumbnailPreview?.url ?? null,
    url: node.url ?? null,
    isUnknown: node.isUnknown,
  };
}

/** The scope decides which ListOf* setting the picker fills: stories for story replies, posts elsewhere. */
export const mediaKindOf = (scope: FuelyAutomationScope): MediaKind =>
  scope === FuelyAutomationScope.InstagramStoryReplies ? 'stories' : 'posts';

/** Posts, reels AND ads count as "posts" for the setter; stories are their own kind. */
export const matchesKind = (node: Pick<MediaNodeLike, '__typename'>, kind: MediaKind): boolean =>
  kind === 'stories' ? node.__typename === 'InstagramStory' : node.__typename !== 'InstagramStory';

/** Client-side caption search over the loaded pages; an empty query keeps everything. */
export function filterMedia<T extends Pick<MediaNodeLike, 'caption' | 'id'>>(nodes: readonly T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') return [...nodes];
  return nodes.filter((node) => (node.caption ?? '').toLocaleLowerCase().includes(needle) || node.id.includes(needle));
}

// ---------------------------------------------------------------------------
// The cache
// ---------------------------------------------------------------------------

export interface MediaCache {
  get: (id: string) => ResolvedMedia | undefined;
  set: (id: string, media: ResolvedMedia) => void;
  has: (id: string) => boolean;
  /** Most-recently-used last. */
  keys: () => string[];
  readonly size: number;
  readonly capacity: number;
}

/**
 * LRU-ish: a `get` refreshes recency, a `set` past capacity evicts the least
 * recently used entry. A `Map` keeps insertion order, so re-inserting is the
 * whole trick.
 */
export function createMediaCache(capacity = 200): MediaCache {
  const map = new Map<string, ResolvedMedia>();
  return {
    get(id) {
      const hit = map.get(id);
      if (hit === undefined) return undefined;
      map.delete(id);
      map.set(id, hit);
      return hit;
    },
    set(id, media) {
      map.delete(id);
      map.set(id, media);
      while (map.size > capacity) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        map.delete(oldest);
      }
    },
    has: (id) => map.has(id),
    keys: () => [...map.keys()],
    get size() {
      return map.size;
    },
    capacity,
  };
}

/** The ids still worth asking for: not cached, not in flight, each once, order kept, blanks dropped. */
export function unresolvedIds(
  ids: readonly string[],
  cache: Pick<MediaCache, 'has'>,
  inFlight: ReadonlySet<string> = new Set(),
): string[] {
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || cache.has(id) || inFlight.has(id) || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

/** How many of the queue to start now — the small queue: `concurrency` minus what is already flying. */
export function takeBatch(queue: readonly string[], inFlightCount: number, concurrency = 3): string[] {
  const room = Math.max(0, concurrency - inFlightCount);
  return queue.slice(0, room);
}

/** Cached answers for `ids`, in the ids' order; missing ones are undefined. */
export function lookupAll(
  ids: readonly string[],
  cache: Pick<MediaCache, 'get'>,
): Record<string, ResolvedMedia | undefined> {
  const out: Record<string, ResolvedMedia | undefined> = {};
  for (const id of ids) out[id] = cache.get(id);
  return out;
}
