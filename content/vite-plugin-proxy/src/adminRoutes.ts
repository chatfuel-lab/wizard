/**
 * The admin panel's routes: the account behind the master token, as the person
 * who owns that token is allowed to see and change it.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT DO, and why it is the only one:
 * it never calls admitRequest, never consults the auth gate, and never applies
 * the workspace fence. Those exist to keep a request away from bots that are
 * not the caller's — and this panel's entire purpose is the account-wide view
 * they are built to withhold. `requireAdmin` (adminSession.ts) is the whole
 * authorization: a signed cookie minted from ADMIN_PASSWORD, which lives beside
 * CHATFUEL_TOKEN in the server-only half of .env. Whoever can read that file
 * already has the token, so the panel grants nothing the credential did not.
 *
 * Everything upstream goes through `upstreamGraphql` with the master token,
 * written inline the way botRoutes.ts writes its mutations: these operations
 * are the server's, never the browser's, so they are not in any
 * operations.graphql and codegen knows nothing about them.
 *
 * Where the auth module is installed, the two systems are kept in step exactly
 * as botRoutes.ts keeps them — reserve the row before creating the bot, rename
 * the database first, delete Chatfuel first — because getting that order wrong
 * leaves one side holding a bot the other has forgotten.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBodyCapped, refuseOversizedBody, send405, sendJson, sendSyntheticEnvelope } from './envelope.js';
import { graphqlErrorCodes } from './queryAnalysis.js';
import { MISCONFIGURED_MESSAGE } from './proxyConfig.js';
import { upstreamGraphql } from './upstream.js';
import { deleteBotUpstream, renameBotUpstream } from './botRoutes.js';
import { instagramScheduling } from './publishing.js';
import { describeEgress } from './egress.js';
import { rpcAsService, rpcRefusal } from './supabaseRpc.js';
import {
  ADMIN_ATTEMPT_DELAY_MS,
  ADMIN_BAD_PASSWORD_MESSAGE,
  ADMIN_MISCONFIGURED_MESSAGE,
  ADMIN_THROTTLED_MESSAGE,
  MAX_WAIT_MS,
  SHARED_MAX_WAIT_MS,
  clearAdminCookie,
  passwordMatches,
  requireAdmin,
  setAdminCookie,
  sleep,
  throttleKey,
} from './adminSession.js';
import type { ProxyContext } from './context.js';

/** The one deletion that is refused outright, however it is asked for. */
export const ADMIN_HOME_WORKSPACE_MESSAGE =
  'This is the last bot in the workspace this app is built on — deleting it would take the workspace with it and break the app for everybody';

/** The one that is refused until it is asked for again on purpose. */
export const ADMIN_WORKSPACE_GOES_MESSAGE =
  'This is the last bot in its workspace, and Chatfuel deletes a workspace when its last bot goes';

const BOT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_NAME_LENGTH = 120;

/* -------------------------------------------------------------------------- */
/* Upstream operations                                                        */
/* -------------------------------------------------------------------------- */

const OVERVIEW_QUERY = `query CfAdminOverview {
  currentUser {
    id
    name
    email
    workspaces { id title botsLimit bots { id title } }
  }
}`;

/*
 * `members` is deliberately NOT selected, and this is not an oversight to be
 * tidied up later. It is not a field this panel can rely on, and because
 * `Workspace.members` is non-nullable, a failure on that one field turns the
 * whole answer into `data: null` and the panel loses the workspace it was
 * drawing. The people on a BOT come back fine and are what the bot panel
 * shows.
 */
const WORKSPACE_QUERY = `query CfAdminWorkspace($workspaceID: WorkspaceID!) {
  currentUser {
    id
    workspace(id: $workspaceID) {
      id
      title
      botsLimit
      bots { id title }
    }
  }
}`;

/**
 * Billing, asked for on its own and allowed to fail.
 *
 * `subscription` is not in the schema copy this repo ships — the refresh keeps
 * billing out of it, because a scaffolded app has no business reading
 * somebody's plan. The panel is the case that rule was not written for: the
 * reader here is the account owner looking at their own workspace. It is still
 * a field the shipped schema cannot vouch for, so it is
 * a SEPARATE query whose failure costs nothing — the workspace panel must not
 * go dark because a billing field moved.
 */
const BILLING_QUERY = `query CfAdminWorkspaceBilling($workspaceID: WorkspaceID!) {
  currentUser {
    id
    workspace(id: $workspaceID) { id subscription { id status isOnTrialPeriod } }
  }
}`;

/* `apiToken` is deliberately never selected: it opens the bot's public API, and
   a panel that prints it turns one secret on a screen into another. */
const BOT_QUERY = `query CfAdminBot($botID: BotID!) {
  bot(id: $botID) {
    id
    title
    createdAt
    isReady
    countryCode
    timezone
    industry { category subCategory }
    workspace { id title }
    contactScopes { __typename id }
    members { id role { roleTypeV2 } user { id name isUnknown } }
  }
  currentUser { id botRole(botID: $botID) { roleTypeV2 botPermissions { object action } } }
}`;

const CREATE_BOT_MUTATION = `mutation CfAdminCreateBot($workspaceID: WorkspaceID!, $title: String!) {
  workspaceCreateBot(workspaceID: $workspaceID, initialTitle: $title) { id title }
}`;

const PING_QUERY = 'query CfAdminPing { currentUser { id name email } }';

/* -------------------------------------------------------------------------- */
/* Small shared pieces                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Every body this panel accepts is a handful of short fields — a password, a
 * name, a pair of ids. The ceiling matters because /session is reached BEFORE
 * any credential is checked: without it an unauthenticated caller can make the
 * proxy buffer a body of their choosing, and the throttle only starts counting
 * after the first three attempts. Anything above this is not one of ours.
 */
const ADMIN_BODY_MAX_BYTES = 64 * 1024;

/**
 * And the ceiling for the one route that answers before any credential has
 * been shown. A login is two short fields; 64 KiB of buffer per connection is
 * a thing a caller who has proved nothing should not be able to ask for.
 */
const ADMIN_SESSION_BODY_MAX_BYTES = 4 * 1024;

/**
 * null when the body passed the ceiling — the caller answers 413 and stops.
 * Anything else unreadable becomes an empty body: the route's own field checks
 * are the ones that know which field was missing.
 */
const jsonBody = async (req: IncomingMessage, max = ADMIN_BODY_MAX_BYTES): Promise<Record<string, unknown> | null> => {
  const body = await readJsonBodyCapped(req, max);
  if (body.tooLarge) return null;
  return body.value && typeof body.value === 'object' ? (body.value as Record<string, unknown>) : {};
};

/** The panel names its own refusal: its ceiling is not the passthrough's. */
const sendAdminBodyTooLarge = (req: IncomingMessage, res: ServerResponse): void =>
  refuseOversizedBody(req, res, 'AdminBodyTooLarge');

const trimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text && text.length <= MAX_NAME_LENGTH ? text : undefined;
};

const queryOf = (req: IncomingMessage): URLSearchParams => {
  const i = req.url?.indexOf('?') ?? -1;
  return new URLSearchParams(i >= 0 ? req.url!.slice(i + 1) : '');
};

/** `data` when the answer carries some, otherwise null — errors included. */
function dataOf<T>(payload: unknown): T | null {
  const body = payload as { data?: T } | null;
  return body && typeof body === 'object' && body.data ? body.data : null;
}

const method = (req: IncomingMessage): string => (req.method ?? 'GET').toUpperCase();

const upstreamRefused = (res: ServerResponse): void => {
  sendSyntheticEnvelope(res, 502, 'Chatfuel did not answer this request', 'AdminUpstreamFailed');
};

/** Every workspace the token's account holds, with its bots. Null when Chatfuel could not be asked. */
interface AccountWorkspace {
  id: string;
  title: string;
  botsLimit: number;
  bots: { id: string; title: string }[];
}

async function accountWorkspaces(ctx: ProxyContext): Promise<AccountWorkspace[] | null> {
  let payload: unknown;
  try {
    payload = await upstreamGraphql(ctx, OVERVIEW_QUERY);
  } catch {
    return null;
  }
  const data = dataOf<{ currentUser?: { workspaces?: unknown } }>(payload);
  const workspaces = data?.currentUser?.workspaces;
  if (!Array.isArray(workspaces)) return null;
  return workspaces.flatMap((raw) => {
    const w = raw as { id?: unknown; title?: unknown; botsLimit?: unknown; bots?: unknown };
    if (typeof w.id !== 'string') return [];
    const bots = Array.isArray(w.bots)
      ? w.bots.flatMap((entry) => {
          const b = entry as { id?: unknown; title?: unknown };
          return typeof b.id === 'string' ? [{ id: b.id, title: typeof b.title === 'string' ? b.title : '' }] : [];
        })
      : [];
    return [
      {
        id: w.id,
        title: typeof w.title === 'string' ? w.title : '',
        botsLimit: typeof w.botsLimit === 'number' ? w.botsLimit : 0,
        bots,
      },
    ];
  });
}

/* -------------------------------------------------------------------------- */
/* The database half (auth module installed)                                  */
/* -------------------------------------------------------------------------- */

/** True when there is a Supabase project with a service-role key to talk to. */
const hasDatabase = (ctx: ProxyContext): boolean =>
  ctx.config.authMode === 'on' && Boolean(ctx.config.auth?.serviceRoleKey);

/**
 * A service-role RPC whose failure is not the caller's problem to solve.
 *
 * Bookkeeping calls that run AFTER Chatfuel has already been changed use this:
 * by then the answer is decided, and a database that did not respond must not
 * turn a completed create or delete into an error the operator would retry.
 * The mismatch is visible in the panel on the next load, which is where it can
 * actually be acted on.
 */
async function rpcQuietly(ctx: ProxyContext, name: string, body: unknown): Promise<unknown> {
  if (!hasDatabase(ctx)) return null;
  try {
    const response = await rpcAsService(ctx, name, body);
    if (response.status !== 200) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* /session                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * How long this caller must wait according to the counter every instance
 * shares — zero where there is no database, and zero where the caller has
 * nothing against them.
 *
 * `ctx.adminThrottle` lives in one process's memory, which is the whole of the
 * throttle on a server that stays up and none of it on a host that answers
 * each request from a fresh instance. On such a host the shared counter is the
 * throttle, so a deployment without a database behind it has none worth the
 * name: give the proxy its Supabase service role, or keep the admin routes off
 * a stateless host. The memory one is read first, for free; the shared one is a
 * service-role RPC, and it is only worth the round trip when the memory one
 * has nothing against this caller — a caller memory already refuses gets its
 * 429 from memory alone, so a burst of guesses against an instance already
 * holding a wait cannot turn into a burst of RPCs against the database.
 *
 * The other way to make a guess expensive — deriving the key on a wrong
 * password so the two paths cost the same — is deliberately not taken. It
 * turns an unauthenticated route into scrypt on demand, billed to whoever owns
 * the deployment, and trading a timing leak for a denial of service somebody
 * else pays for is a bad trade.
 */
async function sharedWait(ctx: ProxyContext, key: string): Promise<number> {
  const value = await rpcQuietly(ctx, 'cf_admin_attempt_wait', { p_key: key });
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The only admin route that is reached before the session check, because it is
 * the one that hands sessions out — and only POST needs that. GET and DELETE
 * ask for the session like every other route.
 *
 * GET answers whether the cookie in hand is still good — the panel's boot
 * probe, and the reason a reload does not ask for the password again.
 *
 * DELETE is a sign-out, and it moves a watermark the whole process reads:
 * every cookie issued before it stops verifying. Left in front of the check,
 * that is an unauthenticated caller signing out every admin of the deployment,
 * once a second, for as long as they care to.
 */
async function handleSession(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const verb = method(req);
  if (verb === 'GET') {
    if (!requireAdmin(ctx, req, res)) return;
    sendJson(res, 200, { unlocked: true });
    return;
  }
  if (verb === 'DELETE') {
    if (!requireAdmin(ctx, req, res)) return;
    /* Clearing the cookie only asks the browser to forget it. The watermark is
       what makes the copy somebody else kept stop working. */
    ctx.adminRevokedBefore = Date.now();
    clearAdminCookie(req, res);
    sendJson(res, 200, { unlocked: false });
    return;
  }
  if (verb !== 'POST') {
    send405(res, 'GET, POST, DELETE');
    return;
  }

  const { adminMode, adminPassword } = ctx.config;
  if (adminMode === 'misconfigured' || !adminPassword) {
    sendSyntheticEnvelope(res, 500, ADMIN_MISCONFIGURED_MESSAGE, 'AdminMisconfigured');
    return;
  }

  const { key, shared } = throttleKey(req, ctx.config.trustForwardedFor);
  const ceiling = shared ? SHARED_MAX_WAIT_MS : MAX_WAIT_MS;
  const localWait = ctx.adminThrottle?.waitMs(key) ?? 0;
  const wait = localWait > 0 ? localWait : await sharedWait(ctx, key);
  if (wait > 0) {
    res.setHeader('retry-after', String(Math.ceil(wait / 1000)));
    sendSyntheticEnvelope(res, 429, ADMIN_THROTTLED_MESSAGE, 'AdminThrottled');
    return;
  }

  const body = await jsonBody(req, ADMIN_SESSION_BODY_MAX_BYTES);
  if (body === null) {
    sendAdminBodyTooLarge(req, res);
    return;
  }
  /* Read the body first, then pause: the delay is the same whichever answer
     follows, so its length says nothing about the password. */
  await sleep(ADMIN_ATTEMPT_DELAY_MS);
  if (!passwordMatches(adminPassword, body.password)) {
    ctx.adminThrottle?.fail(key, ceiling);
    /* Awaited, not left running: on a host that freezes the instance the
       moment the response is written, a counter incremented afterwards is a
       counter that was never incremented at all. */
    await rpcQuietly(ctx, 'cf_admin_attempt_fail', { p_key: key, p_max_ms: ceiling });
    sendSyntheticEnvelope(res, 401, ADMIN_BAD_PASSWORD_MESSAGE, 'AdminBadPassword');
    return;
  }
  ctx.adminThrottle?.succeed(key);
  await rpcQuietly(ctx, 'cf_admin_attempt_clear', { p_key: key });
  setAdminCookie(req, res, adminPassword, ctx.config.adminCookieSalt, Date.now());
  sendJson(res, 200, { unlocked: true });
}

/* -------------------------------------------------------------------------- */
/* /overview and /workspaces/<id>                                             */
/* -------------------------------------------------------------------------- */

async function handleOverview(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (method(req) !== 'GET') {
    send405(res, 'GET');
    return;
  }
  let payload: unknown;
  try {
    payload = await upstreamGraphql(ctx, OVERVIEW_QUERY);
  } catch {
    upstreamRefused(res);
    return;
  }
  const data = dataOf<{
    currentUser?: { id?: unknown; name?: unknown; email?: unknown; workspaces?: unknown };
  }>(payload);
  const user = data?.currentUser;
  if (!user || typeof user.id !== 'string') {
    upstreamRefused(res);
    return;
  }
  const workspaces = Array.isArray(user.workspaces) ? user.workspaces : [];
  sendJson(res, 200, {
    account: {
      id: user.id,
      name: typeof user.name === 'string' ? user.name : '',
      email: typeof user.email === 'string' ? user.email : null,
    },
    homeWorkspaceId: ctx.config.homeWorkspaceId ?? null,
    workspaces,
    /* What the panel may offer, decided here rather than guessed from env in
       the browser: the access surface exists only where there is a database. */
    capabilities: { access: hasDatabase(ctx) },
  });
}

/** Null when the field is absent, empty or the query failed — all read the same on screen. */
async function workspaceBilling(ctx: ProxyContext, workspaceId: string): Promise<unknown> {
  try {
    const billing = await upstreamGraphql(ctx, BILLING_QUERY, { workspaceID: workspaceId });
    const parsed = dataOf<{ currentUser?: { workspace?: { subscription?: unknown } } }>(billing);
    return parsed?.currentUser?.workspace?.subscription ?? null;
  } catch {
    return null;
  }
}

async function handleWorkspace(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  workspaceId: string,
): Promise<void> {
  if (method(req) !== 'GET') {
    send405(res, 'GET');
    return;
  }
  let payload: unknown;
  try {
    payload = await upstreamGraphql(ctx, WORKSPACE_QUERY, { workspaceID: workspaceId });
  } catch {
    upstreamRefused(res);
    return;
  }
  const data = dataOf<{ currentUser?: { workspace?: unknown } }>(payload);
  const workspace = data?.currentUser?.workspace;
  if (!workspace) {
    sendSyntheticEnvelope(res, 404, 'No such workspace on this account', 'AdminWorkspaceNotFound');
    return;
  }

  const subscription = await workspaceBilling(ctx, workspaceId);

  sendJson(res, 200, { ...(workspace as Record<string, unknown>), subscription });
}

/* -------------------------------------------------------------------------- */
/* /bots                                                                      */
/* -------------------------------------------------------------------------- */

async function handleBotDetail(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  botId: string,
): Promise<void> {
  let payload: unknown;
  try {
    payload = await upstreamGraphql(ctx, BOT_QUERY, { botID: botId });
  } catch {
    upstreamRefused(res);
    return;
  }
  const data = dataOf<{ bot?: unknown; currentUser?: { botRole?: unknown } }>(payload);
  if (!data?.bot) {
    sendSyntheticEnvelope(res, 404, 'No such bot on this account', 'AdminBotNotFound');
    return;
  }
  sendJson(res, 200, { ...(data.bot as Record<string, unknown>), role: data.currentUser?.botRole ?? null });
}

/**
 * Create, in the order that cannot leave the two sides disagreeing.
 *
 * With a database, the row is reserved BEFORE Chatfuel is asked — the same
 * order sign-up uses, and for the same reason: a bot that exists in Chatfuel
 * and nowhere else is invisible to the people it was created for, while a
 * reservation with no bot is dropped on the spot.
 */
async function handleCreateBot(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await jsonBody(req);
  if (body === null) {
    sendAdminBodyTooLarge(req, res);
    return;
  }
  const title = trimmed(body.name ?? body.title);
  const workspaceId = trimmed(body.workspaceId);
  const tenantId = trimmed(body.tenantId);
  if (!title) {
    sendSyntheticEnvelope(res, 422, 'A name is required', 'BadBotName');
    return;
  }
  if (!workspaceId) {
    sendSyntheticEnvelope(res, 422, 'A workspace is required', 'AdminWorkspaceRequired');
    return;
  }

  let slotId: string | null = null;
  if (hasDatabase(ctx)) {
    /* Reserved with no tenant when the form left the workspace unset: the row
       is what makes the bot grantable later, and skipping it created the bot
       in Chatfuel and nowhere else. The first grant settles the workspace. */
    try {
      const reserved = await rpcAsService(ctx, 'cf_admin_new_bot', { p_tenant_id: tenantId || null, p_name: title });
      if (reserved.status !== 200) {
        const refused = await rpcRefusal(reserved);
        if (refused) {
          sendSyntheticEnvelope(res, refused.status, refused.message, refused.code);
          return;
        }
        throw new Error(`cf_admin_new_bot ${reserved.status}`);
      }
      const row = (await reserved.json()) as { id?: unknown };
      slotId = typeof row.id === 'string' ? row.id : null;
      if (!slotId) throw new Error('cf_admin_new_bot returned no row');
    } catch {
      sendSyntheticEnvelope(res, 503, 'The database did not answer — nothing was created', 'AdminDatabaseUnavailable');
      return;
    }
  }

  let payload: unknown;
  try {
    payload = await upstreamGraphql(ctx, CREATE_BOT_MUTATION, { workspaceID: workspaceId, title });
  } catch {
    if (slotId) await rpcQuietly(ctx, 'cf_drop_bot_slot', { p_slot: slotId });
    upstreamRefused(res);
    return;
  }

  const created = dataOf<{ workspaceCreateBot?: { id?: unknown; title?: unknown } }>(payload)?.workspaceCreateBot;
  if (!created || typeof created.id !== 'string') {
    if (slotId) await rpcQuietly(ctx, 'cf_drop_bot_slot', { p_slot: slotId });
    const codes = graphqlErrorCodes(payload);
    if (codes.includes('TooManyBotsInWorkspace')) {
      sendSyntheticEnvelope(res, 409, 'This workspace is full — its plan allows no more bots', 'WorkspaceFull');
      return;
    }
    if (codes.includes('WorkspaceDoesNotExist') || codes.includes('NotEnoughPermissions')) {
      sendSyntheticEnvelope(res, 403, 'This token cannot create bots in that workspace', 'AdminWorkspaceForbidden');
      return;
    }
    sendSyntheticEnvelope(res, 502, 'Chatfuel could not create this bot', 'AdminBotCreateFailed');
    return;
  }

  if (slotId) {
    const recorded = await rpcQuietly(ctx, 'cf_bot_created', { p_slot: slotId, p_bot_id: created.id });
    if (recorded === null) {
      /* The bot exists but nobody in the app can be given it. Undo Chatfuel's
         half rather than leave a bot behind that only this panel can see. */
      await deleteBotUpstream(ctx, created.id);
      await rpcQuietly(ctx, 'cf_drop_bot_slot', { p_slot: slotId });
      sendSyntheticEnvelope(
        res,
        503,
        'The database did not answer — the bot was rolled back',
        'AdminDatabaseUnavailable',
      );
      return;
    }
  }

  forgetCaches(ctx);
  sendJson(res, 200, {
    id: created.id,
    title: typeof created.title === 'string' ? created.title : title,
    workspaceId,
    slotId,
  });
}

async function handleRenameBot(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  botId: string,
): Promise<void> {
  const body = await jsonBody(req);
  if (body === null) {
    sendAdminBodyTooLarge(req, res);
    return;
  }
  const title = trimmed(body.name ?? body.title);
  if (!title) {
    sendSyntheticEnvelope(res, 422, 'A name is required', 'BadBotName');
    return;
  }

  /* The database first, because it is the one that can say no — and if
     Chatfuel then refuses, the old name goes back. A bot called one thing here
     and another there is worse than a rename that did not happen.

     Which means its "no" has to be heard, and heard apart from the others:
     `rpcQuietly` flattens a PT422 and a bot this deployment has no row for
     into the same null, which would send a name the database had just rejected
     to Chatfuel anyway, with nothing left to roll the rename back with.
     Refusal, outage and "no such row" are three answers, and this reads all
     three. */
  let previous: string | null = null;
  if (hasDatabase(ctx)) {
    try {
      const response = await rpcAsService(ctx, 'cf_admin_rename_bot', { p_bot_id: botId, p_name: title });
      if (response.status !== 200) {
        const refused = await rpcRefusal(response);
        if (refused) {
          sendSyntheticEnvelope(res, refused.status, refused.message, refused.code);
          return;
        }
        throw new Error(`cf_admin_rename_bot ${response.status}`);
      }
      const row = (await response.json()) as { previous_name?: unknown };
      previous = typeof row.previous_name === 'string' ? row.previous_name : null;
    } catch {
      sendSyntheticEnvelope(res, 503, 'The database did not answer — nothing was renamed', 'AdminDatabaseUnavailable');
      return;
    }
  }

  if (!(await renameBotUpstream(ctx, botId, title))) {
    if (previous !== null) await rpcQuietly(ctx, 'cf_admin_rename_bot', { p_bot_id: botId, p_name: previous });
    sendSyntheticEnvelope(res, 502, 'Chatfuel could not rename this bot', 'BotRenameFailed');
    return;
  }
  sendJson(res, 200, { id: botId, title });
}

/**
 * Delete, with the guard that is easiest to get wrong here.
 *
 * The platform deletes a WORKSPACE when its last bot goes. For the workspace this
 * deployment is built on that is unrecoverable from inside the app — the id in
 * the environment would name something that no longer exists — so it is
 * refused outright. For any other workspace it is a real thing an operator may
 * want, and it is allowed once they have said so on purpose (`?force=1`).
 *
 * Chatfuel first and the database second, the opposite of a rename: a row
 * without its bot is a dead entry in everybody's switcher, while a bot without
 * its row is merely out of reach and the next attempt finishes the job.
 */
async function handleDeleteBot(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  botId: string,
): Promise<void> {
  const workspaces = await accountWorkspaces(ctx);
  if (!workspaces) {
    sendSyntheticEnvelope(
      res,
      503,
      'Could not ask Chatfuel about this bot — try again in a moment',
      'AdminUpstreamUnavailable',
    );
    return;
  }
  const owner = workspaces.find((workspace) => workspace.bots.some((bot) => bot.id === botId));
  if (!owner) {
    sendSyntheticEnvelope(res, 404, 'No such bot on this account', 'AdminBotNotFound');
    return;
  }
  if (owner.bots.length <= 1) {
    if (owner.id === ctx.config.homeWorkspaceId) {
      sendSyntheticEnvelope(res, 409, ADMIN_HOME_WORKSPACE_MESSAGE, 'LastBotInWorkspace');
      return;
    }
    if (queryOf(req).get('force') !== '1') {
      sendSyntheticEnvelope(res, 409, ADMIN_WORKSPACE_GOES_MESSAGE, 'WorkspaceGoesWithIt');
      return;
    }
  }

  if (!(await deleteBotUpstream(ctx, botId))) {
    sendSyntheticEnvelope(res, 502, 'Chatfuel could not delete this bot', 'BotDeleteFailed');
    return;
  }
  await rpcQuietly(ctx, 'cf_admin_forget_bot', { p_bot_id: botId });
  forgetCaches(ctx, new Set([botId]));
  sendJson(res, 200, { id: botId, workspaceId: owner.id, workspaceDeleted: owner.bots.length <= 1 });
}

/**
 * The two caches, and the live sockets, that would otherwise keep answering
 * about the account as it was a minute ago.
 *
 * The workspace fence holds its bot set for 60 s and the auth gate holds each
 * session's for 30 s, so without this a bot created here is refused by the
 * proxy for up to a minute after the panel says it exists — and a deleted one
 * stays reachable for just as long. Both are cleared whole rather than per
 * caller: this panel changes the account, not one session's view of it.
 *
 * The sockets go with them. A WebSocket reads its fence once, at connect, so a
 * subscription opened before the change keeps being fed afterwards — clearing a
 * cache the socket will never consult again does nothing for it. Closing is
 * cheap: graphql-ws reconnects, and the new socket is gated afresh.
 */
function forgetCaches(ctx: ProxyContext, botIds?: ReadonlySet<string>): void {
  ctx.fence?.clear();
  ctx.gate?.clear();
  /* Only when a bot is named. Creating one takes nothing away from anybody,
     and ending every live subscription on the deployment to announce it would
     be a worse answer than the stale cache this exists to avoid. */
  if (botIds) ctx.closeSockets?.(botIds);
}

async function handleBots(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse, rest: string): Promise<void> {
  const verb = method(req);
  if (rest === '') {
    if (verb !== 'POST') {
      send405(res, 'POST');
      return;
    }
    await handleCreateBot(ctx, req, res);
    return;
  }

  const botId = rest.slice(1);
  if (!BOT_ID_RE.test(botId)) {
    sendSyntheticEnvelope(res, 404, 'No such bot on this account', 'AdminBotNotFound');
    return;
  }
  if (verb === 'GET') return handleBotDetail(ctx, req, res, botId);
  if (verb === 'PATCH') return handleRenameBot(ctx, req, res, botId);
  if (verb === 'DELETE') return handleDeleteBot(ctx, req, res, botId);
  send405(res, 'GET, PATCH, DELETE');
}

/* -------------------------------------------------------------------------- */
/* /health                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What this deployment can and cannot do right now — names and yes/no, never
 * values. Every secret in here is reported as "present" and nothing more: the
 * panel exists so an operator does not have to open .env, not so they can read
 * it from a browser.
 */
async function handleHealth(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (method(req) !== 'GET') {
    send405(res, 'GET');
    return;
  }
  const { config } = ctx;

  let tokenAccepted = false;
  let account: { id: string; name: string; email: string | null } | null = null;
  if (config.token) {
    try {
      const payload = await upstreamGraphql(ctx, PING_QUERY, undefined, 10_000);
      const user = dataOf<{ currentUser?: { id?: unknown; name?: unknown; email?: unknown } }>(payload)?.currentUser;
      if (user && typeof user.id === 'string') {
        tokenAccepted = true;
        account = {
          id: user.id,
          name: typeof user.name === 'string' ? user.name : '',
          email: typeof user.email === 'string' ? user.email : null,
        };
      }
    } catch {
      tokenAccepted = false;
    }
  }

  let fence: { kind: string; ok: boolean; bots: number | null } = { kind: 'off', ok: true, bots: null };
  if (ctx.fence) {
    const answer = await ctx.fence.resolve();
    fence = { kind: 'account', ok: answer.ok, bots: answer.ok ? answer.botIds.size : null };
  } else if (config.allowedBotIds) {
    fence = { kind: 'frozen', ok: true, bots: config.allowedBotIds.size };
  }

  let databaseReachable: boolean | null = null;
  if (hasDatabase(ctx)) {
    const answer = await rpcQuietly(ctx, 'cf_admin_ping', {});
    databaseReachable = answer !== null;
  }

  /* Whether the queue can fire is a different question from whether its routes
     are mounted, and only this side can answer it: the panel cannot ask
     /publishing/config, which admits a signed-in user rather than an admin.
     `null` means the question does not arise - there is no queue here. */
  let scheduling: boolean | null = null;
  if (config.publishingQueueRoute) {
    const state = await instagramScheduling(ctx);
    scheduling = state.ok ? state.scheduling : null;
  }

  sendJson(res, 200, {
    upstream: config.upstream,
    tokenEnv: config.tokenEnv,
    token: { present: Boolean(config.token), accepted: tokenAccepted },
    account,
    fence,
    authMode: config.authMode,
    adminMode: config.adminMode,
    homeWorkspaceId: config.homeWorkspaceId ?? null,
    supabase: {
      configured: config.authMode === 'on',
      serviceRole: Boolean(config.auth?.serviceRoleKey),
      reachable: databaseReachable,
    },
    publishingQueue: config.publishingQueueRoute,
    scheduling,
    egress: describeEgress(),
    problems: config.problems,
  });
}

/* -------------------------------------------------------------------------- */
/* /tenants and /grants (auth module only)                                    */
/* -------------------------------------------------------------------------- */

async function handleTenants(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (method(req) !== 'GET') {
    send405(res, 'GET');
    return;
  }
  if (!hasDatabase(ctx)) {
    sendSyntheticEnvelope(res, 500, MISCONFIGURED_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }
  const [answer, unassigned] = await Promise.all([
    rpcQuietly(ctx, 'cf_admin_tenants_json', {}),
    rpcQuietly(ctx, 'cf_admin_unassigned_bots_json', {}),
  ]);
  if (answer === null || unassigned === null) {
    sendSyntheticEnvelope(res, 503, 'The database did not answer', 'AdminDatabaseUnavailable');
    return;
  }
  sendJson(res, 200, { tenants: answer, unassigned });
}

async function handleGrants(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const verb = method(req);
  if (verb !== 'POST' && verb !== 'DELETE') {
    send405(res, 'POST, DELETE');
    return;
  }
  if (!hasDatabase(ctx)) {
    sendSyntheticEnvelope(res, 500, MISCONFIGURED_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }
  /* A DELETE body is dropped by enough intermediaries to be a bad place for
     the only thing that says WHAT to delete. */
  const source = verb === 'POST' ? await jsonBody(req) : Object.fromEntries(queryOf(req));
  if (source === null) {
    sendAdminBodyTooLarge(req, res);
    return;
  }
  const botId = trimmed(source.botId);
  const userId = trimmed(source.userId);
  if (!botId || !userId) {
    sendSyntheticEnvelope(res, 422, 'A bot and a person are both required', 'AdminGrantIncomplete');
    return;
  }
  /* Which workspace a bot that has none should join. The panel grants from a
     row already inside one, so it knows; the database falls back to the
     person's own when nobody says. */
  const tenantId = trimmed(source.tenantId);

  const name = verb === 'POST' ? 'cf_admin_grant_bot' : 'cf_admin_revoke_bot';
  try {
    const args =
      verb === 'POST'
        ? { p_bot_id: botId, p_user_id: userId, p_tenant_id: tenantId || null }
        : { p_bot_id: botId, p_user_id: userId };
    const response = await rpcAsService(ctx, name, args);
    if (response.status !== 200) {
      const refused = await rpcRefusal(response);
      if (refused) {
        sendSyntheticEnvelope(res, refused.status, refused.message, refused.code);
        return;
      }
      throw new Error(`${name} ${response.status}`);
    }
  } catch {
    sendSyntheticEnvelope(res, 503, 'The database did not answer', 'AdminDatabaseUnavailable');
    return;
  }
  /* Somebody's reachable bots just changed; the gate is holding the old set,
     and a subscription opened under the old one is still being fed. Only the
     sockets that can see this bot are ended. */
  forgetCaches(ctx, new Set([botId]));
  sendJson(res, 200, { botId, userId, granted: verb === 'POST' });
}

/* -------------------------------------------------------------------------- */
/* Dispatch                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Everything under <adminPath>. One entry point rather than seven, so the
 * "is there a session?" check is impossible to add a route without.
 */
export async function handleAdmin(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  const rest = pathname.slice(ctx.config.adminPath.length);
  try {
    if (rest === '/session') {
      await handleSession(ctx, req, res);
      return;
    }
    if (!requireAdmin(ctx, req, res)) return;

    if (rest === '/overview') return await handleOverview(ctx, req, res);
    if (rest === '/health') return await handleHealth(ctx, req, res);
    if (rest === '/tenants') return await handleTenants(ctx, req, res);
    if (rest === '/grants') return await handleGrants(ctx, req, res);
    if (rest === '/bots' || rest.startsWith('/bots/')) {
      return await handleBots(ctx, req, res, rest.slice('/bots'.length));
    }
    if (rest.startsWith('/workspaces/')) {
      const workspaceId = rest.slice('/workspaces/'.length);
      if (!BOT_ID_RE.test(workspaceId)) {
        sendSyntheticEnvelope(res, 404, 'No such workspace on this account', 'AdminWorkspaceNotFound');
        return;
      }
      return await handleWorkspace(ctx, req, res, workspaceId);
    }
    sendSyntheticEnvelope(res, 404, 'No such admin route', 'AdminRouteNotFound');
  } catch {
    if (!res.headersSent) {
      sendSyntheticEnvelope(res, 500, 'The proxy hit an unexpected error in the admin panel', 'ProxyInternalError');
    }
  }
}
