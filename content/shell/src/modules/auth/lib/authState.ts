/**
 * The auth state machine — pure, tested. `AuthProvider` drives it from the
 * adapter's events and its own membership fetches; every async result carries
 * the epoch it was started under so a stale reply cannot overwrite a newer
 * state (StrictMode double effects, sign-out during a fetch, …).
 */
import type { AuthUser, Membership } from '../types';

type SignedOutReason = 'initial' | 'signedOut' | 'expired';

export type AuthState =
  | { kind: 'loading' }
  | { kind: 'signedOut'; reason: SignedOutReason }
  | {
      kind: 'signedIn';
      user: AuthUser;
      epoch: number;
      membership: Membership | null;
      /**
       * `provisioning` is the gap between the account existing and its bot
       * existing: the server is creating one. `none` means the deployment
       * cannot provision at all (no server route), which is a misconfiguration
       * rather than a state a user can act on.
       */
      membershipStatus: 'loading' | 'provisioning' | 'ready' | 'none' | 'error';
      /**
       * Why it failed, when the server said something the person can act on —
       * a full Chatfuel workspace is the one that never resolves itself, so
       * "try again in a moment" would be a lie.
       */
      membershipError?: string;
    };

export type AuthAction =
  | { type: 'session'; user: AuthUser | null; epoch: number }
  | { type: 'membership'; epoch: number; membership: Membership | null }
  | { type: 'provisioning'; epoch: number }
  | { type: 'membershipFailed'; epoch: number; message?: string }
  | { type: 'signedOut'; reason: Exclude<SignedOutReason, 'initial'> }
  | { type: 'userUpdated'; user: AuthUser }
  | { type: 'refetchMembership'; epoch: number };

export const INITIAL_AUTH_STATE: AuthState = { kind: 'loading' };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'session': {
      if (!action.user) {
        // A null INITIAL_SESSION on first load is 'initial'; a later null is a sign-out.
        return { kind: 'signedOut', reason: state.kind === 'loading' ? 'initial' : 'signedOut' };
      }
      if (state.kind === 'signedIn' && state.user.id === action.user.id) {
        // Same user (token refresh, re-emit): keep membership, bump nothing.
        return { ...state, user: action.user };
      }
      return {
        kind: 'signedIn',
        user: action.user,
        epoch: action.epoch,
        membership: null,
        membershipStatus: 'loading',
      };
    }
    case 'membership':
      if (state.kind !== 'signedIn' || state.epoch !== action.epoch) return state;
      return {
        ...state,
        membership: action.membership,
        membershipStatus: action.membership ? 'ready' : 'none',
        membershipError: undefined,
      };
    case 'provisioning':
      if (state.kind !== 'signedIn' || state.epoch !== action.epoch) return state;
      return { ...state, membershipStatus: 'provisioning', membershipError: undefined };
    case 'membershipFailed':
      if (state.kind !== 'signedIn' || state.epoch !== action.epoch) return state;
      return { ...state, membershipStatus: 'error', membershipError: action.message };
    /*
     * The one action that ASSIGNS the epoch rather than being checked against
     * it — guarding it would be a tautology. So it may only ever wrap a fetch
     * that has not started yet. Wrapping a value already resolved, or a call
     * whose own reply is still on its way, invalidates that reply: it arrives
     * under the old number and is dropped here, silently. That is precisely
     * how a failed sign-up once left the app on a workspace with no bot and no
     * error anywhere.
     */
    case 'refetchMembership':
      if (state.kind !== 'signedIn') return state;
      return { ...state, epoch: action.epoch, membershipStatus: 'loading', membershipError: undefined };
    case 'signedOut':
      return { kind: 'signedOut', reason: action.reason };
    case 'userUpdated':
      if (state.kind !== 'signedIn') return state;
      return { ...state, user: action.user };
    default:
      return state;
  }
}

/** Selectors */
export const isMember = (s: AuthState): boolean => s.kind === 'signedIn' && s.membership !== null;
export const roleOf = (s: AuthState) => (s.kind === 'signedIn' ? (s.membership?.role ?? null) : null);
export const canManageTeam = (s: AuthState): boolean => {
  const r = roleOf(s);
  return r === 'owner' || r === 'admin';
};
