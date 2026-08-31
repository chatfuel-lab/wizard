import { createUserStorage, newClientId } from '~api';
import type { ApiClient, NewPost, QueuedPost } from '../../types';
import type { QueueBackend } from './types';

/**
 * The queue in the only storage the Chatfuel API offers a client:
 * `setUserStorageItem`, an arbitrary id holding an arbitrary string — read and
 * written through the api client's `createUserStorage`.
 *
 * Three consequences, all real and none hideable:
 *
 *   * It is scoped to the SIGNED-IN USER. A colleague opening the same bot sees
 *     their own drafts, not these. So this backend is for one person's work in
 *     progress, and the skill docs say so in those words.
 *   * Nothing reads it but a browser. A time written here is a note to self, not
 *     an instruction to anybody — which is why `canSchedule` is false, and why
 *     the composer's schedule control is absent rather than present and inert.
 *   * A write replaces the document whole. There is no version to write
 *     against and no conditional write to attempt, so the last writer wins —
 *     `serialize` below closes that inside one tab and cannot close it across
 *     two.
 *
 * The value is one JSON document, rewritten whole on every change. That is fine
 * for a queue and would not be for a feed: the cap below keeps a long-running
 * account from growing a document nobody can save, oldest published posts going
 * first because they are the ones already on Instagram.
 */

/** Beyond this, the oldest published posts are dropped from the local copy. */
const LOCAL_CAP = 200;

/**
 * Exported because the key is the whole contract between a stored queue and the
 * module that reads it: a write under a key nobody reads is invisible — it does
 * not fail, the module is simply empty and correct — so the literal is pinned by
 * a test rather than left to be retyped.
 */
export const keyFor = (botId: string): string => `chatfuel-publishing-queue:${botId}`;

interface Stored {
  version: 1;
  posts: QueuedPost[];
}

function parse(value: string | null | undefined): QueuedPost[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Partial<Stored>;
    return Array.isArray(parsed.posts) ? parsed.posts : [];
  } catch {
    /* A document we cannot read is a document somebody else wrote, or one we
       wrote in a shape that no longer exists. Losing drafts is bad; refusing to
       start is worse, and the next write replaces it. */
    return [];
  }
}

/** Oldest published first — they are already on Instagram and this copy adds nothing. */
export function trim(posts: QueuedPost[], cap = LOCAL_CAP): QueuedPost[] {
  if (posts.length <= cap) return posts;
  const published = posts
    .filter((post) => post.status === 'published')
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const drop = new Set(published.slice(0, posts.length - cap).map((post) => post.id));
  const kept = posts.filter((post) => !drop.has(post.id));
  /* Still over: the overflow is not published work, so the oldest of anything goes. */
  if (kept.length <= cap) return kept;
  return [...kept].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, cap);
}

/**
 * One change at a time.
 *
 * Every change here is read-modify-write over a single document, so two of them
 * in flight together means the second read the queue before the first wrote it
 * and the first change is gone — delete two posts quickly and one comes back.
 * Chaining them makes each read follow the previous write.
 *
 * It ends at the tab, and deliberately: two TABS still race, and the API this
 * runs on offers nothing to fix it with. Merging blind would need a winner per
 * post and a tombstone for every delete, which is a design rather than a guard,
 * and the blast radius is one person's own drafts.
 */
function serialize(): <T>(step: () => Promise<T>) => Promise<T> {
  let chain: Promise<unknown> = Promise.resolve();
  return (step) => {
    const next = chain.then(step, step);
    // A failed change must not wedge the queue behind it.
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };
}

export function createUserStorageBackend(client: ApiClient, botId: string, now = () => new Date()): QueueBackend {
  const store = createUserStorage(client, keyFor(botId));
  const inTurn = serialize();

  const read = async (): Promise<QueuedPost[]> => parse(await store.read());

  const write = async (posts: QueuedPost[]): Promise<void> => {
    const payload: Stored = { version: 1, posts: trim(posts) };
    await store.write(JSON.stringify(payload));
  };

  return {
    kind: 'userStorage',
    canSchedule: false,

    list: read,

    create(post: NewPost) {
      return inTurn(async () => {
        const stamp = now().toISOString();
        const created: QueuedPost = {
          ...post,
          id: newClientId(),
          status: post.scheduledAt ? 'scheduled' : 'draft',
          attempts: 0,
          mediaId: null,
          permalink: null,
          error: null,
          createdAt: stamp,
          updatedAt: stamp,
        };
        await write([created, ...(await read())]);
        return created;
      });
    },

    update(postId, patch) {
      return inTurn(async () => {
        const posts = await read();
        const current = posts.find((post) => post.id === postId);
        if (!current) throw new Error('That post is no longer in your drafts');
        const next: QueuedPost = { ...current, ...patch, id: current.id, updatedAt: now().toISOString() };
        await write(posts.map((post) => (post.id === postId ? next : post)));
        return next;
      });
    },

    remove(postId) {
      return inTurn(async () => {
        const posts = await read();
        await write(posts.filter((post) => post.id !== postId));
      });
    },
  };
}
