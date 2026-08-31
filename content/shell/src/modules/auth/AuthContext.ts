import { createContext, useContext } from 'react';
import type { Navigate } from '../types';
import type { AuthAdapter, Membership, SignUpInput, SignUpResult, AuthSession } from './types';
import type { AuthState } from './lib/authState';

export interface AuthActions {
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
  /**
   * Called right after a sign-up: the server gives this account a workspace
   * with a bot of its own. Idempotent, and a no-op for somebody who arrived
   * through an invite.
   */
  provision(): Promise<Membership>;
  acceptInvite(token: string): Promise<Membership>;
  /**
   * Re-run the membership fetch for the current user (after accept / join /
   * transfer / leave). `provision: true` is the deliberate ask — the retry on
   * /no-access — and is the only way an automatic refresh creates anything.
   */
  refetchMembership(options?: { provision?: boolean }): void;
}

export interface AuthContextValue {
  state: AuthState;
  adapter: AuthAdapter;
  actions: AuthActions;
  navigate: Navigate;
  /** The deployment's name, for the auth screens' brand line. */
  appName: string;
  /** The deployment's mark, beside that name. Absent = the shield fallback. */
  appLogo?: string;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
