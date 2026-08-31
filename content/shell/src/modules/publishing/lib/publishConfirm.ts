/**
 * Whether a publish whose call died actually landed.
 *
 * This is the module's one genuinely dangerous question. A publish blocks inside
 * the mutation while the platform works — around ten seconds for a photo,
 * minutes for a Reel — and the connection can be lost at any point in that. When
 * it is, the app knows only that it did not hear back, which is not the same as
 * knowing nothing happened: the post may already be on the account. Offering a
 * retry at that moment posts it twice, and there is no unpublish.
 *
 * HOW THE ANSWER IS FOUND, and why it is not the obvious way. There is a
 * subscription that carries new media, and it looks like the signal for this.
 * It is not: a successful publish produces no event, and the post is absent
 * from the media connection for as long as anyone waits. It appears — and the
 * subscription fires, carrying exactly that post — only once
 * `instagramAccountRefetchLatestMedias` has run. The event is tied to
 * the platform INGESTING media, not to this API publishing it, so waiting on the
 * subscription after a publish waits forever.
 *
 * So the mechanism is refetch and diff: the ids on the account are read BEFORE
 * publishing, and after a failure the account is refetched and read again until
 * something new turns up that looks like what was sent, or the window closes.
 *
 * WHICH FAILURES GET THIS TREATMENT. Only the ones where the outcome is unknown.
 * A refusal the server sent back — a caption too long, a carousel of one, an
 * account that may not publish — is a decision, taken before anything was
 * posted, and a retry after one of those is immediately safe.
 */
import { ChatfuelGraphQLError } from '~api';
import { CONFIRM_WINDOW_MS } from './constants';
import type { PostKind } from '../types';

/**
 * The `__typename` each kind arrives under. A carousel has no type of its own —
 * it is a post whose `childMedias` is non-empty.
 */
const ARRIVAL_TYPENAME: Record<PostKind, string> = {
  post: 'InstagramPost',
  reel: 'InstagramReel',
  story: 'InstagramStory',
  carousel: 'InstagramPost',
};

/** As much of one media as this decision needs. */
export interface MediaSummary {
  id: string;
  __typename: string;
  caption: string | null;
  /** The platform's link to it, which becomes the post's permalink. */
  url: string;
}

/**
 * Codes that arrive in a GraphQL envelope but are NOT the server answering.
 *
 * The proxy in front of this app reports its own failures the way the API
 * reports domain ones — a 200-shaped envelope with `errors[]` — because that is
 * what lets one client handle both. It means an envelope is not proof that
 * anything was decided, and exactly one of these codes matters here:
 * `ProxyUpstreamUnavailable` is what the proxy sends when the upstream did not
 * answer inside its budget.
 *
 * That is the single most likely way a Reel publish fails. It blocks for minutes
 * while the platform transcodes, and a proxy that gives up at its own ceiling
 * has learned nothing about whether the post landed — the platform is very
 * probably still finishing it. Reading that envelope as a refusal turns the one
 * case this whole file exists for into an offer to publish the same post twice.
 *
 * Every other synthetic code is a refusal BEFORE the request reached Chatfuel —
 * no token, no session, the wrong bot — so nothing was published and a retry is
 * safe.
 */
const UNKNOWN_OUTCOME_CODES: ReadonlySet<string> = new Set(['ProxyUpstreamUnavailable']);

/**
 * Did the server refuse, or did the call simply not come back?
 *
 * A GraphQL envelope usually means the server understood the request and
 * answered it — nothing was published, and a retry costs nothing. The exception
 * is above: a proxy reporting its own timeout in the same shape, which leaves
 * the outcome unknown. Everything else that is not an envelope at all (a client
 * abort, a dropped connection, a gateway that never answered) is unknown too,
 * and unknown is what the diff below is for.
 */
export const isDomainRefusal = (err: unknown): boolean =>
  err instanceof ChatfuelGraphQLError && !UNKNOWN_OUTCOME_CODES.has(err.code ?? '');

/** What is on the account now that was not there before the publish began. */
export function newArrivals(before: ReadonlySet<string>, after: readonly MediaSummary[]): MediaSummary[] {
  return after.filter((media) => !before.has(media.id));
}

/**
 * Which of the new media is the one that was just sent, if any.
 *
 * Two tests. It has to be the same kind, so a story going out beside a reel is
 * not mistaken for it. And if a caption was sent it has to be that caption,
 * which is what tells two posts of the same kind in the same minute apart —
 * captions come back exactly as they were written, so this is an equality and
 * not a resemblance.
 *
 * A Story carries no caption at all, so any new Story inside the window is taken
 * as the match. Two stories published together are genuinely indistinguishable
 * here; that is the honest limit of the signal, and it errs toward NOT retrying,
 * which is the safe side of it.
 *
 * The list arrives newest first, so when several match, the first is the most
 * recent — the best available guess at which one this call made.
 */
export function matchPublished(
  candidates: readonly MediaSummary[],
  input: { kind: PostKind; caption: string },
): MediaSummary | null {
  const sent = input.caption.trim();
  const ofKind = candidates.filter((media) => media.__typename === ARRIVAL_TYPENAME[input.kind]);
  if (!sent) return ofKind[0] ?? null;
  return ofKind.find((media) => (media.caption ?? '').trim() === sent) ?? null;
}

export interface ConfirmInput {
  kind: PostKind;
  /** Exactly what was sent, so somebody else's post in the same window is not taken for this one. */
  caption: string;
  /** The ids on the account before the publish began. */
  before: ReadonlySet<string>;
  /** The ids on the account now, newest first. */
  after: readonly MediaSummary[];
  /** Epoch milliseconds the publish call began. */
  startedAt: number;
  /** Epoch milliseconds now. */
  now: number;
  windowMs?: number;
}

export type ConfirmDecision =
  { state: 'confirmed'; mediaId: string; permalink: string } | { state: 'waiting' } | { state: 'failed' };

/**
 * `waiting` means look again — ingestion is not instant, and two or three rounds
 * is normal. `failed` means the window closed with nothing new that looks like
 * this post, and a retry is safe.
 */
export function confirmPublish(input: ConfirmInput): ConfirmDecision {
  const match = matchPublished(newArrivals(input.before, input.after), input);
  if (match) return { state: 'confirmed', mediaId: match.id, permalink: match.url };
  const window = input.windowMs ?? CONFIRM_WINDOW_MS;
  return input.now - input.startedAt < window ? { state: 'waiting' } : { state: 'failed' };
}
