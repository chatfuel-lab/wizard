/**
 * The real adapter: Supabase Auth for the session, and the cf_* RPCs for
 * everything tenant-shaped. Loaded as its own chunk (supabase-js is ~40 KB
 * gzipped) by runtime.tsx, which is why this file is reachable only through
 * `createSupabaseAdapter`.
 *
 * Two rules hold the whole file together:
 *
 *   * The tenant id is baked in at construction. No screen, no RPC argument
 *     and no URL ever chooses a tenant — a browser that could pick its own
 *     tenant is a browser that can shop for one.
 *   * Every failure leaves here as an `AuthAdapterError` with a code the
 *     screens can switch on. The mapping lives in ./errors.ts; nothing in this
 *     file interprets a message.
 *
 * PKCE, not implicit: the `?code=` lands in the query string where it cannot
 * be read back out of a `#` fragment, and `detectSessionInUrl` exchanges it at
 * client construction — which is why `INITIAL_SESSION` is the first truth the
 * provider ever hears, and why the reset page waits for it rather than asking.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AssignableRole,
  AuthAdapter,
  AuthErrorCode,
  AuthEvent,
  AuthSession,
  AuthUser,
  BotRef,
  CreateInviteInput,
  CreatedInvite,
  InvitePreview,
  Membership,
  Role,
  SignUpInput,
  SignUpResult,
  TeamBot,
  TeamInvite,
  TeamMember,
  TenantInfo,
} from '../types';
import { AuthAdapterError } from '../types';
import { asInviteStatus } from '../lib/invites';
import { authError, rpcError, type ErrorContext } from './errors';

export interface SupabaseAdapterConfig {
  url: string;
  anonKey: string;
}

/** The proxy route that mints an admin recovery link (mounted only with a service key). */
const RECOVERY_LINK_PATH = '/chatfuel/auth/recovery-link';
const PROVISION_PATH = '/chatfuel/auth/provision';
/** Creating, renaming and deleting a bot all need the master token, so all three are the server's. */
const BOTS_PATH = '/chatfuel/auth/bots';
const DEFAULT_INVITE_HOURS = 24 * 7;

// ---------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------

/**
 * `localStorage` is not always there to be had: a sandboxed iframe without
 * `allow-same-origin`, Safari with cookies blocked, and some embedded webviews
 * all THROW on the first access rather than returning null. supabase-js reads
 * it during construction, so an unguarded `createClient` is a white screen
 * before a single component mounts.
 *
 * Probing beats feature-detection here — the property exists in every one of
 * those cases; it is the access that fails. When it does, the session lives in
 * memory for the tab, which is a real (if short) session and not a crash.
 */
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

function resolveStorage() {
  try {
    const probe = '__chatfuel_auth_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return undefined; // supabase-js uses localStorage itself
  } catch {
    return memoryStorage();
  }
}

// ---------------------------------------------------------------------------
// row shapes (what the RPCs actually return — snake_case, all nullable)
// ---------------------------------------------------------------------------

interface SessionLike {
  access_token: string;
  expires_at?: number | null;
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  };
}

interface BotJson {
  id?: string | null;
  /** snake_case from a cf_* RPC, camelCase from the server's routes. */
  bot_id?: string | null;
  botId?: string | null;
  name?: string | null;
}
interface TenantJson {
  id?: string | null;
  name?: string | null;
  bots?: BotJson[] | null;
}
interface MembershipJson {
  role?: string | null;
  joined_at?: string | null;
  tenant?: TenantJson | null;
}
/** `cf_my_workspace` and the server's provision route answer flat, not nested. */
interface WorkspaceJson {
  tenantId?: string | null;
  tenant_id?: string | null;
  bots?: BotJson[] | null;
  name?: string | null;
  role?: string | null;
  joined_at?: string | null;
}
interface InvitePreviewJson {
  status?: string | null;
  tenant_name?: string | null;
  role?: string | null;
  inviter_name?: string | null;
  email_hint?: string | null;
  email_restricted?: boolean | null;
  expires_at?: string | null;
}
interface MemberRow {
  user_id: string;
  role: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  joined_at: string;
  bots?: string[] | null;
}
interface BotRow {
  id: string;
  bot_id?: string | null;
  name: string;
  created_at: string;
  members?: string[] | null;
}
interface InviteRow {
  id: string;
  role: string;
  email?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  expires_at: string;
  status: string;
  bot_ids?: string[] | null;
}
interface CreatedInviteJson {
  id: string;
  token: string;
  role?: string | null;
  email?: string | null;
  expires_at: string;
}

const ROLES: readonly string[] = ['owner', 'admin', 'member'];
const asRole = (value: unknown): Role =>
  typeof value === 'string' && ROLES.includes(value) ? (value as Role) : 'member';
const asAssignableRole = (value: unknown): AssignableRole => (value === 'admin' ? 'admin' : 'member');
const metaString = (meta: Record<string, unknown> | null | undefined, key: string): string | null => {
  const value = meta?.[key];
  return typeof value === 'string' && value !== '' ? value : null;
};

const INVITE_STATUSES: readonly InvitePreview['status'][] = ['valid', 'expired', 'revoked', 'accepted', 'not_found'];
const asPreviewStatus = (value: unknown): InvitePreview['status'] =>
  INVITE_STATUSES.find((s) => s === value) ?? 'not_found';

// ---------------------------------------------------------------------------
// mappers
// ---------------------------------------------------------------------------

const toUser = (user: SessionLike['user']): AuthUser => ({
  id: user.id,
  email: user.email ?? '',
  name: metaString(user.user_metadata, 'full_name'),
  avatarUrl: metaString(user.user_metadata, 'avatar_url'),
});

const toSession = (session: SessionLike | null | undefined): AuthSession | null =>
  session
    ? {
        user: toUser(session.user),
        accessToken: session.access_token,
        /* GoTrue always sends expires_at for a password session; 0 reads as
           "already expired", which is the safe way to be wrong. */
        expiresAt: session.expires_at ?? 0,
      }
    : null;

const toBotRef = (bot: BotJson): BotRef => ({
  id: bot.id ?? '',
  botId: bot.botId ?? bot.bot_id ?? null,
  name: bot.name ?? 'Bot',
});

const toBotRefs = (bots: BotJson[] | null | undefined): BotRef[] => (bots ?? []).map(toBotRef);

const toTenantInfo = (tenant: TenantJson | null | undefined): TenantInfo => ({
  id: tenant?.id ?? '',
  name: tenant?.name ?? 'Workspace',
  bots: toBotRefs(tenant?.bots),
});

const toMembership = (json: MembershipJson | null): Membership | null =>
  json && json.role
    ? {
        role: asRole(json.role),
        joinedAt: json.joined_at ?? '',
        tenant: toTenantInfo(json.tenant),
      }
    : null;

/** The flat shape, from `cf_my_workspace` (snake_case) or the server route (camelCase). */
const workspaceToMembership = (json: WorkspaceJson | null): Membership | null => {
  const id = json?.tenantId ?? json?.tenant_id ?? null;
  if (!json || !id || !json.role) return null;
  return {
    role: asRole(json.role),
    joinedAt: json.joined_at ?? '',
    tenant: { id, name: json.name ?? 'Workspace', bots: toBotRefs(json.bots) },
  };
};

/**
 * supabase-js emits one event our union does not have
 * (`MFA_CHALLENGE_VERIFIED`); the module has no MFA, and a provider that had
 * to handle "some other string" would be handling a case that cannot happen.
 * It is dropped here instead.
 */
/** The `errors[0].message` of a synthetic proxy envelope, when there is one. */
async function serverEnvelope(response: Response): Promise<{ message?: string; code?: string }> {
  const body = (await response.json().catch(() => null)) as {
    errors?: Array<{ message?: unknown; extensions?: { code?: unknown } }>;
  } | null;
  const first = body?.errors?.[0];
  const message = first?.message;
  const code = first?.extensions?.code;
  return {
    message: typeof message === 'string' && message.trim() ? message : undefined,
    code: typeof code === 'string' && code ? code : undefined,
  };
}

/**
 * The server's own code, when it says something the status cannot. A 409 means
 * two opposite things depending on the route — the workspace has no room for
 * another bot, or this is the last bot and may not go — so the code is read
 * first and the status is only the fallback.
 */
const SERVER_ENVELOPE_CODES: Readonly<Record<string, AuthErrorCode>> = {
  LastBotInWorkspace: 'LastBot',
  BotDeleteUnavailable: 'Network',
  BotAdminRequired: 'NotAllowed',
  BotNotFound: 'BotNotFound',
  BadBotName: 'BadBotName',
  WorkspaceFull: 'WorkspaceFull',
  BotRenameFailed: 'BotRenameFailed',
  BotDeleteFailed: 'BotDeleteFailed',
  // Either bot cap in `cf_new_bot` — the deployment's or this workspace's.
  // Both are the operator's to raise and neither is a passing failure.
  BotLimitReached: 'BotLimitReached',
  // Provisioning's own. All four are the operator's to fix, so they must not
  // land on `Unknown`, whose copy ("try again") is untrue for every one of them.
  ProvisionRefused: 'ProvisionUnavailable',
  ProvisionUnreachable: 'Network',
  ProxyAuthMisconfigured: 'ProvisionUnavailable',
  ProxyAuthUnavailable: 'Network',
  AuthSessionRequired: 'SessionRequired',
};

/**
 * What a server route's status means when it carried no code of its own. 409
 * and 429 are the two that are neither the caller's fault nor a passing
 * failure: the deployment's Chatfuel workspace has no room left, or a bot cap
 * in the database was reached. Neither is changed by a retry, and these routes
 * never carry the proxy's other 429 (`TenantBusy` is spent in `admitRequest`,
 * which the bot routes do not call).
 */
const SERVER_ROUTE_CODES: Readonly<Record<number, AuthErrorCode>> = {
  401: 'SessionRequired',
  403: 'NotAllowed',
  404: 'BotNotFound',
  409: 'WorkspaceFull',
  422: 'BadBotName',
  429: 'BotLimitReached',
  500: 'ProvisionUnavailable',
  502: 'Unknown',
  503: 'Network',
};

const AUTH_EVENTS: Readonly<Record<string, AuthEvent>> = {
  INITIAL_SESSION: 'INITIAL_SESSION',
  SIGNED_IN: 'SIGNED_IN',
  SIGNED_OUT: 'SIGNED_OUT',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  USER_UPDATED: 'USER_UPDATED',
  PASSWORD_RECOVERY: 'PASSWORD_RECOVERY',
};

// ---------------------------------------------------------------------------

export function createSupabaseAdapter(config: SupabaseAdapterConfig): AuthAdapter {
  const storage = resolveStorage();

  const client: SupabaseClient = createClient(config.url, config.anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      /* Per tenant: one browser can hold sessions for two deployments of the
         same agency's app without one signing the other out. */
      /* One project, one session — the workspace is discovered after signing
         in, so it cannot be part of the storage key. */
      storageKey: 'chatfuel-auth',
      ...(storage ? { storage } : {}),
    },
  });

  /* Every tenant call goes through here: one place that unwraps
     `{ data, error }`, one place that maps a refusal. */
  const rpc = async <T>(fn: string, args: Record<string, unknown>, context: ErrorContext = 'default'): Promise<T> => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw rpcError(error, context);
    return data as T;
  };

  const sessionOrThrow = (session: SessionLike | null | undefined, what: string): AuthSession => {
    const mapped = toSession(session);
    if (!mapped) throw new AuthAdapterError('SessionRequired', `${what} did not return a session`);
    return mapped;
  };

  /*
   * The workspace is not known until the session is: it is read once by
   * `myMembership` / `provisionWorkspace` and kept here, because every team RPC
   * takes a tenant id and the caller (the Team page) has no business carrying
   * one around.
   */
  let activeTenantId: string | null = null;

  /*
   * Assigned on a null too. `remember` runs inside `myMembership`, before the
   * provider's epoch guard sees the answer, so a slow read for a user who has
   * since been replaced would otherwise leave their tenant id here — and the
   * next team RPC would carry it. The server re-derives the role from
   * `auth.uid()` and refuses, so nothing leaks; what changes is the sentence
   * the person is shown, from "No workspace is open" to "Only admins can do
   * that".
   */
  const remember = (membership: Membership | null): Membership | null => {
    activeTenantId = membership?.tenant.id ?? null;
    return membership;
  };

  const membershipOrThrow = (json: MembershipJson | null): Membership => {
    const membership = remember(toMembership(json));
    if (!membership) throw new AuthAdapterError('Unknown', 'The workspace did not return a membership');
    return membership;
  };

  /**
   * One of the app's own server routes, carrying the caller's bearer. These are
   * the calls that need the master Chatfuel token, which never reaches a
   * browser; a refusal comes back as a synthetic envelope, and the status is
   * what decides the code — the sentence inside it is the server's, kept for the
   * console.
   */
  const serverRoute = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const { data } = await client.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new AuthAdapterError('SessionRequired', 'Sign in again');

    let response: Response;
    try {
      response = await fetch(path, {
        method,
        headers: {
          authorization: `Bearer ${accessToken}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      throw new AuthAdapterError('Network', 'Could not reach the server', { cause });
    }
    if (response.status === 404 || response.status === 501) {
      throw new AuthAdapterError('ProvisionUnavailable', 'This deployment cannot manage bots');
    }
    if (!response.ok) {
      const { message, code } = await serverEnvelope(response);
      const mapped =
        (code === undefined ? undefined : SERVER_ENVELOPE_CODES[code]) ??
        SERVER_ROUTE_CODES[response.status] ??
        'Unknown';
      throw new AuthAdapterError(mapped, message ?? `Request failed (${response.status})`);
    }
    return (await response.json().catch(() => null)) as T;
  };

  /** Team RPCs are only reachable from inside a workspace; the UI cannot render otherwise. */
  const tenantOrThrow = (): string => {
    if (!activeTenantId) throw new AuthAdapterError('Unknown', 'No workspace is open');
    return activeTenantId;
  };

  return {
    // ---------------------------------------------------------------- session
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw authError(error);
      return toSession(data.session);
    },

    async getAccessToken() {
      /* getSession() refreshes an expired token on the way past, so the proxy
         gate never sees one this client could have renewed. A failure here is
         "no token", not an exception: the caller is the api-client building a
         header, and a thrown error there loses the request's own error. */
      const { data, error } = await client.auth.getSession().catch(() => ({ data: { session: null }, error: null }));
      if (error) return undefined;
      return data.session?.access_token ?? undefined;
    },

    async refreshSession() {
      const { data, error } = await client.auth.refreshSession();
      /* A refresh that fails is the ordinary end of a session, not a crash —
         the provider reads null and signs out. */
      if (error) return null;
      return toSession(data.session);
    },

    onAuthStateChange(cb) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const mapped = AUTH_EVENTS[event];
        if (!mapped) return;
        cb(mapped, toSession(session as SessionLike | null));
      });
      return () => data.subscription.unsubscribe();
    },

    async signInWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw authError(error);
      return sessionOrThrow(data.session, 'Sign-in');
    },

    async signUp(input: SignUpInput): Promise<SignUpResult> {
      const name = input.name?.trim();
      const { data, error } = await client.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        /* full_name rides in user_metadata, which the cf_profiles trigger
           mirrors into the row the Team page reads. */
        options: name ? { data: { full_name: name } } : undefined,
      });
      if (error) throw authError(error);
      const session = toSession(data.session);
      /* "Confirm email" on and no session back: the account exists but cannot
         act yet. The screen shows a check-your-email state rather than
         pretending the join step can run. */
      return { session, needsEmailConfirmation: session === null };
    },

    async resetPasswordForEmail(email, redirectTo) {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw authError(error);
    },

    async verifyRecoveryToken(tokenHash) {
      const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
      if (error) throw authError(error);
      return sessionOrThrow(data.session, 'This link');
    },

    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw authError(error);
    },

    async signOut() {
      /*
       * The local half of a sign-out does not wait on the network half. Every
       * screen that calls this sends the person to /sign-in either way, so a
       * rejected call used to leave the remembered workspace and the stored
       * session in place while the app said "signed out" — and AuthRouter let
       * the next navigation straight back in. The local pass runs in `finally`
       * (scope 'local' is the storage-only one, no second request), and the
       * refusal still reaches the caller, which is what the screens report.
       */
      try {
        const { error } = await client.auth.signOut();
        if (error) throw authError(error);
      } finally {
        activeTenantId = null;
        await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }
    },

    // ---------------------------------------------------------------- workspace
    async invitePreview(token): Promise<InvitePreview> {
      const json = await rpc<InvitePreviewJson | null>('cf_invite_preview', { p_token: token }, 'invite');
      return {
        status: asPreviewStatus(json?.status),
        tenantName: json?.tenant_name ?? null,
        role: json?.role ? asRole(json.role) : null,
        inviterName: json?.inviter_name ?? null,
        emailHint: json?.email_hint ?? null,
        emailRestricted: json?.email_restricted === true,
        expiresAt: json?.expires_at ?? null,
      };
    },

    async myMembership() {
      const json = await rpc<WorkspaceJson | null>('cf_my_workspace', {});
      return remember(workspaceToMembership(json));
    },

    /**
     * The server's route, not Supabase: creating the bot needs the master
     * Chatfuel token, which never reaches a browser. Same shape as the recovery
     * link route — a same-origin POST carrying the caller's own bearer.
     */
    async provisionWorkspace(name?: string): Promise<Membership> {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new AuthAdapterError('SessionRequired', 'Sign in again to finish setting up');

      let response: Response;
      try {
        response = await fetch(PROVISION_PATH, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify(name ? { name } : {}),
        });
      } catch (cause) {
        throw new AuthAdapterError('Network', 'Could not reach the server', { cause });
      }
      if (response.status === 404 || response.status === 501) {
        throw new AuthAdapterError(
          'ProvisionUnavailable',
          'This deployment cannot create workspaces — its server has no Supabase service key',
        );
      }
      if (response.status === 401) throw new AuthAdapterError('SessionRequired', 'Sign in again to finish setting up');
      if (!response.ok) {
        /*
         * The server's own CODE first, its status second — the same order
         * `serverRoute` uses, and for a sharper reason here. Several of these
         * failures are the DEPLOYMENT's, not this person's, and no retry
         * clears them: a full Chatfuel workspace, a workspace id the token
         * cannot write to, a token Chatfuel refused. Read by status alone,
         * every one of the last two arrives as a 502 → `Unknown` → "Something
         * went wrong. Try again." — and `provisionMessage` then puts NOTHING
         * on /no-access, because Unknown is not an operator code. The person
         * whose sign-up silently failed saw exactly that. The server's own
         * sentence is kept on the error for the console; the UI wording comes
         * from copy.ts.
         */
        const { message, code } = await serverEnvelope(response);
        const mapped =
          (code === undefined ? undefined : SERVER_ENVELOPE_CODES[code]) ??
          SERVER_ROUTE_CODES[response.status] ??
          'Unknown';
        throw new AuthAdapterError(mapped, message ?? `Setting up your workspace failed (${response.status})`);
      }

      const body = (await response.json().catch(() => null)) as WorkspaceJson | null;
      const membership = remember(workspaceToMembership(body));
      if (!membership) throw new AuthAdapterError('Unknown', 'The server returned no workspace');
      return membership;
    },

    async acceptInvite(token) {
      const json = await rpc<MembershipJson | null>('cf_accept_invite', { p_token: token }, 'invite');
      return membershipOrThrow(json);
    },

    // ---------------------------------------------------------------- bots
    async createBot(name): Promise<BotRef> {
      const json = await serverRoute<BotJson>('POST', BOTS_PATH, { name });
      return toBotRef(json);
    },

    async renameBot(botRowId, name): Promise<BotRef> {
      const json = await serverRoute<BotJson>('PATCH', `${BOTS_PATH}/${encodeURIComponent(botRowId)}`, { name });
      return toBotRef(json);
    },

    async deleteBot(botRowId) {
      await serverRoute<BotJson>('DELETE', `${BOTS_PATH}/${encodeURIComponent(botRowId)}`);
    },

    async listBots(): Promise<TeamBot[]> {
      const rows = await rpc<BotRow[] | null>('cf_list_bots', { p_tenant_id: tenantOrThrow() });
      return (rows ?? []).map((row) => ({
        id: row.id,
        botId: row.bot_id ?? null,
        name: row.name,
        createdAt: row.created_at,
        members: row.members ?? [],
      }));
    },

    async grantBot(botRowId, userId) {
      await rpc<null>('cf_grant_bot', { p_slot: botRowId, p_user_id: userId });
    },

    async revokeBot(botRowId, userId) {
      await rpc<null>('cf_revoke_bot', { p_slot: botRowId, p_user_id: userId });
    },

    // ---------------------------------------------------------------- team
    async listMembers(): Promise<TeamMember[]> {
      const rows = await rpc<MemberRow[] | null>('cf_list_members', { p_tenant_id: tenantOrThrow() });
      return (rows ?? []).map((row) => ({
        userId: row.user_id,
        email: row.email ?? null,
        name: row.full_name ?? null,
        avatarUrl: row.avatar_url ?? null,
        role: asRole(row.role),
        joinedAt: row.joined_at,
        bots: row.bots ?? [],
      }));
    },

    async listInvites(): Promise<TeamInvite[]> {
      const rows = await rpc<InviteRow[] | null>('cf_list_invites', { p_tenant_id: tenantOrThrow() });
      return (rows ?? []).map((row) => ({
        id: row.id,
        role: asAssignableRole(row.role),
        email: row.email ?? null,
        createdBy: row.created_by ?? null,
        createdByName: row.created_by_name ?? null,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        status: asInviteStatus(row.status),
        bots: row.bot_ids ?? [],
      }));
    },

    async createInvite(input: CreateInviteInput): Promise<CreatedInvite> {
      const hours = input.expiresInHours ?? DEFAULT_INVITE_HOURS;
      const json = await rpc<CreatedInviteJson>('cf_create_invite', {
        p_tenant_id: tenantOrThrow(),
        p_role: input.role,
        p_email: input.email,
        /* p_expires_in is an interval; PostgREST casts the string. Hours keep
           "never" out of the vocabulary — the RPC caps at 30 days either way. */
        p_expires_in: `${hours} hours`,
        p_bots: input.bots,
      });
      return {
        id: json.id,
        token: json.token,
        role: asAssignableRole(json.role),
        email: json.email ?? null,
        expiresAt: json.expires_at,
      };
    },

    async revokeInvite(inviteId) {
      await rpc<null>('cf_revoke_invite', { p_invite_id: inviteId });
    },

    async changeRole(userId, role) {
      await rpc<null>('cf_change_member_role', { p_tenant_id: tenantOrThrow(), p_user_id: userId, p_role: role });
    },

    async removeMember(userId) {
      await rpc<null>('cf_remove_member', { p_tenant_id: tenantOrThrow(), p_user_id: userId });
    },

    async transferOwnership(userId) {
      await rpc<null>('cf_transfer_ownership', { p_tenant_id: tenantOrThrow(), p_new_owner: userId });
    },

    async leaveTenant() {
      await rpc<null>('cf_leave_tenant', { p_tenant_id: tenantOrThrow() });
    },

    /**
     * Admin-issued reset link. Not Supabase: the service-role key that can mint
     * one must never reach a browser, so the proxy owns the route and this is
     * an ordinary same-origin POST with the caller's own bearer token. A
     * deployment without `SUPABASE_SERVICE_ROLE_KEY` never mounts it, and the
     * 404 that comes back is the feature being off, not a failure.
     */
    async generateRecoveryLink(email: string): Promise<{ delivered: 'server-log' }> {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new AuthAdapterError('SessionRequired', 'Sign in again to issue a reset link');

      let response: Response;
      try {
        response = await fetch(RECOVERY_LINK_PATH, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
      } catch (cause) {
        throw new AuthAdapterError('Network', 'Could not reach the server', { cause });
      }

      if (response.status === 404 || response.status === 501) {
        throw new AuthAdapterError('NotAllowed', 'Password reset links are not enabled on this deployment');
      }
      if (response.status === 401) throw new AuthAdapterError('SessionRequired', 'Sign in again to issue a reset link');
      if (response.status === 403) {
        // The database writes one of three refusals here — not a member, ranks
        // at or above you, or stands in another workspace too — and "only
        // admins" is the wrong answer to two of them.
        const { message } = await serverEnvelope(response);
        throw new AuthAdapterError('NotAllowed', message ?? 'Only admins can issue a reset link');
      }
      if (!response.ok) throw new AuthAdapterError('Unknown', `Reset link failed (${response.status})`);

      return { delivered: 'server-log' };
    },
  };
}
