import { describe, expect, it } from 'vitest';
import { createUserStorageBackend, keyFor, trim } from './userStorage';
import type { ApiClient, QueuedPost } from '../../types';

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

describe('keyFor', () => {
  it('is scoped to the bot, so two bots in one account never share a queue', () => {
    expect(keyFor('bot-a')).not.toBe(keyFor('bot-b'));
  });

  it('is the exact key a stored queue is written under', () => {
    // Pinned as a literal: anything that seeds a queue writes it under this
    // string, and a write under a key nobody reads does not fail — it just
    // leaves the module empty and correct.
    expect(keyFor('bot-1')).toBe('chatfuel-publishing-queue:bot-1');
  });
});

describe('trim', () => {
  it('leaves a queue under the cap alone', () => {
    const posts = [post({ id: 'a' }), post({ id: 'b' })];
    expect(trim(posts, 5)).toEqual(posts);
  });

  it('drops the oldest published posts first — those are on Instagram already', () => {
    const posts = [
      post({ id: 'draft', status: 'draft', updatedAt: '2026-01-01T00:00:00.000Z' }),
      post({ id: 'old-published', status: 'published', updatedAt: '2026-02-01T00:00:00.000Z' }),
      post({ id: 'new-published', status: 'published', updatedAt: '2026-08-01T00:00:00.000Z' }),
    ];
    const kept = trim(posts, 2).map((p) => p.id);
    expect(kept).not.toContain('old-published');
    expect(kept).toContain('draft');
    expect(kept).toContain('new-published');
  });

  it('falls back to the oldest of anything when the overflow is not published work', () => {
    const posts = [
      post({ id: 'a', status: 'scheduled', updatedAt: '2026-01-01T00:00:00.000Z' }),
      post({ id: 'b', status: 'scheduled', updatedAt: '2026-02-01T00:00:00.000Z' }),
      post({ id: 'c', status: 'scheduled', updatedAt: '2026-03-01T00:00:00.000Z' }),
    ];
    expect(trim(posts, 2).map((p) => p.id)).toEqual(['c', 'b']);
  });
});

/**
 * A fake of the two calls `createUserStorage` makes, with a delay in front of
 * each so two changes overlap the way two clicks do. It holds the document the
 * same way the server does: replaced whole, last write winning.
 */
function fakeClient() {
  let stored: string | null = null;
  const later = <T>(value: () => T): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value()), 1));
  return {
    posts: () => (stored ? (JSON.parse(stored) as { posts: QueuedPost[] }).posts : []),
    client: {
      query: () => later(() => ({ currentUser: { userStorageItem: { value: stored } } })),
      mutate: (_doc: unknown, variables: { value: string }) =>
        later(() => {
          stored = variables.value;
          return {};
        }),
    } as unknown as ApiClient,
  };
}

/**
 * Two changes at once: each is read-modify-write over one document, so without
 * a queue the second reads before the first writes and the first change is
 * gone — delete two drafts quickly and one comes back.
 */
describe('changes that overlap', () => {
  it('does not lose the earlier one', async () => {
    const { client, posts } = fakeClient();
    const backend = createUserStorageBackend(client, 'bot-1');

    const [a, b] = await Promise.all([
      backend.create({ kind: 'post', caption: 'first', media: [], scheduledAt: null }),
      backend.create({ kind: 'post', caption: 'second', media: [], scheduledAt: null }),
    ]);

    expect(
      posts()
        .map((p) => p.id)
        .sort(),
    ).toEqual([a.id, b.id].sort());
  });

  it('deletes both of two posts deleted together', async () => {
    const { client, posts } = fakeClient();
    const backend = createUserStorageBackend(client, 'bot-1');
    const a = await backend.create({ kind: 'post', caption: 'a', media: [], scheduledAt: null });
    const b = await backend.create({ kind: 'post', caption: 'b', media: [], scheduledAt: null });

    await Promise.all([backend.remove(a.id), backend.remove(b.id)]);

    expect(posts()).toEqual([]);
  });

  it('lets the next change through after one of them fails', async () => {
    const { client, posts } = fakeClient();
    const backend = createUserStorageBackend(client, 'bot-1');
    const a = await backend.create({ kind: 'post', caption: 'a', media: [], scheduledAt: null });

    await expect(backend.update('gone', { caption: 'x' })).rejects.toThrow(/no longer in your drafts/);
    await backend.update(a.id, { caption: 'edited' });

    expect(posts().map((p) => p.caption)).toEqual(['edited']);
  });
});
