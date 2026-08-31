/**
 * Everything a Supabase deployment can refuse with, mapped onto the module's
 * own `AuthErrorCode`. Pure and node-testable — the adapter is a thin shell
 * around these tables, which is the half that is worth a test.
 *
 * Three sources, three tables:
 *
 *   1. The cf_* RPCs raise `sqlstate 'PT4xx'` with a machine code in HINT
 *      (see modules/auth/supabase/migrations/0001_auth.sql). PostgREST hands
 *      that back as `{ code: 'PT403', message, hint: 'not_admin', details }`.
 *      The HINT is the contract; the sqlstate only decides the HTTP status.
 *   2. GoTrue answers with an `AuthApiError`-shaped object: a stable
 *      `code` ('invalid_credentials'), an HTTP `status`, and a message.
 *      supabase-js does not re-export the class, so this matches structurally
 *      rather than with instanceof — which is also what makes it testable.
 *   3. Neither: fetch failed, PostgREST itself objected (PGRST…), or something
 *      unforeseen. Network gets its own code; the rest is 'Unknown' WITH THE
 *      ORIGINAL MESSAGE preserved, because that string is the only clue a
 *      support conversation will have.
 */
import { AuthAdapterError, type AuthErrorCode } from '../types';

/**
 * Which call raised it. One hint is genuinely ambiguous: 'email_mismatch' is
 * `email_mismatch` now has one meaning — "this invite is for someone else"
 * (cf_accept_invite) — but the context stays a parameter because the SQL is
 * free to reuse a hint and the call site is the only one who knows.
 */
export type ErrorContext = 'invite' | 'default';

/** PostgREST `hint` → code. The keys are the SQL's, verbatim. */
export const HINT_CODES: Readonly<Record<string, AuthErrorCode>> = {
  unauthenticated: 'SessionRequired',
  tenant_not_found: 'TenantNotFound',
  invite_not_found: 'InviteInvalid',
  invite_revoked: 'InviteRevoked',
  invite_accepted: 'InviteUsed',
  invite_expired: 'InviteExpired',
  not_admin: 'NotAllowed',
  not_owner: 'NotOwner',
  member_not_found: 'MemberNotFound',
  is_owner: 'IsOwner',
  owner_cannot_leave: 'OwnerCannotLeave',
  self_target: 'SelfTarget',
  bad_role: 'BadRole',
  /* The target is not below the caller: an admin acting on a fellow admin. The
     Team page never offers it, so this is the server having the last word. */
  rank: 'NotAllowed',
  bad_expiry: 'BadExpiry',
};

/** GoTrue `error.code` → code. */
export const AUTH_API_CODES: Readonly<Record<string, AuthErrorCode>> = {
  invalid_credentials: 'InvalidCredentials',
  email_not_confirmed: 'EmailNotConfirmed',
  user_already_exists: 'UserExists',
  email_exists: 'UserExists',
  weak_password: 'WeakPassword',
  over_request_rate_limit: 'RateLimited',
  over_email_send_rate_limit: 'RateLimited',
  /* The project itself has sign-ups switched off in the Supabase dashboard —
     the app never asks for that, so it reads as a misconfiguration. */
  signup_disabled: 'Unknown',
  email_address_not_authorized: 'Unknown',
  /* A recovery / confirmation link that GoTrue will no longer honour. There is
     one "this link is dead" code in the union and both the reset page and the
     invite page render their own sentence over it anyway. */
  otp_expired: 'InviteExpired',
  session_not_found: 'SessionRequired',
  session_expired: 'SessionRequired',
  refresh_token_not_found: 'SessionRequired',
  bad_jwt: 'SessionRequired',
  no_authorization: 'SessionRequired',
  user_not_found: 'MemberNotFound',
};

/** PostgREST's own codes (not ours) that still mean something specific. */
const POSTGREST_CODES: Readonly<Record<string, AuthErrorCode>> = {
  PGRST301: 'SessionRequired', // JWT expired / invalid
  '42501': 'NotAllowed', // insufficient_privilege
};

/** The shape both PostgrestError and AuthError satisfy; neither class is imported. */
interface ErrorLike {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  hint?: unknown;
  status?: unknown;
  details?: unknown;
}

const asErrorLike = (error: unknown): ErrorLike =>
  typeof error === 'object' && error !== null ? (error as ErrorLike) : {};

const str = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

/* supabase-js never throws a typed "offline" error from PostgREST: a failed
   fetch comes back as `{ message: 'TypeError: Failed to fetch', code: '' }`.
   GoTrue does slightly better and names the class. Both are covered here, and
   so is the bare TypeError a hand-written fetch() rejects with. */
const NETWORK_MESSAGES =
  /failed to fetch|networkerror|network request failed|load failed|fetch failed|econnrefused|err_network/i;

export function isNetworkFailure(error: unknown): boolean {
  const e = asErrorLike(error);
  const name = str(e.name);
  if (name === 'AuthRetryableFetchError' || name === 'TypeError') return true;
  const message = str(e.message);
  return message !== null && NETWORK_MESSAGES.test(message);
}

export const codeForHint = (hint: string | null, context: ErrorContext = 'default'): AuthErrorCode | null => {
  if (hint === null) return null;
  if (hint === 'email_mismatch') return context === 'invite' ? 'InviteEmailMismatch' : 'NotAllowed';
  return HINT_CODES[hint] ?? null;
};

/**
 * A cf_* RPC refused. `hint` first (it is the contract), then PostgREST's own
 * code, then the transport, then 'Unknown' with the message kept.
 */
export function rpcError(error: unknown, context: ErrorContext = 'default'): AuthAdapterError {
  if (error instanceof AuthAdapterError) return error;
  const e = asErrorLike(error);
  const message = str(e.message) ?? 'Request failed';

  const byHint = codeForHint(str(e.hint), context);
  if (byHint) return new AuthAdapterError(byHint, message, { cause: error });

  const pgCode = str(e.code);
  if (pgCode !== null && pgCode in POSTGREST_CODES) {
    return new AuthAdapterError(POSTGREST_CODES[pgCode]!, message, { cause: error });
  }
  if (isNetworkFailure(error)) return new AuthAdapterError('Network', message, { cause: error });
  if (e.status === 401) return new AuthAdapterError('SessionRequired', message, { cause: error });
  if (e.status === 429) return new AuthAdapterError('RateLimited', message, { cause: error });
  return new AuthAdapterError('Unknown', message, { cause: error });
}

/** GoTrue refused (sign-in, sign-up, reset, verify, update). */
export function authError(error: unknown): AuthAdapterError {
  if (error instanceof AuthAdapterError) return error;
  const e = asErrorLike(error);
  const message = str(e.message) ?? 'Request failed';

  const code = str(e.code);
  if (code !== null && code in AUTH_API_CODES) {
    return new AuthAdapterError(AUTH_API_CODES[code]!, message, { cause: error });
  }
  if (isNetworkFailure(error)) return new AuthAdapterError('Network', message, { cause: error });
  /* 429 has carried the rate limit since before GoTrue had error codes, and
     still arrives without one from the older self-hosted builds. */
  if (e.status === 429) return new AuthAdapterError('RateLimited', message, { cause: error });
  if (e.status === 401 || e.status === 403) return new AuthAdapterError('SessionRequired', message, { cause: error });
  return new AuthAdapterError('Unknown', message, { cause: error });
}

/** Last resort for a `catch` that could have caught either kind. */
export function toAuthAdapterError(error: unknown, context: ErrorContext = 'default'): AuthAdapterError {
  if (error instanceof AuthAdapterError) return error;
  const e = asErrorLike(error);
  return str(e.hint) !== null ? rpcError(error, context) : authError(error);
}
