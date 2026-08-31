import type { InstagramAccountRefFragment, InstagramMediaRefFragment } from '~api/generated/publishing/graphql';
import type { ModuleClient } from '~api';

export type ApiClient = ModuleClient;

/** The connected account, as every surface here reads it. */
export type Account = InstagramAccountRefFragment;

/** One item on the account — a post, a reel, an ad or a story. */
export type MediaNode = InstagramMediaRefFragment;

/** The four things this API can be asked to publish. */
export type PostKind = 'post' | 'reel' | 'story' | 'carousel';

export const POST_KINDS: readonly PostKind[] = ['post', 'reel', 'story', 'carousel'];

/**
 * A piece of media in a post being written.
 *
 * `url` is the one field the publish mutations care about, and it has to be
 * reachable by Instagram's own servers — they fetch the bytes themselves, and a
 * URL that needs a header is a URL they cannot read. `previewUrl` is what the
 * composer draws, which may be a local `blob:` that exists only in this tab;
 * the two are separate for exactly that reason.
 */
export interface MediaItem {
  /** Stable across reorders, and ours — not Instagram's. */
  id: string;
  type: 'image' | 'video';
  url: string;
  /** Where the URL came from, which is what a failure has to be explained by. */
  source: 'upload' | 'link' | 'library';
  /** Set when the URL came from an upload, so the file can be read back. */
  fileId?: string;
  previewUrl?: string;
  /** Longest edge in pixels, when it is known — the preview uses it for shape. */
  width?: number;
  height?: number;
}

/** Reel-only settings. Every one of them is optional on the API too. */
export interface ReelOptions {
  coverURL?: string;
  shareToFeed?: boolean;
  /** Milliseconds into the video for the auto-generated cover. */
  thumbOffset?: number;
}

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

/**
 * A post this app knows about: written here, and published by here.
 *
 * There is no such thing on the Chatfuel API — it publishes and forgets, and
 * `InstagramPost` has neither a status nor a timestamp. Everything below the
 * `published` line is therefore ours, which is also why the calendar can only
 * ever show posts that went out through this app.
 */
export interface QueuedPost {
  id: string;
  kind: PostKind;
  caption: string;
  media: MediaItem[];
  reel?: ReelOptions;
  /** ISO 8601, UTC. Null on a draft — a draft is a post with no time yet. */
  scheduledAt: string | null;
  status: PostStatus;
  attempts: number;
  /** The InstagramMediaID the platform answered with. */
  mediaId: string | null;
  permalink: string | null;
  /** Whatever went wrong, in the API's own words. */
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What a post looks like before it has an id. */
export type NewPost = Omit<
  QueuedPost,
  'id' | 'status' | 'attempts' | 'mediaId' | 'permalink' | 'error' | 'createdAt' | 'updatedAt'
>;

/**
 * Whether this deployment can publish at all, told apart from whether it has an
 * account — they are different screens.
 */
export type AccountGate =
  | { state: 'loading' }
  | { state: 'absent' }
  | { state: 'unpermitted'; account: Account }
  | { state: 'ready'; account: Account }
  | { state: 'error'; message: string };

/**
 * The one permission that decides whether anything here can publish.
 *
 * Compared as a string rather than against the generated enum: codegen emits a
 * private copy of the enum per module, and the API answers with the wire value,
 * so an enum-typed comparison would be a cast at every call site to say
 * something both sides already agree on.
 */
const PUBLISH_PERMISSION = 'InstagramBusinessContentPublish';

/** True when this account may publish — a connected account that may not is its own screen. */
export const canPublish = (account: Pick<Account, 'permissions'>): boolean =>
  (account.permissions as readonly string[]).includes(PUBLISH_PERMISSION);
