import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { initialPostsState, postsReducer, type PostsState } from '../lib/postsStore';
import { createProxyBackend, probeQueueRoutes } from '../lib/queue/proxy';
import { createUserStorageBackend } from '../lib/queue/userStorage';
import type { QueueBackend } from '../lib/queue/types';
import { errorMessage } from '../lib/errors';
import type { ApiClient, NewPost, QueuedPost } from '../types';

export interface PostsStore {
  state: PostsState;
  /** Null while the backend is still being chosen. */
  backend: QueueBackend | null;
  /** False until a backend exists, and false forever on the local one. */
  canSchedule: boolean;
  refresh: () => void;
  save: (post: NewPost) => Promise<QueuedPost>;
  patch: (id: string, patch: Partial<QueuedPost>) => Promise<QueuedPost>;
  remove: (id: string) => Promise<void>;
  /** For the publish path, which drives the store directly. */
  dispatch: (action: Parameters<typeof postsReducer>[1]) => void;
}

/**
 * The queue, whichever store this deployment turned out to have.
 *
 * The choice is made by asking, once, rather than by looking at what modules
 * were installed. `proxyFetch` says whether there is a proxy in front of the app
 * at all; its `/publishing/config` route answers 404 in a deployment scaffolded
 * without the database half. A module that instead read `installedModules` would
 * be guessing at a server's shape from a client's manifest, and would be wrong
 * the first time somebody deployed the two halves separately.
 *
 * A 404 falls back to the local queue and is not an error. Anything else IS an
 * error and is shown: falling back silently from a broken server would hide a
 * schedule that quietly never fires behind a list of drafts that look fine.
 */
export function usePostsStore(client: ApiClient, botId: string, refreshToken = 0): PostsStore {
  const [state, dispatch] = useReducer(postsReducer, undefined, initialPostsState);
  const [backend, setBackend] = useState<QueueBackend | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const epoch = useRef(state.epoch);
  epoch.current = state.epoch;

  /* Choosing the store is its own effect, and it runs once per bot: a
     re-render, a refresh or a failed load must not re-ask the server which
     store it has. */
  useEffect(() => {
    let live = true;
    setBackend(null);
    setProbeError(null);
    const local = () => createUserStorageBackend(client, botId);
    const choose = async (): Promise<QueueBackend> => {
      if (!client.proxyFetch) return local();
      const config = await probeQueueRoutes(client.proxyFetch);
      if (!config) return local();
      return createProxyBackend(client.proxyFetch, botId, config.scheduling);
    };
    choose()
      .then((chosen) => {
        if (live) setBackend(chosen);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setProbeError(errorMessage(err));
        setBackend(local());
      });
    return () => {
      live = false;
    };
  }, [client, botId]);

  useEffect(() => {
    if (!backend) return;
    dispatch({ type: 'reset' });
  }, [backend, refreshToken]);

  useEffect(() => {
    if (!backend || !state.loading) return;
    let live = true;
    const issued = state.epoch;
    backend
      .list()
      .then((posts) => {
        if (live) dispatch({ type: 'loaded', epoch: issued, posts });
      })
      .catch((err: unknown) => {
        if (live) dispatch({ type: 'failed', epoch: issued, message: errorMessage(err) });
      });
    return () => {
      live = false;
    };
  }, [backend, state.loading, state.epoch]);

  const refresh = useCallback(() => dispatch({ type: 'reset' }), []);

  const save = useCallback(
    async (post: NewPost) => {
      if (!backend) throw new Error('The queue is still starting up');
      const created = await backend.create(post);
      dispatch({ type: 'upserted', post: created });
      return created;
    },
    [backend],
  );

  const patch = useCallback(
    async (id: string, next: Partial<QueuedPost>) => {
      if (!backend) throw new Error('The queue is still starting up');
      const updated = await backend.update(id, next);
      dispatch({ type: 'upserted', post: updated });
      return updated;
    },
    [backend],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!backend) throw new Error('The queue is still starting up');
      await backend.remove(id);
      dispatch({ type: 'removed', id });
    },
    [backend],
  );

  const withProbe = useMemo(
    () => (probeError && !state.error ? { ...state, error: probeError } : state),
    [state, probeError],
  );

  return {
    state: withProbe,
    backend,
    canSchedule: backend?.canSchedule ?? false,
    refresh,
    save,
    patch,
    remove,
    dispatch,
  };
}
