import type { QueuedPost, PostStatus } from '../types';

/**
 * The one list of posts this app knows about, and the rules for changing it.
 *
 * Two views draw from this — the calendar and the queue — and they must never
 * disagree, which is the whole reason it is a store and not two fetches. A post
 * exists once, in `byId`; `order` is the arrangement, and a view switch costs no
 * request.
 *
 * Three decisions worth stating, because each is a bug somewhere else:
 *
 * 1. **`epoch` lives in state, not in a ref.** Every request-shaped action
 *    carries the epoch it was issued under and the reducer drops it if the epoch
 *    has moved on. `reset` bumps it — the bump IS the request.
 * 2. **The reducer never reads the clock.** `now` arrives in the action, so
 *    every ordering rule here is testable without faking time.
 * 3. **A publish in flight is `pending`, and pending survives a refetch.** A
 *    list that arrives while a post is being published must not put that post
 *    back to `scheduled` — the server it came from does not know yet.
 */
export interface PostsState {
  byId: Record<string, QueuedPost>;
  /** Ids, scheduled soonest first; drafts (no time) last, newest first. */
  order: string[];
  /** Ids whose publish this tab started and has not heard back about. */
  pending: string[];
  loading: boolean;
  error: string | null;
  epoch: number;
}

export type PostsAction =
  | { type: 'reset' }
  | { type: 'loaded'; epoch: number; posts: QueuedPost[] }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'errorCleared' }
  | { type: 'upserted'; post: QueuedPost }
  | { type: 'removed'; id: string }
  | { type: 'publishStarted'; id: string; now: string }
  | { type: 'publishSucceeded'; id: string; mediaId: string; permalink: string; now: string }
  | { type: 'publishFailed'; id: string; message: string; now: string };

export const initialPostsState = (): PostsState => ({
  byId: {},
  order: [],
  pending: [],
  loading: true,
  error: null,
  epoch: 0,
});

/**
 * Scheduled posts come first, soonest at the top, because that is the next thing
 * that will happen. Drafts have no time at all and sort by when they were last
 * touched — a draft is a piece of work, and the one worked on most recently is
 * the one being worked on.
 */
export function orderOf(byId: Record<string, QueuedPost>): string[] {
  const posts = Object.values(byId);
  const timed = posts.filter((post) => post.scheduledAt !== null);
  const untimed = posts.filter((post) => post.scheduledAt === null);
  timed.sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!) || a.id.localeCompare(b.id));
  untimed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  return [...timed, ...untimed].map((post) => post.id);
}

const withPost = (state: PostsState, post: QueuedPost): PostsState => {
  const byId = { ...state.byId, [post.id]: post };
  return { ...state, byId, order: orderOf(byId) };
};

export function postsReducer(state: PostsState, action: PostsAction): PostsState {
  switch (action.type) {
    case 'reset':
      return { ...state, loading: true, error: null, epoch: state.epoch + 1 };

    case 'loaded': {
      if (action.epoch !== state.epoch) return state;
      const byId: Record<string, QueuedPost> = {};
      for (const post of action.posts) byId[post.id] = post;
      /* A publish this tab started outranks whatever the list says: the store it
         came from has not been told the outcome yet, and putting the post back
         to `scheduled` would offer a second publish of something already going
         out. */
      for (const id of state.pending) {
        const mine = state.byId[id];
        if (mine) byId[id] = mine;
      }
      return { ...state, byId, order: orderOf(byId), loading: false, error: null };
    }

    case 'failed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: action.message };

    case 'errorCleared':
      return { ...state, error: null };

    case 'upserted':
      return withPost(state, action.post);

    case 'removed': {
      if (!state.byId[action.id]) return state;
      const byId = { ...state.byId };
      delete byId[action.id];
      return {
        ...state,
        byId,
        order: orderOf(byId),
        pending: state.pending.filter((id) => id !== action.id),
      };
    }

    case 'publishStarted': {
      const post = state.byId[action.id];
      if (!post) return state;
      const next = withPost(state, { ...post, status: 'publishing', error: null, updatedAt: action.now });
      return { ...next, pending: next.pending.includes(action.id) ? next.pending : [...next.pending, action.id] };
    }

    case 'publishSucceeded': {
      const post = state.byId[action.id];
      if (!post) return state;
      const next = withPost(state, {
        ...post,
        status: 'published',
        mediaId: action.mediaId,
        permalink: action.permalink,
        error: null,
        updatedAt: action.now,
      });
      return { ...next, pending: next.pending.filter((id) => id !== action.id) };
    }

    case 'publishFailed': {
      const post = state.byId[action.id];
      if (!post) return state;
      const next = withPost(state, {
        ...post,
        status: 'failed',
        attempts: post.attempts + 1,
        error: action.message,
        updatedAt: action.now,
      });
      return { ...next, pending: next.pending.filter((id) => id !== action.id) };
    }

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* Selectors                                                                  */
/* -------------------------------------------------------------------------- */

export const selectPosts = (state: PostsState): QueuedPost[] =>
  state.order.map((id) => state.byId[id]!).filter(Boolean);

export const selectByStatus = (state: PostsState, status: PostStatus | null): QueuedPost[] =>
  status === null ? selectPosts(state) : selectPosts(state).filter((post) => post.status === status);

/** Posts that have a time, which is every post the calendar can place. */
export const selectDated = (state: PostsState): QueuedPost[] =>
  selectPosts(state).filter((post) => post.scheduledAt !== null);

/** How many posts are in each status, for the queue's filter chips. */
export function countByStatus(state: PostsState): Record<PostStatus, number> {
  const counts: Record<PostStatus, number> = {
    draft: 0,
    scheduled: 0,
    publishing: 0,
    published: 0,
    failed: 0,
  };
  for (const id of state.order) {
    const post = state.byId[id];
    if (post) counts[post.status] += 1;
  }
  return counts;
}
