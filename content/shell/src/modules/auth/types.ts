/**
 * The auth module's own contract: what an "auth adapter" is (Supabase) and
 * the shapes the screens and the Team page consume. Everything tenant-scoped takes the tenant from
 * the adapter — the browser never picks a tenant.
 *
 * Errors: adapters throw `AuthAdapterError` with a stable `code`; screens map
 * codes to copy in lib/copy.ts. The Supabase adapter derives codes from the
 * RPC's PostgREST hint (see modules/auth/supabase/migrations/0001_auth.sql)
 * and from `AuthApiError.code`.
 */

export type Role = 'owner' | 'admin' | 'member';
export type AssignableRole = Exclude<Role, 'owner'>;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  /** Unix seconds. */
  expiresAt: number;
}

/** One bot of a workspace, as this account sees it. */
export interface BotRef {
  /** The row id — what the app names a bot by when it asks to rename or delete it. */
  id: string;
  /**
   * The Chatfuel bot. Null for the seconds between the row existing and the
   * server having created the bot, which is when the app shows "setting up".
   */
  botId: string | null;
  name: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  /**
   * The bots this person may open, oldest first — every bot of the workspace for
   * an owner or admin, the granted ones for a member. Empty while the first is
   * being created, or after the last one was deleted.
   */
  bots: BotRef[];
}

export interface Membership {
  role: Role;
  joinedAt: string;
  tenant: TenantInfo;
}

export interface TeamMember {
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  joinedAt: string;
  /**
   * The bots granted to this person, by row id. Empty for an owner or admin,
   * who reach every bot without a grant — `role` is what says which it is.
   */
  bots: string[];
}

/** A bot as the team page sees it: the workspace's, not only the caller's. */
export interface TeamBot {
  id: string;
  botId: string | null;
  name: string;
  createdAt: string;
  /** The members granted this bot, by user id. Owners and admins are never listed. */
  members: string[];
}

export type InviteStatus = 'pending' | 'expired' | 'revoked' | 'accepted';

export interface TeamInvite {
  id: string;
  role: AssignableRole;
  /** Restricted to this address; null = anyone with the link. */
  email: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  expiresAt: string;
  status: InviteStatus;
  /** The bots this invite grants when it is accepted, by row id. */
  bots: string[];
}

/** The raw token is returned exactly once, at creation. */
export interface CreatedInvite {
  id: string;
  token: string;
  role: AssignableRole;
  email: string | null;
  expiresAt: string;
}

export interface InvitePreview {
  status: 'valid' | 'expired' | 'revoked' | 'accepted' | 'not_found';
  tenantName: string | null;
  role: Role | null;
  inviterName: string | null;
  /** Masked ("j***@corp.com") when the invite is email-restricted. */
  emailHint: string | null;
  emailRestricted: boolean;
  expiresAt: string | null;
}

export type AuthEvent =
  'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY';

export type AuthErrorCode =
  // Supabase Auth
  | 'InvalidCredentials'
  | 'EmailNotConfirmed'
  | 'UserExists'
  | 'WeakPassword'
  | 'RateLimited'
  | 'SessionRequired'
  // cf_* RPC hints
  | 'TenantNotFound'
  | 'InviteInvalid'
  | 'InviteExpired'
  | 'InviteRevoked'
  | 'InviteUsed'
  | 'InviteEmailMismatch'
  | 'NotAllowed'
  // provisioning (the server route, not Supabase)
  | 'WorkspaceFull'
  | 'ProvisionUnavailable'
  | 'NotOwner'
  | 'MemberNotFound'
  | 'IsOwner'
  | 'OwnerCannotLeave'
  | 'SelfTarget'
  | 'BadRole'
  | 'BadExpiry'
  // bots (the server's routes)
  | 'BotNotFound'
  | 'BadBotName'
  | 'BotRenameFailed'
  | 'BotDeleteFailed'
  | 'LastBot'
  | 'BotLimitReached'
  // transport
  | 'Network'
  | 'Unknown';

export class AuthAdapterError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code, options);
    this.name = 'AuthAdapterError';
    this.code = code;
  }
}

export const isAuthError = (err: unknown, code?: AuthErrorCode): err is AuthAdapterError =>
  err instanceof AuthAdapterError && (code === undefined || err.code === code);

export interface SignUpInput {
  email: string;
  password: string;
  name?: string;
}

export interface SignUpResult {
  session: AuthSession | null;
  /** Supabase "Confirm email" is on and no session came back. */
  needsEmailConfirmation: boolean;
}

export interface CreateInviteInput {
  role: AssignableRole;
  email: string | null;
  /** null = the adapter's default (7 days); the RPC caps at 30 days. */
  expiresInHours: number | null;
  /** Bots the invited person arrives with, by row id. Ignored for an admin, who gets all. */
  bots: string[];
}

export interface AuthAdapter {
  // ---- session
  getSession(): Promise<AuthSession | null>;
  /** The bearer value for the proxy gate; adapters refresh transparently. */
  getAccessToken(): Promise<string | undefined>;
  refreshSession(): Promise<AuthSession | null>;
  /** Fires INITIAL_SESSION once (possibly async), then every change. Returns unsubscribe. */
  onAuthStateChange(cb: (event: AuthEvent, session: AuthSession | null) => void): () => void;
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  resetPasswordForEmail(email: string, redirectTo: string): Promise<void>;
  /** Exchange a recovery `token_hash` (email template / admin link) for a session. */
  verifyRecoveryToken(tokenHash: string): Promise<AuthSession>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;

  // ---- workspace (anon-callable)
  invitePreview(token: string): Promise<InvitePreview>;

  // ---- workspace (authenticated)
  /** The caller's workspace, or null when they have none yet. */
  myMembership(): Promise<Membership | null>;
  /**
   * The second half of signing up, run by the app's SERVER: this account gets a
   * workspace with a first Chatfuel bot of its own, created with the deployment's
   * master token. Idempotent — somebody who already has a workspace holding a
   * bot they can OPEN (their own, or one they were invited into) gets it back
   * and nothing is created. A workspace holding only a reservation does not
   * count: the route joins the run that owns it instead of starting a second.
   */
  provisionWorkspace(name?: string): Promise<Membership>;
  acceptInvite(token: string): Promise<Membership>;

  // ---- bots (the server's routes: creating one needs the master token)
  /** Another bot in this workspace. Admins and owners only; the database enforces it. */
  createBot(name: string): Promise<BotRef>;
  /** Renames it here and in Chatfuel, or neither. */
  renameBot(botRowId: string, name: string): Promise<BotRef>;
  /**
   * Deletes it in Chatfuel and here. NOT the workspace's last one: an account
   * with nothing openable is the state provisioning exists to end, so walking
   * into it deliberately would have the app quietly buy another bot on the
   * deployment's plan. The server refuses with `LastBot`.
   */
  deleteBot(botRowId: string): Promise<void>;
  /** Every bot of the workspace with who was granted it (admin+), for the team page. */
  listBots(): Promise<TeamBot[]>;
  grantBot(botRowId: string, userId: string): Promise<void>;
  revokeBot(botRowId: string, userId: string): Promise<void>;

  // ---- team (admin/owner; the RPCs enforce)
  listMembers(): Promise<TeamMember[]>;
  listInvites(): Promise<TeamInvite[]>;
  createInvite(input: CreateInviteInput): Promise<CreatedInvite>;
  revokeInvite(inviteId: string): Promise<void>;
  changeRole(userId: string, role: AssignableRole): Promise<void>;
  removeMember(userId: string): Promise<void>;
  transferOwnership(userId: string): Promise<void>;
  leaveTenant(): Promise<void>;
  /**
   * Admin-issued password reset link (proxy route, needs SUPABASE_SERVICE_ROLE_KEY
   * on the server). Absent when the deployment cannot do it — the UI hides the action.
   */
  generateRecoveryLink?(email: string): Promise<{ delivered: 'server-log' }>;
}
