import { useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { Navigate } from '../types';
import { AuthContext, type AuthActions, type AuthContextValue } from './AuthContext';
import { authReducer, INITIAL_AUTH_STATE } from './lib/authState';
import { currentPath, invitePending } from './lib/authRoutes';
import { fetchMembership, settleMembership, type MembershipFetchContext } from './lib/membershipFetch';
import { provisionMessage } from './lib/provisionMessage';
import { isSessionLapse } from './lib/sessionLapse';
import { createSingleFlight, type SingleFlight } from './lib/singleFlight';
import type { AuthAdapter, AuthUser, Membership } from './types';
import type { SessionLostBus } from './runtime';
import { clearDeviceCaches } from '../shellApi';

export interface AuthProviderProps {
  adapter: AuthAdapter;
  navigate: Navigate;
  /** The runtime's "proxy rejected the session" channel. */
  sessionLost: SessionLostBus;
  /** The deployment's name, for the auth screens' brand line. */
  appName: string;
  /** The deployment's mark, beside that name. Absent = the shield fallback. */
  appLogo?: string;
  /** Publishes the resolved workspace to the runtime, which is where the shell reads its bot id. */
  onWorkspace?: (membership: Membership | null) => void;
  children: ReactNode;
}

/**
 * One provisioning call per (adapter, account).
 *
 * Signing up reaches the route from two directions — the SIGNED_IN handler's
 * membership fetch and SignUpPage's own await — within milliseconds and in
 * either order. Two calls are two attempts to create the same account's first
 * bot on the deployment's Chatfuel plan; the second joins the first here.
 *
 * Keyed by USER, not by adapter alone: a sign-out and sign-in as somebody else
 * while a run is going would otherwise hand the second person the first one's
 * workspace. The epoch cannot catch that — the value would be wrong, not
 * merely late.
 */
const PROVISIONING = new WeakMap<AuthAdapter, SingleFlight<Membership>>();

function provisionOnce(adapter: AuthAdapter, userId: string): Promise<Membership> {
  let flight = PROVISIONING.get(adapter);
  if (!flight) {
    flight = createSingleFlight<Membership>();
    PROVISIONING.set(adapter, flight);
  }
  return flight.run(userId, () => adapter.provisionWorkspace());
}

/**
 * Drives the auth state machine from the adapter. Renders the provider ONLY —
 * consumers live below (validator pass 10b: the component rendering
 * <AuthContext.Provider> never calls useAuth itself).
 *
 * The workspace is fetched per signed-in user, and an account with nothing it
 * can open is PROVISIONED one on the spot — that is what signing up means
 * here: the server creates a Chatfuel bot for them. `needsProvision` owns when.
 * Every fetch is epoch-tagged, so a reply for a user who signed out meanwhile
 * is dropped by the reducer — which is exactly why the provisioning paths must
 * not bump the epoch behind each other's back; see `actions.provision`.
 */
export function AuthProvider({
  adapter,
  navigate,
  sessionLost,
  appName,
  appLogo,
  onWorkspace,
  children,
}: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, INITIAL_AUTH_STATE);
  const epochRef = useRef(0);
  const userRef = useRef<AuthUser | null>(null);

  /**
   * A provision that failed, and the account it failed for.
   *
   * Every reload, every new tab and every `refetchMembership` would otherwise
   * ask again, and an attempt is not free: a `workspaceCreateBot` that times
   * out after Chatfuel executed it leaves a bot nobody can reach, billed to
   * the deployment. So one automatic attempt per account, and after that the
   * remembered reason is shown until somebody asks again on purpose.
   */
  const blockedRef = useRef<{ userId: string; message?: string } | null>(null);

  /**
   * The key both provisioning paths must agree on. SignUpPage can call
   * `provision()` before SIGNED_IN has landed, so `userRef` may still be
   * empty; the adapter holds the session either way.
   */
  const provisionKey = async (): Promise<string> =>
    userRef.current?.id ?? (await adapter.getSession().catch(() => null))?.user.id ?? '';

  /* Everything lib/membershipFetch.ts needs and cannot reach on its own. */
  const membershipCtx: MembershipFetchContext = {
    myMembership: () => adapter.myMembership(),
    provisionFor: (userId) => provisionOnce(adapter, userId),
    accountId: provisionKey,
    currentEpoch: () => epochRef.current,
    /* Read per fetch, never captured: the SIGNED_IN handler is subscribed once
       and the address bar changes under it. */
    invitePending: () => invitePending(),
    dispatch,
    onWorkspace,
    blocked: {
      read: () => blockedRef.current,
      write: (next) => {
        blockedRef.current = next;
      },
    },
  };

  const startMembershipFetch = (epoch: number, options?: { provision?: boolean }) => {
    void fetchMembership(membershipCtx, epoch, options);
  };

  useEffect(() => {
    let disposed = false;
    const off = adapter.onAuthStateChange((event, session) => {
      if (disposed) return;
      if (event === 'TOKEN_REFRESHED') return;
      if (event === 'USER_UPDATED' && session) {
        userRef.current = session.user;
        dispatch({ type: 'userUpdated', user: session.user });
        return;
      }
      if (event === 'PASSWORD_RECOVERY' && session) {
        userRef.current = session.user;
        const epoch = ++epochRef.current;
        dispatch({ type: 'session', user: session.user, epoch });
        startMembershipFetch(epoch, { provision: true });
        navigate('/reset-password', { replace: true });
        return;
      }
      if (!session) {
        userRef.current = null;
        blockedRef.current = null;
        epochRef.current += 1;
        dispatch({ type: 'session', user: null, epoch: epochRef.current });
        return;
      }
      const sameUser = userRef.current?.id === session.user.id;
      userRef.current = session.user;
      if (sameUser) {
        dispatch({ type: 'session', user: session.user, epoch: epochRef.current });
        return;
      }
      const epoch = ++epochRef.current;
      dispatch({ type: 'session', user: session.user, epoch });
      startMembershipFetch(epoch, { provision: true });
    });
    return () => {
      disposed = true;
      off();
    };
    // adapter/navigate are stable per runtime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // The proxy said 401/403 → if that really is a lapse (see isSessionLapse),
  // try a refresh, and when that yields nothing sign out and send the user to
  // sign-in with a way back.
  useEffect(
    () =>
      sessionLost.subscribe((err) => {
        if (!isSessionLapse(err, userRef.current !== null)) return;
        void (async () => {
          const refreshed = await adapter.refreshSession().catch(() => null);
          if (refreshed) return;
          clearDeviceCaches();
          await adapter.signOut().catch(() => undefined);
          userRef.current = null;
          epochRef.current += 1;
          dispatch({ type: 'signedOut', reason: 'expired' });
          const here = currentPath();
          const params = new URLSearchParams({ reason: 'expired' });
          if (here.startsWith('/') && !here.startsWith('/sign-')) params.set('returnTo', here);
          navigate(`/sign-in?${params.toString()}`, { replace: true });
        })();
      }),
    [adapter, navigate, sessionLost],
  );

  const actions = useMemo<AuthActions>(
    () => ({
      signIn: (email, password) => adapter.signInWithPassword(email, password),
      signUp: (input) => adapter.signUp(input),
      signOut: () => adapter.signOut(),
      /** Asked for on purpose: the sign-up screen, and /no-access's retry. */
      provision: async () => {
        /*
         * No new epoch, and no re-read afterwards.
         *
         * The epoch exists to drop a reply for a user who is no longer signed
         * in. This call is the CURRENT user's, and the fetch SIGNED_IN started
         * is very likely awaiting the same promise. Bumping it here is what
         * made a real failure unreportable: that fetch's `membershipFailed`
         * arrived under the old number and the reducer dropped it, leaving the
         * app on a workspace nobody had written and no error anywhere. The
         * membership this resolves to is also the answer — asking the database
         * for it again only reopens the window the bug lived in.
         */
        const epoch = epochRef.current;
        const userId = await provisionKey();
        blockedRef.current = null;
        dispatch({ type: 'provisioning', epoch });
        try {
          const membership = await provisionOnce(adapter, userId);
          settleMembership(membershipCtx, epoch, membership);
          return membership;
        } catch (err) {
          blockedRef.current = { userId, message: provisionMessage(err) };
          dispatch({ type: 'membershipFailed', epoch, message: provisionMessage(err) });
          throw err; // The screen that asked prints the sentence itself.
        }
      },
      acceptInvite: async (token) => {
        const m = await adapter.acceptInvite(token);
        const epoch = ++epochRef.current;
        dispatch({ type: 'refetchMembership', epoch });
        // An invited person joins the inviter's workspace and gets no bot of
        // their own — provisioning here would be asking for one.
        startMembershipFetch(epoch, { provision: false });
        return m;
      },
      /*
       * Re-read, and by default nothing more. Most callers are refreshing a
       * ROLE — Team after a transfer, or after somebody leaves — and the one
       * that leaves is the reason this may not provision on its own: leaving a
       * workspace makes `myMembership` null, and a provision there would open
       * a brand-new tenant and put a brand-new bot on the deployment's plan
       * for somebody who just walked out. Only /no-access's retry asks.
       */
      refetchMembership: ({ provision = false }: { provision?: boolean } = {}) => {
        if (provision) blockedRef.current = null;
        const epoch = ++epochRef.current;
        dispatch({ type: 'refetchMembership', epoch });
        startMembershipFetch(epoch, { provision });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adapter],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ state, adapter, actions, navigate, appName, appLogo }),
    [state, adapter, actions, navigate, appName, appLogo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
