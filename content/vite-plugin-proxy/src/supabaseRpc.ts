/**
 * The PostgREST layer: the proxy's three ways of calling a cf_* function, the
 * row shapes they answer with, and how a refusal the database wrote becomes a
 * response the browser can read.
 */
import type { ProxyContext } from './context.js';

/**
 * The machine codes the cf_* functions raise, as codes this proxy answers with.
 * PostgREST carries ours in `hint` (the sqlstate only decides the status), so a
 * refusal the database wrote reaches the browser saying the same thing it said.
 */
const RPC_REFUSAL_CODES: Readonly<Record<string, string>> = {
  unauthenticated: 'AuthSessionRequired',
  not_admin: 'BotAdminRequired',
  tenant_not_found: 'BotWorkspaceMissing',
  tenant_ambiguous: 'BotWorkspaceAmbiguous',
  bot_not_found: 'BotNotFound',
  bad_name: 'BadBotName',
  name_too_long: 'BadBotName',
  member_not_found: 'MemberNotFound',
  bot_already_attached: 'BotAlreadyAttached',
  bot_still_upstream: 'BotStillUpstream',
  bad_bot_id: 'BadBotId',
  deployment_bot_cap: 'BotLimitReached',
  workspace_bot_cap: 'BotLimitReached',
  // The publish queue's own refusals.
  post_not_found: 'PostNotFound',
  not_claimed: 'PostNotClaimed',
  bad_secret: 'NotAllowed',
  bad_kind: 'BadPost',
  bad_media: 'BadPost',
  bad_patch: 'BadPost',
  bad_status: 'BadPost',
  bad_time: 'BadPost',
  bad_url: 'BadPost',
  insecure_url: 'BadPost',
  bad_permalink: 'BadPost',
  caption_too_long: 'CaptionTooLong',
  // The recovery-link route's own refusals, all raised by cf_recovery_authorize.
  not_member: 'RecoveryTargetNotMember',
  rank: 'NotEnoughPermissions',
  cross_tenant: 'RecoveryTargetCrossTenant',
};

/**
 * What a refusal says when the database did not write it. Every cf_* function
 * raises sqlstate PT4xx with its machine code in HINT (the header comment of
 * each module's supabase/migrations/0001_<module>.sql says so, and every
 * `raise` in them carries one), so a 4xx whose hint is not one of the codes
 * above was written by PostgREST itself — a constraint violation, a bad cast,
 * a missing function — and its message names tables, columns and constraints
 * this deployment does not publish.
 */
const UNAUTHORED_REFUSAL_MESSAGE = 'That is not allowed';

export interface CallerBot {
  /** The row id in the database — what the app addresses a bot by. */
  id: string;
  /** The Chatfuel bot id, null while this one is still being created. */
  botId: string | null;
  name: string;
}

export interface CallerWorkspace {
  tenantId: string;
  name: string;
  role: string;
  bots: CallerBot[];
}

/**
 * A PostgREST RPC as the CALLER (their JWT), so the database enforces the rules
 * again.
 *
 * `jwt` is required, and deliberately not `string | undefined` with a fallback
 * to the anon key. That fallback made a missing token silently downgrade the
 * call to `rpcAsAnon` — the same function, run as nobody, where `auth.uid()` is
 * null and every rule written in terms of it decides something else. A route
 * that means to call as nobody says so.
 */
export async function rpcAsCaller(ctx: ProxyContext, name: string, body: unknown, jwt: string): Promise<Response> {
  const auth = ctx.config.auth!;
  return ctx.supabaseFetch(`${auth.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: auth.anonKey,
      authorization: `Bearer ${jwt}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
}

export const asBot = (value: unknown): CallerBot | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string') return null;
  return {
    id: row.id,
    botId: typeof row.bot_id === 'string' ? row.bot_id : null,
    name: typeof row.name === 'string' ? row.name : '',
  };
};

export const asWorkspace = (value: unknown): CallerWorkspace | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.tenant_id !== 'string' || typeof row.role !== 'string') return null;
  return {
    tenantId: row.tenant_id,
    name: typeof row.name === 'string' ? row.name : '',
    role: row.role,
    bots: Array.isArray(row.bots) ? row.bots.map(asBot).filter((b): b is CallerBot => b !== null) : [],
  };
};

/**
 * A PostgREST RPC as NOBODY (the anon key in both places) — for the functions
 * that authenticate the caller themselves, by a shared secret in their own
 * arguments rather than by a session.
 */
export async function rpcAsAnon(ctx: ProxyContext, name: string, body: unknown): Promise<Response> {
  const auth = ctx.config.auth!;
  return ctx.supabaseFetch(`${auth.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: auth.anonKey,
      authorization: `Bearer ${auth.anonKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
}

/** A PostgREST RPC as the SERVER (the service-role key) — the two steps a browser must not take. */
export async function rpcAsService(ctx: ProxyContext, name: string, body: unknown): Promise<Response> {
  const auth = ctx.config.auth!;
  return ctx.supabaseFetch(`${auth.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: auth.serviceRoleKey!,
      authorization: `Bearer ${auth.serviceRoleKey!}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
}

/**
 * A refusal the DATABASE wrote, or null when this was not one. Anything a
 * caller could fix — not an admin, no such bot, an empty name — belongs to
 * them and is passed on; a 5xx is the deployment's and stays a 503.
 */
export async function rpcRefusal(
  response: Response,
  fallbackCode = 'BotRequestRefused',
): Promise<{ ok: false; status: number; code: string; message: string } | null> {
  if (response.status < 400 || response.status >= 500) return null;
  let body: { message?: unknown; hint?: unknown } | null;
  try {
    body = (await response.json()) as { message?: unknown; hint?: unknown };
  } catch {
    return null;
  }
  const hint = typeof body?.hint === 'string' && body.hint ? body.hint : null;
  // Object.hasOwn rather than a bare lookup: `hint` is upstream input, and the
  // inherited members of a plain object ('constructor', 'toString') are not
  // codes this proxy answers with.
  const authored = hint !== null && Object.hasOwn(RPC_REFUSAL_CODES, hint);
  const authoredMessage = typeof body?.message === 'string' && body.message ? body.message : null;
  return {
    ok: false,
    status: response.status,
    code: authored ? RPC_REFUSAL_CODES[hint] : fallbackCode,
    // Only the refusals this deployment wrote speak for themselves.
    message: (authored && authoredMessage) || UNAUTHORED_REFUSAL_MESSAGE,
  };
}

/** The caller's workspace, or null when they have none yet; 'unavailable' when Supabase did not answer. */
export async function callerWorkspace(ctx: ProxyContext, jwt: string): Promise<CallerWorkspace | null | 'unavailable'> {
  try {
    const response = await rpcAsCaller(ctx, 'cf_my_workspace', {}, jwt);
    if (response.status !== 200) return 'unavailable';
    return asWorkspace(await response.json());
  } catch {
    return 'unavailable';
  }
}
