/**
 * What the admin routes answer with.
 *
 * Every shape here is the proxy's, not Chatfuel's: the panel makes no GraphQL
 * call of its own. `/chatfuel/admin/*` is the whole surface, and it exists
 * because these questions are asked with the master token and have to be asked
 * on the server — see the vendored proxy's adminRoutes for why the fences do
 * not apply to them.
 */

export interface AdminAccount {
  id: string;
  name: string;
  email: string | null;
}

export interface AdminBotRef {
  id: string;
  title: string;
}

export interface AdminWorkspaceRef {
  id: string;
  title: string;
  botsLimit: number;
  bots: AdminBotRef[];
}

export interface AdminOverview {
  account: AdminAccount;
  /** The workspace this deployment is about, when it names one. */
  homeWorkspaceId: string | null;
  workspaces: AdminWorkspaceRef[];
  /** What this deployment can offer — decided by the server, not guessed here. */
  capabilities: { access: boolean };
}

export interface AdminPerson {
  id: string;
  name: string;
  /** Chatfuel's word for an account that has been deleted; its other fields are empty. */
  isUnknown: boolean;
}

export interface AdminTeamMember {
  id: string;
  role: { roleTypeV2: string };
  user: AdminPerson;
}

/** Null for a workspace that has never been through checkout. */
export interface AdminSubscription {
  id: string;
  status: string;
  isOnTrialPeriod: boolean;
}

/**
 * The people on a workspace are missing on purpose: `Workspace.members` answers
 * `InternalServerError` and is non-nullable,
 * so asking for it loses the whole workspace. The people on a BOT are in
 * `AdminBotDetail.members` and come back fine.
 */
export interface AdminWorkspaceDetail extends AdminWorkspaceRef {
  subscription: AdminSubscription | null;
}

/** A connected channel. `__typename` is the only thing the interface exposes beyond an id. */
export interface AdminChannel {
  __typename: string;
  id: string;
}

export interface AdminBotDetail {
  id: string;
  title: string;
  createdAt: string | null;
  isReady: boolean;
  countryCode: string | null;
  timezone: string | null;
  industry: { category: string; subCategory: string | null } | null;
  workspace: { id: string; title: string } | null;
  contactScopes: AdminChannel[];
  members: AdminTeamMember[];
  /** `botPermissions` is a list of objects — an object and an action each, never a plain string. */
  role: { roleTypeV2: string; botPermissions: { object: string; action: string }[] } | null;
}

export interface AdminHealth {
  upstream: string;
  tokenEnv: string;
  token: { present: boolean; accepted: boolean };
  account: AdminAccount | null;
  fence: { kind: string; ok: boolean; bots: number | null };
  authMode: string;
  adminMode: string;
  homeWorkspaceId: string | null;
  supabase: { configured: boolean; serviceRole: boolean; reachable: boolean | null };
  publishingQueue: boolean;
  /**
   * Whether the queue can actually fire: a callback address is on file and the
   * secret behind it matches this deployment's. Null when there is no queue
   * here, or when the database could not be asked.
   */
  scheduling: boolean | null;
  egress: string;
  problems: string[];
}

export interface AdminTenantMember {
  userId: string;
  role: string;
  email: string | null;
  name: string | null;
  joinedAt: string;
}

export interface AdminTenantBot {
  slotId: string;
  /** Null while the bot is still being created. */
  botId: string | null;
  name: string;
  createdAt: string;
  /** Ids of people holding an explicit grant. Owners and admins are never listed. */
  granted: string[];
}

/**
 * A bot the panel created before anyone said whose it is. It sits in no
 * workspace, so it appears in no tenant's `bots` — the first grant is what
 * settles where it belongs.
 */
export interface AdminUnassignedBot {
  slotId: string;
  botId: string;
  name: string;
  createdAt: string;
}

export interface AdminTenant {
  id: string;
  name: string;
  createdAt: string;
  members: AdminTenantMember[];
  bots: AdminTenantBot[];
}
