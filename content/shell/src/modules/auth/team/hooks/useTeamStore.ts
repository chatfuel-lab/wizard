/**
 * The Team page's data layer: the reducer in ../lib/teamStore plus the adapter
 * calls that feed it.
 *
 * Shape copied from bookings/hooks/useSettingsStore — the epoch lives in the
 * state, a `reset` bumps it, and the load effect keyed on it drops any reply
 * that arrives for an older epoch (StrictMode's double mount, a Refresh
 * pressed twice, a reload racing a mutation).
 *
 * It fires no toasts and reads no context: it is called by `TeamPage`, which
 * is also the component rendering `<TeamContext.Provider>` and `<ToastProvider>`
 * (pass 10b — a hook that consumed either would run before they exist). The
 * components below decide what to say; this decides what is true.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { inviteUrl } from '../../lib/authRoutes';
import type {
  AssignableRole,
  AuthAdapter,
  AuthUser,
  CreateInviteInput,
  Membership,
  Role,
  TeamInvite,
} from '../../types';
import { messageForError } from '../../lib/copy';
import { initialTeamState, memberById, roleOf, teamReducer, type TeamState } from '../lib/teamStore';

export interface TeamStoreValue {
  state: TeamState;
  /** The signed-in user (the "You" row, the invite author, the leave target). */
  me: AuthUser;
  /**
   * The actor's role as the TABLE knows it. After a transfer the auth
   * provider's membership is a fetch behind, and the danger zone has to flip
   * on the same commit as the rows.
   */
  actorRole: Role;
  refresh(): void;
  /** Optimistic: the row flips now and rolls back if the RPC refuses (which then throws). */
  changeRole(userId: string, role: AssignableRole): Promise<void>;
  /**
   * The Undo runner. Re-reads the store at RUN time: if the member is gone, or
   * the role moved again since the toast appeared, it does nothing and says so
   * — a compensating write fired from a stale closure is how a row ends up in
   * a state nobody asked for.
   */
  undoRoleChange(userId: string, previous: AssignableRole, applied: AssignableRole): Promise<'done' | 'noop'>;
  removeMember(userId: string): Promise<void>;
  /** Another bot in this workspace. The server creates it in Chatfuel first. */
  createBot(name: string): Promise<void>;
  renameBot(botRowId: string, name: string): Promise<void>;
  deleteBot(botRowId: string): Promise<void>;
  /** Open or close one bot for one member. Owners and admins need neither. */
  setBotAccess(botRowId: string, userId: string, granted: boolean): Promise<void>;
  createInvite(input: CreateInviteInput): Promise<{ invite: TeamInvite; url: string }>;
  revokeInvite(inviteId: string): Promise<void>;
  transferOwnership(userId: string): Promise<void>;
  leaveTenant(): Promise<void>;
  /** Absent when the deployment cannot issue reset links — the row menu hides the action. */
  recoveryLink: ((email: string) => Promise<void>) | null;
}

interface UseTeamStoreInput {
  adapter: AuthAdapter;
  membership: Membership;
  me: AuthUser;
  /**
   * The bots of this workspace changed. The shell reads them from the
   * MEMBERSHIP, not from this store, so without telling it the topbar keeps
   * the old set until a reload — and the empty state's own advice ("open Team
   * and add one") appears not to work.
   */
  onBotsChanged?: () => void;
}

export function useTeamStore({ adapter, membership, me, onBotsChanged }: UseTeamStoreInput): TeamStoreValue {
  const [state, dispatch] = useReducer(teamReducer, undefined, initialTeamState);

  /* The undo runner and every rollback read the CURRENT state, not the one
   * their closure was built with. */
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (state.epoch === 0) return;
    let cancelled = false;
    const epoch = state.epoch;
    Promise.all([adapter.listMembers(), adapter.listInvites(), adapter.listBots()])
      .then(([members, invites, bots]) => {
        if (!cancelled) dispatch({ type: 'loaded', epoch, members, invites, bots });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: messageForError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, state.epoch]);

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [adapter]);

  const refresh = useCallback(() => dispatch({ type: 'reset' }), []);

  /* One in-flight action per row id: the row disables its own controls, and a
   * failure clears the flag on the way out however it ends. */
  const run = useCallback(async <T>(id: string, work: () => Promise<T>): Promise<T> => {
    dispatch({ type: 'busy', id });
    try {
      return await work();
    } finally {
      dispatch({ type: 'idle', id });
    }
  }, []);

  const changeRole = useCallback(
    async (userId: string, role: AssignableRole) => {
      const previous = memberById(stateRef.current, userId)?.role;
      if (previous === undefined || previous === null) return;
      dispatch({ type: 'roleChanged', userId, role });
      await run(userId, async () => {
        try {
          await adapter.changeRole(userId, role);
        } catch (err) {
          dispatch({ type: 'roleRollback', userId, role: previous });
          throw err;
        }
      });
    },
    [adapter, run],
  );

  const undoRoleChange = useCallback<TeamStoreValue['undoRoleChange']>(
    async (userId, previous, applied) => {
      const current = memberById(stateRef.current, userId);
      if (!current || current.role !== applied) return 'noop';
      await changeRole(userId, previous);
      return 'done';
    },
    [changeRole],
  );

  const removeMember = useCallback(
    (userId: string) =>
      run(userId, async () => {
        await adapter.removeMember(userId);
        dispatch({ type: 'memberRemoved', userId });
      }),
    [adapter, run],
  );

  const createInvite = useCallback(
    async (input: CreateInviteInput) => {
      const created = await adapter.createInvite(input);
      const invite: TeamInvite = {
        id: created.id,
        role: created.role,
        email: created.email,
        createdBy: me.id,
        createdByName: me.name ?? me.email,
        createdAt: new Date().toISOString(),
        expiresAt: created.expiresAt,
        status: 'pending',
        bots: input.bots,
      };
      const url = inviteUrl(created.token);
      dispatch({ type: 'inviteCreated', invite, url });
      return { invite, url };
    },
    [adapter, me.email, me.id, me.name],
  );

  const createBot = useCallback(
    (name: string) =>
      run('new-bot', async () => {
        const bot = await adapter.createBot(name);
        dispatch({
          type: 'botAdded',
          bot: { id: bot.id, botId: bot.botId, name: bot.name, createdAt: new Date().toISOString(), members: [] },
        });
        onBotsChanged?.();
      }),
    [adapter, onBotsChanged, run],
  );

  const renameBot = useCallback(
    (botRowId: string, name: string) =>
      run(botRowId, async () => {
        const bot = await adapter.renameBot(botRowId, name);
        dispatch({ type: 'botRenamed', botId: botRowId, name: bot.name });
        onBotsChanged?.();
      }),
    [adapter, onBotsChanged, run],
  );

  const deleteBot = useCallback(
    (botRowId: string) =>
      run(botRowId, async () => {
        await adapter.deleteBot(botRowId);
        dispatch({ type: 'botRemoved', botId: botRowId });
        onBotsChanged?.();
      }),
    [adapter, onBotsChanged, run],
  );

  /* Not optimistic: a grant decides what somebody can open, and a row that
     flips back a second later is worse than one that takes a moment. */
  const setBotAccess = useCallback(
    (botRowId: string, userId: string, granted: boolean) =>
      run(`${botRowId}:${userId}`, async () => {
        if (granted) await adapter.grantBot(botRowId, userId);
        else await adapter.revokeBot(botRowId, userId);
        dispatch({ type: 'botAccess', botId: botRowId, userId, granted });
      }),
    [adapter, run],
  );

  const revokeInvite = useCallback(
    (inviteId: string) =>
      run(inviteId, async () => {
        await adapter.revokeInvite(inviteId);
        dispatch({ type: 'inviteRevoked', inviteId });
      }),
    [adapter, run],
  );

  const transferOwnership = useCallback(
    (userId: string) =>
      run(userId, async () => {
        await adapter.transferOwnership(userId);
        /* Applied AND re-read: the swap keeps the page usable on this commit
         * (the danger zone flips, the menus change), the reload is the truth. */
        dispatch({ type: 'ownershipTransferred', fromUserId: me.id, toUserId: userId });
        dispatch({ type: 'reset' });
      }),
    [adapter, me.id, run],
  );

  const leaveTenant = useCallback(() => adapter.leaveTenant(), [adapter]);

  const generate = adapter.generateRecoveryLink;
  const recoveryLink = useMemo(
    () =>
      generate
        ? async (email: string) => {
            await generate(email);
          }
        : null,
    [generate],
  );

  const actorRole = roleOf(state, me.id, membership.role);

  return useMemo<TeamStoreValue>(
    () => ({
      state,
      me,
      actorRole,
      refresh,
      changeRole,
      undoRoleChange,
      removeMember,
      createBot,
      renameBot,
      deleteBot,
      setBotAccess,
      createInvite,
      revokeInvite,
      transferOwnership,
      leaveTenant,
      recoveryLink,
    }),
    [
      state,
      me,
      actorRole,
      refresh,
      changeRole,
      undoRoleChange,
      removeMember,
      createBot,
      renameBot,
      deleteBot,
      setBotAccess,
      createInvite,
      revokeInvite,
      transferOwnership,
      leaveTenant,
      recoveryLink,
    ],
  );
}
