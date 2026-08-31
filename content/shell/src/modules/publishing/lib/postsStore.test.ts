import { describe, expect, it } from 'vitest';
import {
  countByStatus,
  initialPostsState,
  orderOf,
  postsReducer,
  selectDated,
  selectPosts,
  type PostsAction,
  type PostsState,
} from './postsStore';
import type { QueuedPost } from '../types';

const post = (over: Partial<QueuedPost> = {}): QueuedPost => ({
  id: 'p1',
  kind: 'post',
  caption: '',
  media: [],
  scheduledAt: null,
  status: 'draft',
  attempts: 0,
  mediaId: null,
  permalink: null,
  error: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...over,
});

const run = (state: PostsState, ...actions: PostsAction[]): PostsState => actions.reduce(postsReducer, state);

const loaded = (posts: QueuedPost[]): PostsState => {
  const started = postsReducer(initialPostsState(), { type: 'reset' });
  return postsReducer(started, { type: 'loaded', epoch: started.epoch, posts });
};

describe('orderOf', () => {
  it('puts scheduled posts first, soonest at the top', () => {
    const byId = {
      late: post({ id: 'late', scheduledAt: '2026-09-01T10:00:00.000Z' }),
      soon: post({ id: 'soon', scheduledAt: '2026-08-22T10:00:00.000Z' }),
    };
    expect(orderOf(byId)).toEqual(['soon', 'late']);
  });

  it('puts drafts after everything timed, most recently touched first', () => {
    const byId = {
      timed: post({ id: 'timed', scheduledAt: '2026-09-01T10:00:00.000Z' }),
      old: post({ id: 'old', updatedAt: '2026-08-01T00:00:00.000Z' }),
      fresh: post({ id: 'fresh', updatedAt: '2026-08-20T00:00:00.000Z' }),
    };
    expect(orderOf(byId)).toEqual(['timed', 'fresh', 'old']);
  });

  it('breaks a tie by id, so the order never depends on object order', () => {
    const at = '2026-08-22T10:00:00.000Z';
    const forward = orderOf({ b: post({ id: 'b', scheduledAt: at }), a: post({ id: 'a', scheduledAt: at }) });
    const backward = orderOf({ a: post({ id: 'a', scheduledAt: at }), b: post({ id: 'b', scheduledAt: at }) });
    expect(forward).toEqual(['a', 'b']);
    expect(forward).toEqual(backward);
  });
});

describe('loading', () => {
  it('starts loading and stops when a list arrives', () => {
    const state = loaded([post()]);
    expect(state.loading).toBe(false);
    expect(selectPosts(state)).toHaveLength(1);
  });

  it('drops an answer issued under an older epoch', () => {
    const first = postsReducer(initialPostsState(), { type: 'reset' });
    const second = postsReducer(first, { type: 'reset' });
    const late = postsReducer(second, { type: 'loaded', epoch: first.epoch, posts: [post()] });
    expect(selectPosts(late)).toHaveLength(0);
    expect(late.loading).toBe(true);
  });

  it('drops a failure issued under an older epoch', () => {
    const first = postsReducer(initialPostsState(), { type: 'reset' });
    const second = postsReducer(first, { type: 'reset' });
    const late = postsReducer(second, { type: 'failed', epoch: first.epoch, message: 'stale' });
    expect(late.error).toBeNull();
  });
});

describe('publishing', () => {
  const now = '2026-08-21T12:00:00.000Z';

  it('marks a post publishing and remembers that this tab started it', () => {
    const state = run(loaded([post({ id: 'p1', status: 'scheduled', scheduledAt: now })]), {
      type: 'publishStarted',
      id: 'p1',
      now,
    });
    expect(state.byId.p1!.status).toBe('publishing');
    expect(state.pending).toEqual(['p1']);
  });

  it('keeps a publish in flight when a stale list arrives on top of it', () => {
    // The store the list came from has not been told the outcome yet. Putting
    // the post back to `scheduled` would offer a second publish of something
    // already going out.
    const started = run(loaded([post({ id: 'p1', status: 'scheduled', scheduledAt: now })]), {
      type: 'publishStarted',
      id: 'p1',
      now,
    });
    const refetched = postsReducer(postsReducer(started, { type: 'reset' }), {
      type: 'loaded',
      epoch: started.epoch + 1,
      posts: [post({ id: 'p1', status: 'scheduled', scheduledAt: now })],
    });
    expect(refetched.byId.p1!.status).toBe('publishing');
  });

  it('records the permalink on success and clears the pending mark', () => {
    const state = run(
      loaded([post({ id: 'p1', status: 'scheduled', scheduledAt: now })]),
      { type: 'publishStarted', id: 'p1', now },
      { type: 'publishSucceeded', id: 'p1', mediaId: 'ig-1', permalink: 'https://x/p/1', now },
    );
    expect(state.byId.p1!.status).toBe('published');
    expect(state.byId.p1!.permalink).toBe('https://x/p/1');
    expect(state.pending).toEqual([]);
  });

  it('counts attempts on failure, so a retry that keeps failing is visible', () => {
    const state = run(
      loaded([post({ id: 'p1', status: 'scheduled', scheduledAt: now })]),
      { type: 'publishStarted', id: 'p1', now },
      { type: 'publishFailed', id: 'p1', message: 'InstagramCarouselSizeInvalid', now },
      { type: 'publishStarted', id: 'p1', now },
      { type: 'publishFailed', id: 'p1', message: 'InstagramCarouselSizeInvalid', now },
    );
    expect(state.byId.p1!.attempts).toBe(2);
    expect(state.byId.p1!.error).toBe('InstagramCarouselSizeInvalid');
    expect(state.pending).toEqual([]);
  });

  it('ignores an outcome for a post that is no longer there', () => {
    const state = run(
      loaded([post({ id: 'p1' })]),
      { type: 'removed', id: 'p1' },
      {
        type: 'publishSucceeded',
        id: 'p1',
        mediaId: 'ig-1',
        permalink: '',
        now,
      },
    );
    expect(selectPosts(state)).toHaveLength(0);
  });
});

describe('selectors', () => {
  it('gives the calendar only posts that have a time', () => {
    const state = loaded([
      post({ id: 'draft' }),
      post({ id: 'timed', scheduledAt: '2026-08-22T10:00:00.000Z', status: 'scheduled' }),
    ]);
    expect(selectDated(state).map((p) => p.id)).toEqual(['timed']);
  });

  it('counts every status, including the ones with nothing in them', () => {
    const state = loaded([post({ id: 'a' }), post({ id: 'b', status: 'failed' })]);
    expect(countByStatus(state)).toEqual({ draft: 1, scheduled: 0, publishing: 0, published: 0, failed: 1 });
  });
});

describe('removal', () => {
  it('takes the post out of the order and out of pending', () => {
    const state = run(
      loaded([post({ id: 'p1', status: 'scheduled', scheduledAt: '2026-08-22T10:00:00.000Z' })]),
      { type: 'publishStarted', id: 'p1', now: '2026-08-21T12:00:00.000Z' },
      { type: 'removed', id: 'p1' },
    );
    expect(state.order).toEqual([]);
    expect(state.pending).toEqual([]);
  });
});
