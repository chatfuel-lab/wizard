/**
 * Telling the account's media apart, and turning it into tiles.
 *
 * `InstagramMedia` is a union of four types and the app cares about five kinds,
 * because a carousel has no type of its own: it is an `InstagramPost` whose
 * `childMedias` is not empty. That is the one rule in this file worth reading
 * twice — every other classification is `__typename` and nothing else.
 *
 * Ads are in the vocabulary even though nothing here can publish one. They are
 * on the account, the connection returns them, and a filter that cannot name
 * one category of what it is filtering leaves a pile of tiles that only appear
 * under "All" and belong to nothing.
 */
import { FileStatus, FileType } from '~api/generated/publishing/graphql';
import type { MediaGridItem } from '~ui';
import type { MediaNode } from '../types';

export type LibraryKind = 'post' | 'carousel' | 'reel' | 'story' | 'ad';

/** Filter order, and the order the chips are drawn in. */
export const LIBRARY_KINDS: readonly LibraryKind[] = ['post', 'carousel', 'reel', 'story', 'ad'];

export const LIBRARY_KIND_LABEL: Record<LibraryKind, string> = {
  post: 'Posts',
  carousel: 'Carousels',
  reel: 'Reels',
  story: 'Stories',
  ad: 'Ads',
};

/** Singular, for the badge in a tile's corner. */
const BADGE_LABEL: Record<LibraryKind, string | null> = {
  /* A plain photo is the default and needs no badge; everything else does. */
  post: null,
  carousel: 'Carousel',
  reel: 'Reel',
  story: 'Story',
  ad: 'Ad',
};

export function kindOf(node: MediaNode): LibraryKind {
  switch (node.__typename) {
    case 'InstagramReel':
      return 'reel';
    case 'InstagramStory':
      return 'story';
    case 'InstagramAd':
      return 'ad';
    default:
      return node.childMedias.length > 0 ? 'carousel' : 'post';
  }
}

export function filterByKind(nodes: readonly MediaNode[], kind: LibraryKind | null): MediaNode[] {
  return kind === null ? [...nodes] : nodes.filter((node) => kindOf(node) === kind);
}

export function countByKind(nodes: readonly MediaNode[]): Record<LibraryKind, number> {
  const counts: Record<LibraryKind, number> = { post: 0, carousel: 0, reel: 0, story: 0, ad: 0 };
  for (const node of nodes) counts[kindOf(node)] += 1;
  return counts;
}

/**
 * A picture this tile can actually draw.
 *
 * Two refusals, both from the API's own documentation. A file whose `status` is
 * `Expired` has had its bytes collected and its `url` resolves to nothing, so it
 * is not a thumbnail; and a Reel's `file` is the video itself, which no `img`
 * renders — only `thumbnailPreview` is a picture for those. Returning null here
 * is what makes the grid draw its placeholder rather than a broken glyph.
 */
export function thumbnailOf(node: MediaNode): string | null {
  const preview = node.thumbnailPreview;
  if (preview && preview.status !== FileStatus.Expired) return preview.url;
  const file = node.file;
  if (file && file.status !== FileStatus.Expired && file.type === FileType.Image) return file.url;
  return null;
}

/** How many slides a carousel holds; zero for everything else. */
export const childCount = (node: MediaNode): number =>
  node.__typename === 'InstagramPost' ? node.childMedias.length : 0;

export interface LibraryTile extends MediaGridItem {
  kind: LibraryKind;
  /** The post on Instagram. Empty on media the platform could not resolve. */
  url: string;
}

/**
 * One tile.
 *
 * `unknown` is passed straight through from `isUnknown`: the platform is saying
 * it could not resolve that media, every other field on it is meaningless, and
 * the grid already draws those as an unclickable placeholder. Mapping it is the
 * whole of what this app has to do about them.
 */
export function toTile(node: MediaNode): LibraryTile {
  const kind = kindOf(node);
  const badge = BADGE_LABEL[kind];
  const caption = node.caption?.replace(/\s+/g, ' ').trim() ?? '';
  return {
    id: node.id,
    kind,
    url: node.url,
    previewUrl: thumbnailOf(node),
    unknown: node.isUnknown,
    ...(badge ? { badge: kind === 'carousel' ? `${badge} ${childCount(node)}` : badge } : {}),
    alt: caption,
  };
}

/**
 * A page appended to what is already there.
 *
 * Deduped by id, keeping the copy already on screen: the connection is a
 * forward-only cursor over a list that can grow at the head between two
 * requests, so the same node genuinely arrives twice and a key collision in the
 * grid is the visible result.
 */
export function appendNodes(existing: readonly MediaNode[], incoming: readonly MediaNode[]): MediaNode[] {
  const seen = new Set(existing.map((node) => node.id));
  return [...existing, ...incoming.filter((node) => !seen.has(node.id))];
}

/**
 * Media that arrived on the subscription, newest first.
 *
 * Kept apart from the paged list rather than spliced into it, because the two
 * come from different places. `botInstagramMediaAdded` fires when the platform
 * INGESTS media — which is not the same moment the API publishes it, and not
 * the same moment the connection starts returning it. Merging them at render
 * time is what lets a page reload not throw away something that arrived a
 * second ago.
 */
export function withLive(live: readonly MediaNode[], node: MediaNode): MediaNode[] {
  return [node, ...live.filter((each) => each.id !== node.id)];
}

/** The two lists as one: live arrivals first, then everything the pages hold. */
export function mergeLive(live: readonly MediaNode[], paged: readonly MediaNode[]): MediaNode[] {
  const seen = new Set(live.map((node) => node.id));
  return [...live, ...paged.filter((node) => !seen.has(node.id))];
}

/**
 * Posts this app published that the account's list does not know about yet.
 *
 * Publishing does not put anything into `instagramMediasConnection`, and it
 * does not fire the subscription either: both of those wait on the platform
 * ingesting the media, which `instagramAccountRefetchLatestMedias` is what
 * triggers. So a library that only listed and listened would show everything
 * except the post somebody just made — the one they came here to look at.
 *
 * The answer to a non-empty result is a refresh, once per id: an account can
 * hold media this app published and the platform then removed, and chasing that
 * forever would be a refetch loop nobody asked for.
 */
export function unlistedPublished(publishedMediaIds: readonly string[], nodes: readonly MediaNode[]): string[] {
  const listed = new Set(nodes.map((node) => node.id));
  return publishedMediaIds.filter((id) => id !== '' && !listed.has(id));
}
