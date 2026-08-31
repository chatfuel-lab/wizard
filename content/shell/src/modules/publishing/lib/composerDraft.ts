/**
 * The post being written, and every rule about changing it.
 *
 * The composer is a `.tsx` file with no decisions in it: what a kind accepts,
 * how many items it takes, what survives a change of kind and what a pasted
 * link turns into all live here, where a test can ask.
 *
 * The one rule worth stating out loud is what happens on a kind change. It
 * keeps whatever still applies and drops the rest WITHOUT saying so, because
 * the alternative — a dialog asking whether to discard three photos — is a
 * question nobody has an answer to before they have seen the result. A Story
 * has no caption at all (`InstagramPublishStoryInput` has no field for one), so
 * moving to a Story empties it; moving away leaves it empty, which is the same
 * thing the caption box already showed.
 */
import { newClientId } from '~api';
import { FileStatus, FileType } from '~api/generated/publishing/graphql';
import { CAROUSEL_MAX } from './constants';
import { kindOf, thumbnailOf } from './libraryItems';
import type { MediaItem, MediaNode, NewPost, PostKind, QueuedPost } from '../types';

/* Ids minted here (`newClientId`) are this app's own, never Instagram's, which
   is a different thing with a different lifetime: a post or a media item has an
   id from the moment it is written, and an `InstagramMediaID` only once it
   exists on the account. */

export type MediaType = MediaItem['type'];

/** What each kind is called where a sentence needs it. */
export const KIND_LABELS: Record<PostKind, string> = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
  carousel: 'Carousel',
};

/** How many pieces of media a kind carries. Everything but a carousel is one. */
export const capacityOf = (kind: PostKind): number => (kind === 'carousel' ? CAROUSEL_MAX : 1);

/** What a kind will take. A Reel is a video; a feed photo is a photo. */
export function acceptsOf(kind: PostKind): readonly MediaType[] {
  switch (kind) {
    case 'post':
      return ['image'];
    case 'reel':
      return ['video'];
    default:
      return ['image', 'video'];
  }
}

/**
 * The `accept` string for the file picker, so the picker refuses what the
 * platform would refuse rather than offering it and failing on publish.
 * Every picture format the platform will take, which in practice is every one a
 * browser will offer. The input's `accept` is a filter on a file dialog, not a
 * rule — narrowing it to one format hides files somebody has and can publish.
 */
const IMAGE_ACCEPT = 'image/*';
const VIDEO_ACCEPT = 'video/mp4,video/quicktime';

export function acceptAttribute(kind: PostKind): string {
  const accepts = acceptsOf(kind);
  return [accepts.includes('image') ? IMAGE_ACCEPT : null, accepts.includes('video') ? VIDEO_ACCEPT : null]
    .filter(Boolean)
    .join(',');
}

/** A Story carries no caption, and the composer must not offer the field. */
export const hasCaption = (kind: PostKind): boolean => kind !== 'story';

/** What a tile and its alt text call an item. Media here has no name of its own. */
export const mediaLabel = (item: MediaItem, index: number): string =>
  `${item.type === 'video' ? 'Video' : 'Photo'} ${index + 1}`;

/* -------------------------------------------------------------------------- */
/* Making a draft                                                             */
/* -------------------------------------------------------------------------- */

/** A blank post. `at` is the time a calendar slot handed over, if one did. */
export function emptyDraft(at: string | null = null): NewPost {
  return { kind: 'post', caption: '', media: [], scheduledAt: at };
}

/** An existing post, opened for editing. */
export function toDraft(post: QueuedPost): NewPost {
  return {
    kind: post.kind,
    caption: post.caption,
    media: post.media.map((item) => ({ ...item })),
    reel: post.reel ? { ...post.reel } : undefined,
    scheduledAt: post.scheduledAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Starting from something already on the account                             */
/* -------------------------------------------------------------------------- */

/**
 * One media on the account, as something a new post can carry — or null when it
 * carries nothing publishable.
 *
 * `isUnknown` is the platform saying it could not resolve the media at all, and
 * an `Expired` file is one whose stored bytes have already been collected: both
 * would publish as an address that answers nothing.
 *
 * What comes back is durable. Media on the account is served publicly and
 * carries no deletion deadline, so a post built from it can be given a time and
 * still be there when it goes out — which a fresh upload cannot.
 */
export function fromLibraryNode(node: MediaNode, makeId: () => string = newClientId): MediaItem | null {
  if (node.isUnknown) return null;
  const file = node.file;
  if (!file || !file.url || file.status === FileStatus.Expired) return null;
  return {
    id: makeId(),
    type: file.type === FileType.Video ? 'video' : 'image',
    url: file.url,
    source: 'library',
    previewUrl: thumbnailOf(node) ?? file.url,
  };
}

/** One slide of a carousel already on the account. Only two of the four branches carry a file. */
type CarouselChild = Extract<MediaNode, { __typename: 'InstagramPost' }>['childMedias'][number];

function fromChild(child: CarouselChild, makeId: () => string): MediaItem | null {
  if (!('file' in child)) return null;
  const file = child.file;
  if (!file || !file.url || file.status === FileStatus.Expired) return null;
  return {
    id: makeId(),
    type: file.type === FileType.Video ? 'video' : 'image',
    url: file.url,
    source: 'library',
    previewUrl: file.url,
  };
}

/**
 * A new post started from one already on the account.
 *
 * The kind is read off what the media IS rather than off what it was published
 * as: a video becomes a Reel whatever it arrived as, because that is the only
 * mutation that takes one. A Story stays a Story, and loses the caption it never
 * had. Null when there is nothing usable behind the id at all.
 */
export function draftFromNode(
  node: MediaNode,
  at: string | null = null,
  makeId: () => string = newClientId,
): NewPost | null {
  if (node.isUnknown) return null;
  const caption = node.caption ?? '';

  if (kindOf(node) === 'carousel' && node.__typename === 'InstagramPost') {
    const media = node.childMedias
      .map((child) => fromChild(child, makeId))
      .filter((item): item is MediaItem => item !== null)
      .slice(0, CAROUSEL_MAX);
    if (media.length > 0) return { kind: 'carousel', caption, media, scheduledAt: at };
  }

  const item = fromLibraryNode(node, makeId);
  if (!item) return null;
  const kind: PostKind = kindOf(node) === 'story' ? 'story' : item.type === 'video' ? 'reel' : 'post';
  return {
    kind,
    caption: hasCaption(kind) ? caption : '',
    media: [item],
    reel: kind === 'reel' ? {} : undefined,
    scheduledAt: at,
  };
}

/* -------------------------------------------------------------------------- */
/* Changing it                                                                */
/* -------------------------------------------------------------------------- */

export function applyKind(draft: NewPost, kind: PostKind): NewPost {
  if (draft.kind === kind) return draft;
  const accepts = acceptsOf(kind);
  return {
    ...draft,
    kind,
    media: draft.media.filter((item) => accepts.includes(item.type)).slice(0, capacityOf(kind)),
    caption: hasCaption(kind) ? draft.caption : '',
    reel: kind === 'reel' ? (draft.reel ?? {}) : undefined,
  };
}

/**
 * Room left for more media. A kind that takes one item is always full once it
 * has one — adding replaces, which is what `withMedia` does below.
 */
export const roomFor = (draft: NewPost): number => Math.max(0, capacityOf(draft.kind) - draft.media.length);

/**
 * Whether the strip still offers a way to put something in it.
 *
 * Not the same question as `roomFor`. A kind that takes ONE item never runs out
 * of ways in, because adding to it replaces what is there — that is what
 * `withMedia` does — so a photo post keeps its drop tile beside the photo, and
 * swapping the picture is a drop rather than a remove and a drop. A carousel
 * genuinely fills up, and at ten items the tile goes.
 */
export const canAddMore = (draft: NewPost): boolean => capacityOf(draft.kind) === 1 || roomFor(draft) > 0;

/**
 * Add what fits and drop what does not.
 *
 * On a single-item kind the newest wins: somebody who drops a second photo onto
 * a photo post means to replace the first, not to be told the tray is full.
 */
export function withMedia(draft: NewPost, items: readonly MediaItem[]): NewPost {
  const accepts = acceptsOf(draft.kind);
  const usable = items.filter((item) => accepts.includes(item.type));
  if (usable.length === 0) return draft;
  const capacity = capacityOf(draft.kind);
  if (capacity === 1) return { ...draft, media: [usable[usable.length - 1]!] };
  return { ...draft, media: [...draft.media, ...usable].slice(0, capacity) };
}

export function withoutMedia(draft: NewPost, id: string): NewPost {
  const media = draft.media.filter((item) => item.id !== id);
  return media.length === draft.media.length ? draft : { ...draft, media };
}

/** Move one item to another position. Out-of-range indexes leave the draft alone. */
export function reorderMedia(draft: NewPost, from: number, to: number): NewPost {
  const { media } = draft;
  if (from === to || from < 0 || to < 0 || from >= media.length || to >= media.length) return draft;
  const next = [...media];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return { ...draft, media: next };
}

/* -------------------------------------------------------------------------- */
/* How long a source lasts                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Whether this item's URL will still answer later.
 *
 * A freshly uploaded file is served publicly — the platform's own servers can
 * fetch it, which is what makes publishing straight from an upload work — but
 * it is deleted a short while after it lands, and nothing in the API reports
 * that deadline. Long enough for publishing now and nothing at all for a post
 * that goes out on Thursday.
 *
 * A link somebody pasted and a file already on the account are both somebody
 * else's storage and carry no such deadline, so an upload is the one source
 * that has to be moved somewhere lasting before a post can be given a time.
 */
export const needsDurableStorage = (item: MediaItem): boolean => item.source === 'upload';

/** The items in a draft that would be gone before a scheduled post went out. */
export const expiringMedia = (draft: NewPost): MediaItem[] => draft.media.filter(needsDurableStorage);

/* -------------------------------------------------------------------------- */
/* Links                                                                      */
/* -------------------------------------------------------------------------- */

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm'];

/**
 * What a URL looks like it points at, when nothing else says.
 *
 * Only ever a guess, and only used where the kind does not already decide —
 * a Reel takes a video whatever the link is called. The publish either works or
 * the platform says why, and this is not the place to pretend otherwise.
 */
export function guessMediaType(url: string): MediaType {
  const path = url.split(/[?#]/)[0]!.toLowerCase();
  return VIDEO_EXTENSIONS.some((extension) => path.endsWith(extension)) ? 'video' : 'image';
}

/**
 * A pasted link, turned into media — or null when it is not a link at all.
 *
 * `http` and `https` only: the bytes are fetched by the platform's own servers
 * from the public internet, so a `blob:`, a `data:` or a `file:` is a URL that
 * exists in exactly one browser tab and nowhere else.
 */
export function parseMediaLink(raw: string, kind: PostKind, makeId: () => string = newClientId): MediaItem | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const accepts = acceptsOf(kind);
  const type = accepts.length === 1 ? accepts[0]! : guessMediaType(trimmed);
  return { id: makeId(), type, url: trimmed, source: 'link', previewUrl: trimmed };
}
