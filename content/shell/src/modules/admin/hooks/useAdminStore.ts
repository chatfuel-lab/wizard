/**
 * The wiring between the reducer and the admin routes.
 *
 * Everything that talks to the server lives here, so `lib/adminStore.ts` stays
 * a pure function of what came back. The store is created once per mount and
 * handed down through `AdminContext`; nothing in this file reads that context,
 * because the component that provides it may not consume it.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ModuleClient } from '~api';
import {
  createBot as createBotCall,
  deleteBot as deleteBotCall,
  fetchBot,
  fetchHealth,
  fetchOverview,
  fetchTenants,
  fetchWorkspace,
  grantBot as grantBotCall,
  lock as lockCall,
  probeSession,
  registerScheduler as registerSchedulerCall,
  renameBot as renameBotCall,
  revokeBot as revokeBotCall,
  unlock as unlockCall,
} from '../lib/adminApi';
import { errorMessage } from '../lib/adminErrors';
import { adminReducer, initialAdminState, type AdminState } from '../lib/adminStore';

export interface AdminStore {
  state: AdminState;
  /** Try a password. Throws the server's refusal so the form can show it. */
  unlock(password: string): Promise<void>;
  lock(): Promise<void>;
  refresh(): void;
  /** Fetch on demand and cache; a second call for the same id is free. */
  openWorkspace(id: string): void;
  openBot(id: string): void;
  loadHealth(): void;
  loadTenants(): void;
  createBot(input: { workspaceId: string; name: string; tenantId?: string | null }): Promise<void>;
  renameBot(botId: string, name: string): Promise<void>;
  deleteBot(botId: string, force?: boolean): Promise<void>;
  grantBot(botId: string, userId: string, tenantId?: string): Promise<void>;
  revokeBot(botId: string, userId: string): Promise<void>;
  /** Point the publish queue's timer here. Throws the server's refusal. */
  registerScheduler(): Promise<void>;
}

/** The busy id for the one action that belongs to the deployment, not to a row. */
export const SCHEDULER_BUSY_ID = 'scheduler';

export function useAdminStore(client: ModuleClient): AdminStore {
  const [state, dispatch] = useReducer(adminReducer, undefined, initialAdminState);
  /* Read inside callbacks that must not be re-made on every state change — a
     new `openBot` each render would restart the effect that calls it. */
  const latest = useRef(state);
  latest.current = state;

  /* The boot probe. A reload with a live cookie must land on the panel, not on
     a password form that then disappears. */
  useEffect(() => {
    let cancelled = false;
    void probeSession(client).then((session) => {
      if (!cancelled) dispatch({ type: 'session', session });
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const load = useCallback(() => {
    dispatch({ type: 'load' });
    const epoch = latest.current.epoch + 1;
    void fetchOverview(client).then(
      (overview) => dispatch({ type: 'loaded', overview, epoch }),
      (err: unknown) => dispatch({ type: 'failed', error: errorMessage(err), epoch }),
    );
  }, [client]);

  /* The account is asked for once the door is open, and again whenever what is
     behind it changes. */
  useEffect(() => {
    if (state.session === 'unlocked' && !state.overview && !state.loading && !state.error) load();
  }, [state.session, state.overview, state.loading, state.error, load]);

  const unlock = useCallback(
    async (password: string) => {
      await unlockCall(client, password);
      dispatch({ type: 'session', session: 'unlocked' });
    },
    [client],
  );

  /* The cookie goes whether or not the server answered: a lock that left the
     panel open because the network blinked is the wrong way round. */
  const lock = useCallback(async () => {
    try {
      await lockCall(client);
    } finally {
      dispatch({ type: 'locked' });
    }
  }, [client]);

  const openWorkspace = useCallback(
    (id: string) => {
      if (latest.current.workspaces[id]) return;
      void fetchWorkspace(client, id).then(
        (detail) => dispatch({ type: 'workspace', detail }),
        () => undefined,
      );
    },
    [client],
  );

  const openBot = useCallback(
    (id: string) => {
      if (latest.current.bots[id]) return;
      void fetchBot(client, id).then(
        (detail) => dispatch({ type: 'bot', detail }),
        () => undefined,
      );
    },
    [client],
  );

  const loadHealth = useCallback(() => {
    void fetchHealth(client).then(
      (health) => dispatch({ type: 'health', health }),
      () => undefined,
    );
  }, [client]);

  const loadTenants = useCallback(() => {
    void fetchTenants(client).then(
      (answer) => dispatch({ type: 'tenants', tenants: answer.tenants, unassigned: answer.unassigned }),
      () => undefined,
    );
  }, [client]);

  const createBot = useCallback(
    async (input: { workspaceId: string; name: string; tenantId?: string | null }) => {
      const created = await createBotCall(client, input);
      dispatch({
        type: 'botAdded',
        workspaceId: created.workspaceId,
        bot: { id: created.id, title: created.title },
      });
      /* A new bot changes who can reach what, and the access view is drawn from
         a separate answer that does not know yet. Also when no workspace was
         named: that bot is exactly the one the access view has to offer. */
      loadTenants();
    },
    [client, loadTenants],
  );

  const renameBot = useCallback(
    async (botId: string, name: string) => {
      dispatch({ type: 'busy', id: botId, busy: true });
      try {
        await renameBotCall(client, botId, name);
        dispatch({ type: 'botRenamed', botId, title: name });
      } finally {
        dispatch({ type: 'busy', id: botId, busy: false });
      }
    },
    [client],
  );

  const deleteBot = useCallback(
    async (botId: string, force = false) => {
      dispatch({ type: 'busy', id: botId, busy: true });
      try {
        await deleteBotCall(client, botId, force);
        dispatch({ type: 'botRemoved', botId });
      } finally {
        dispatch({ type: 'busy', id: botId, busy: false });
      }
    },
    [client],
  );

  /* Both re-read the tenants rather than editing the answer in place: a grant
     changes one array inside a tree the panel does not otherwise own, and the
     call that returns it is cheap. */
  const grantBot = useCallback(
    async (botId: string, userId: string, tenantId?: string) => {
      await grantBotCall(client, botId, userId, tenantId);
      loadTenants();
    },
    [client, loadTenants],
  );

  const revokeBot = useCallback(
    async (botId: string, userId: string) => {
      await revokeBotCall(client, botId, userId);
      loadTenants();
    },
    [client, loadTenants],
  );

  /* Re-reads health rather than trusting the answer: registering is a write to
     a row this panel does not otherwise own, and `scheduling` is computed from
     it together with a secret only the server can compare. */
  const registerScheduler = useCallback(async () => {
    dispatch({ type: 'busy', id: SCHEDULER_BUSY_ID, busy: true });
    try {
      await registerSchedulerCall(client);
      loadHealth();
    } finally {
      dispatch({ type: 'busy', id: SCHEDULER_BUSY_ID, busy: false });
    }
  }, [client, loadHealth]);

  return useMemo(
    () => ({
      state,
      unlock,
      lock,
      refresh: load,
      openWorkspace,
      openBot,
      loadHealth,
      loadTenants,
      createBot,
      renameBot,
      deleteBot,
      grantBot,
      revokeBot,
      registerScheduler,
    }),
    [
      state,
      unlock,
      lock,
      load,
      openWorkspace,
      openBot,
      loadHealth,
      loadTenants,
      createBot,
      renameBot,
      deleteBot,
      grantBot,
      revokeBot,
      registerScheduler,
    ],
  );
}
