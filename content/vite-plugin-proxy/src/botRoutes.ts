/**
 * Provisioning and the bots CRUD: the routes that create, rename and delete
 * bots, and the upstream mutations they sequence. All of it needs the master
 * token, so all of it lives on this side; the database decides whether the
 * caller may, and these handlers only keep the two systems in step so neither
 * is left holding a bot the other has forgotten.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GATE_MESSAGES, bearerOf, type AuthGate } from './gate.js';
import { FENCE_QUERY } from './workspaceFence.js';
import {
  JSON_BODY_MAX_BYTES,
  readJsonBodyCapped,
  send405,
  refuseOversizedBody,
  sendJson,
  sendSyntheticEnvelope,
} from './envelope.js';
import { graphqlErrorCodes } from './queryAnalysis.js';
import { MISCONFIGURED_MESSAGE, WORKSPACE_MISSING_MESSAGE } from './proxyConfig.js';
import { upstreamGraphql, upstreamGraphqlResult } from './upstream.js';
import {
  asBot,
  asWorkspace,
  callerWorkspace,
  rpcAsCaller,
  rpcAsService,
  rpcRefusal,
  type CallerBot,
  type CallerWorkspace,
} from './supabaseRpc.js';
import type { ProxyContext } from './context.js';

export const PROVISION_FAILED_MESSAGE = 'Chatfuel could not create a bot for this account';

/**
 * Said to whoever tries to remove the last bot they have — and, behind that,
 * the last bot in the deployment's Chatfuel workspace. Two fences, one
 * sentence, because from where the person sits both mean the same thing: this
 * is the last bot in the app, and it is exactly what may not go. The way out
 * is in the sentence, and a bot that only needs a different name is renamed.
 */
export const LAST_BOT_MESSAGE = 'This is the last bot in this app and cannot be deleted — create another one first';

/** The `name` of a body that may be anything at all, or nothing. */
const nameIn = (body: unknown): string | undefined => {
  const asked = (body as { name?: unknown } | null | undefined)?.name;
  return typeof asked === 'string' && asked.trim() ? asked.trim() : undefined;
};

/** Both delete fences fail closed with the same sentence: a retry is recoverable, a gone bot is not. */
const BOT_CHECK_UNAVAILABLE_MESSAGE = 'Could not check this bot with Chatfuel — try again in a moment';

/**
 * POST <authPath>/provision → { tenantId, name, role, bots }
 *
 * The second half of signing up: every account gets a workspace, and its first
 * Chatfuel bot is created HERE because only the server holds the master token.
 *
 * Order matters. `cf_claim_workspace` runs first as the caller, and it is what
 * makes this idempotent: somebody who already has a workspace — their own, or
 * one they were invited into — gets it back, and an account that already has a
 * bot it can OPEN never gets a second one from signing in again.
 *
 * "Can open" is the whole of the fix. A row with no `bot_id` is a reservation
 * `addBot` writes before Chatfuel is asked; counting one as a finished bot is
 * what let the second of two concurrent sign-up calls answer 200 with a
 * workspace holding nothing — the app believed it, and a customer sat on an
 * empty state for ever while the real failure was dropped on the floor. Since
 * a reservation no longer counts, the second caller is stopped on purpose
 * instead: it joins the run in this process, and settles against the database
 * when the other run is in a different one.
 */
/**
 * The one place a bot is created. `workspaceCreateBot` and not `createBot`:
 * a bot made without a workspace lands in a throwaway one of its own (which
 * outlives the bot), and above all it does not draw on the plan the deployer
 * pays for — the whole point of asking for a workspace in the wizard.
 *
 * The two failures worth telling apart are the operator's to fix, and neither
 * is retryable by the person signing up: the workspace is full (its plan
 * allows no more bots), or its id is wrong / not this token's to use.
 */
async function createBotInWorkspace(
  ctx: ProxyContext,
  title: string,
): Promise<{ ok: true; botId: string } | { ok: false; status: number; code: string; message: string }> {
  const { workspaceId } = ctx.config;
  let answer: { status: number; payload: unknown };
  try {
    answer = await upstreamGraphqlResult(
      ctx,
      'mutation CfProvisionBot($workspaceID: WorkspaceID!, $title: String!) { workspaceCreateBot(workspaceID: $workspaceID, initialTitle: $title) { id } }',
      { workspaceID: workspaceId, title },
    );
  } catch (err) {
    /*
     * Nothing else in this process writes a line, and this is the failure that
     * cost a customer their sign-up with no trace on either side. The
     * variable is named, never its value — the same rule `describeProblem`
     * follows for the token.
     */
    console.error('[chatfuel-proxy] workspaceCreateBot could not reach Chatfuel', {
      workspaceId,
      cause: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, status: 502, code: 'ProvisionUnreachable', message: PROVISION_FAILED_MESSAGE };
  }

  const { status, payload } = answer;
  const id = (payload as { data?: { workspaceCreateBot?: { id?: unknown } } })?.data?.workspaceCreateBot?.id;
  if (typeof id === 'string' && id) return { ok: true, botId: id };

  const codes = graphqlErrorCodes(payload);
  console.error('[chatfuel-proxy] workspaceCreateBot refused', { workspaceId, status, codes });
  if (codes.includes('TooManyBotsInWorkspace')) {
    return {
      ok: false,
      status: 409,
      code: 'WorkspaceFull',
      message: 'This deployment’s Chatfuel workspace is full — its plan allows no more bots',
    };
  }
  if (codes.includes('WorkspaceDoesNotExist') || codes.includes('NotEnoughPermissions')) {
    return {
      ok: false,
      status: 500,
      code: 'ProxyAuthMisconfigured',
      message: `CHATFUEL_WORKSPACE_ID (${workspaceId}) is not a Chatfuel workspace this deployment’s token can create bots in`,
    };
  }
  /*
   * Chatfuel answered, and we do not recognise what it said. The HTTP status
   * is the part worth carrying: a 401/403 here is a CHATFUEL_TOKEN that has
   * expired or belongs to another account, and without the status it would be
   * indistinguishable from "the network is down" — one 502 with one sentence,
   * and nothing for the operator to go on.
   */
  return {
    ok: false,
    status: 502,
    code: 'ProvisionRefused',
    message: status === 200 ? PROVISION_FAILED_MESSAGE : `${PROVISION_FAILED_MESSAGE} (Chatfuel answered ${status})`,
  };
}

/**
 * Undo a bot Chatfuel made but the database never took, so a retry does not
 * leave a trail of them. Exported because the admin panel deletes bots too and
 * the NotEnoughPermissions reading below must not be written twice.
 */
export async function deleteBotUpstream(ctx: ProxyContext, botId: string): Promise<boolean> {
  try {
    const payload = (await upstreamGraphql(
      ctx,
      'mutation CfDeleteBot($botID: BotID!) { deleteBot(botID: $botID) { id } }',
      { botID: botId },
    )) as { data?: { deleteBot?: unknown } };
    if (payload?.data?.deleteBot) return true;
    /*
     * A bot that is already gone is the state this asks for, not a failure —
     * it is how a half-finished delete finishes on the next attempt. Chatfuel
     * does not say "no such bot" for one: asked again about a bot it has
     * already deleted, it answers NotEnoughPermissions in practice. The
     * code is ambiguous — it is also the answer for a bot this token may not
     * touch — but by the time the request gets here the database has already
     * said the bot is this workspace's, so the reading that leaves a row
     * nobody can ever delete is the wrong one.
     */
    return graphqlErrorCodes(payload).some(
      (code) => code === 'BotDoesNotExist' || code === 'NotFound' || code === 'NotEnoughPermissions',
    );
  } catch {
    return false;
  }
}

/**
 * Is this the last bot left in the workspace every account's bots are created
 * in? A workspace does not outlive its last bot, and this deployment has
 * exactly one such workspace. So the customer
 * who happens to delete the last bot in it would take sign-up away from
 * everybody, themselves included, and no amount of retrying would bring it
 * back: CHATFUEL_WORKSPACE_ID would name something that no longer exists.
 *
 * `null` means Chatfuel could not be asked. The caller refuses the delete
 * then, the same way every other fence here fails closed: a delete that says
 * "try again in a moment" is recoverable, and a workspace that is gone is not.
 */
async function isLastBotInDeploymentWorkspace(ctx: ProxyContext, botId: string): Promise<boolean | null> {
  try {
    const payload = (await upstreamGraphql(ctx, FENCE_QUERY)) as {
      data?: { currentUser?: { workspaces?: { id?: unknown; bots?: { id?: unknown }[] }[] } };
    };
    const workspaces = payload?.data?.currentUser?.workspaces;
    if (!Array.isArray(workspaces)) return null;
    // Not botIdsInFenceAnswer's flattened set: this needs the bots of ONE
    // workspace — the deployment's own — out of the same answer shape.
    const mine = workspaces.find((w) => w.id === ctx.config.workspaceId);
    if (!mine || !Array.isArray(mine.bots)) return null;
    const ids = mine.bots.map((b) => b.id).filter((id): id is string => typeof id === 'string');
    // Somebody else may have removed it already; that is not this delete's problem.
    return ids.length <= 1 && ids.includes(botId);
  } catch {
    return null;
  }
}

/** Shared with the admin panel, so one rename does not drift from the other. */
export async function renameBotUpstream(ctx: ProxyContext, botId: string, title: string): Promise<boolean> {
  try {
    const payload = (await upstreamGraphql(
      ctx,
      'mutation CfRenameBot($botID: BotID!, $title: String!) { renameBot(botID: $botID, newTitle: $title) { id } }',
      { botID: botId, title },
    )) as { data?: { renameBot?: unknown } };
    return Boolean(payload?.data?.renameBot);
  } catch {
    return false;
  }
}

/**
 * Adding a bot, in the order that cannot leave the two sides disagreeing.
 *
 * The caller reserves the row FIRST (`cf_new_bot`, as themselves, so the
 * database decides whether they may) and only then is a bot created in
 * Chatfuel. If the second step fails, the reservation is dropped; if the third
 * fails, the bot is deleted again — a retry that created another one every
 * time would quietly eat the deployment's workspace.
 */
async function addBot(
  ctx: ProxyContext,
  callerJwt: string,
  name: string,
  /**
   * Asked, once the row is reserved and before Chatfuel is, whether this run
   * should stand down — the reservation is dropped and `yielded` comes back.
   * Provisioning uses it to lose a race it did not know it was in; adding a
   * second bot from Team never does, since two people asking for two bots
   * should get two.
   */
  standDown?: (slotId: string) => Promise<boolean>,
): Promise<
  { ok: true; bot: CallerBot } | { ok: false; status: number; code: string; message: string } | { yielded: true }
> {
  let slotId: string;
  try {
    const reserved = await rpcAsCaller(ctx, 'cf_new_bot', { p_name: name }, callerJwt);
    if (reserved.status === 401) {
      return { ok: false, status: 401, code: 'AuthSessionRequired', message: GATE_MESSAGES.AuthSessionRequired };
    }
    if (reserved.status !== 200) {
      const refused = await rpcRefusal(reserved);
      if (refused) return refused;
      throw new Error(`cf_new_bot ${reserved.status}`);
    }
    const row = asBot(await reserved.json());
    if (!row) throw new Error('cf_new_bot returned no row');
    slotId = row.id;
  } catch {
    return { ok: false, status: 503, code: 'ProxyAuthUnavailable', message: GATE_MESSAGES.ProxyAuthUnavailable };
  }

  if (standDown && (await standDown(slotId))) {
    await rpcAsService(ctx, 'cf_drop_bot_slot', { p_slot: slotId }).catch(() => undefined);
    return { yielded: true };
  }

  const created = await createBotInWorkspace(ctx, name);
  if (!created.ok) {
    await rpcAsService(ctx, 'cf_drop_bot_slot', { p_slot: slotId }).catch(() => undefined);
    return created;
  }

  try {
    const recorded = await rpcAsService(ctx, 'cf_bot_created', { p_slot: slotId, p_bot_id: created.botId });
    if (recorded.status !== 200) throw new Error(`cf_bot_created ${recorded.status}`);
  } catch {
    await deleteBotUpstream(ctx, created.botId);
    await rpcAsService(ctx, 'cf_drop_bot_slot', { p_slot: slotId }).catch(() => undefined);
    return { ok: false, status: 503, code: 'ProxyAuthUnavailable', message: GATE_MESSAGES.ProxyAuthUnavailable };
  }

  return { ok: true, bot: { id: slotId, botId: created.botId, name } };
}

const workspaceJson = (workspace: CallerWorkspace): unknown => ({
  tenantId: workspace.tenantId,
  name: workspace.name,
  role: workspace.role,
  bots: workspace.bots.map((bot) => ({ id: bot.id, botId: bot.botId, name: bot.name })),
});

/** A bot the app can OPEN. A row with no `botId` is a reservation, not a bot. */
const isReady = (bot: CallerBot): boolean => Boolean(bot.botId);

/**
 * How long a reservation is believed to belong to a run that is still going.
 *
 * Creating a bot takes seconds; a reservation older than this is a run whose
 * process died, and standing down for it would leave the account waiting on
 * something that is never coming. Well under `cf_new_bot`'s own ten-minute
 * sweep, which is what eventually removes the row.
 */
const RESERVATION_ALIVE_MS = 2 * 60_000;

interface TenantBotRow {
  id: string;
  botId: string | null;
  createdAt: number;
}

/**
 * Every bot row of ONE tenant, with the ages `cf_my_workspace` does not carry.
 *
 * `cf_list_bots` is admin-gated and unfiltered by per-bot grants, which is
 * what makes it the right question here: provisioning runs as the workspace's
 * owner, and the count that matters is the workspace's own.
 */
async function tenantBotRows(ctx: ProxyContext, jwt: string, tenantId: string): Promise<TenantBotRow[] | null> {
  try {
    const response = await rpcAsCaller(ctx, 'cf_list_bots', { p_tenant_id: tenantId }, jwt);
    if (response.status !== 200) return null;
    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows)) return null;
    return rows.flatMap((value) => {
      const row = value as { id?: unknown; bot_id?: unknown; created_at?: unknown };
      if (typeof row.id !== 'string') return [];
      const at = typeof row.created_at === 'string' ? Date.parse(row.created_at) : Number.NaN;
      return [
        {
          id: row.id,
          botId: typeof row.bot_id === 'string' ? row.bot_id : null,
          /* An unreadable timestamp reads as "just made": the safe way to be
             wrong is to let the other run finish, not to race it. */
          createdAt: Number.isNaN(at) ? Date.now() : at,
        },
      ];
    });
  } catch {
    return null;
  }
}

/**
 * The caller's workspace once it holds a bot they can open — or as it stands
 * when the wait runs out.
 *
 * Only ever used by a request that stood down for another process's run: that
 * run is seconds from finishing, and answering before it does would hand the
 * app a workspace with nothing openable in it, which is the state this whole
 * route exists to avoid. Bounded well under the client's own patience.
 */
async function awaitReadyWorkspace(
  ctx: ProxyContext,
  jwt: string,
  budgetMs = 8_000,
  stepMs = 250,
): Promise<CallerWorkspace | null | 'unavailable'> {
  const until = Date.now() + budgetMs;
  let latest = await callerWorkspace(ctx, jwt);
  while (latest !== 'unavailable' && latest && !latest.bots.some(isReady) && Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, stepMs));
    latest = await callerWorkspace(ctx, jwt);
  }
  return latest;
}

type ProvisionRun = Awaited<ReturnType<typeof addBot>>;

/**
 * One provisioning run per tenant, in THIS process.
 *
 * Signing up reaches the route twice within milliseconds, and a reservation is
 * not a bot: the second call cannot be left to notice the first's row and stop
 * itself. It is stopped here on purpose, or it creates a second bot on the
 * deployment's plan.
 *
 * Per proxy instance, not global: two Vite servers in one test process must
 * not share a run.
 */
const PROVISIONING = new WeakMap<ProxyContext, Map<string, Promise<ProvisionRun>>>();

function provisionRun(
  ctx: ProxyContext,
  tenantId: string,
  start: () => Promise<ProvisionRun>,
): { run: Promise<ProvisionRun>; joined: boolean } {
  let runs = PROVISIONING.get(ctx);
  if (!runs) {
    runs = new Map();
    PROVISIONING.set(ctx, runs);
  }
  const joined = runs.get(tenantId);
  if (joined) return { run: joined, joined: true };
  const run = start();
  runs.set(tenantId, run);
  /* `then(clear, clear)`, never `.finally()`: finally returns a new promise
     nobody awaits, and a rejection would surface through it unhandled. */
  const clear = () => {
    if (runs.get(tenantId) === run) runs.delete(tenantId);
  };
  void run.then(clear, clear);
  return { run, joined: false };
}

export async function handleProvision(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { gate } = ctx;
  const { auth, token, workspaceId } = ctx.config;
  if (!gate || !auth?.serviceRoleKey || !token) {
    sendSyntheticEnvelope(res, 500, MISCONFIGURED_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }
  // A bot created outside the deployer's workspace bills to nothing anybody
  // pays for, so this is a stop, not a fallback to plain createBot.
  if (!workspaceId) {
    sendSyntheticEnvelope(res, 500, WORKSPACE_MISSING_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }
  if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
    send405(res, 'POST');
    return;
  }
  const callerJwt = bearerOf(req.headers.authorization);
  // Checked here rather than left to the gate so the token is a string from
  // this line down: an RPC "as the caller" with no caller is an RPC as the
  // anon key, which is a different request than the one that was asked for.
  if (!callerJwt) {
    sendSyntheticEnvelope(res, 401, GATE_MESSAGES.AuthSessionRequired, 'AuthSessionRequired');
    return;
  }
  const caller = await gate.verify(callerJwt);
  if (!caller.ok) {
    sendSyntheticEnvelope(res, caller.status, caller.message, caller.code);
    return;
  }

  const body = await readJsonBodyCapped(req, JSON_BODY_MAX_BYTES);
  if (body.tooLarge) {
    refuseOversizedBody(req, res);
    return;
  }
  const requestedName = nameIn(body.value);

  let workspace: CallerWorkspace | null;
  try {
    const claimed = await rpcAsCaller(ctx, 'cf_claim_workspace', { p_name: requestedName ?? null }, callerJwt);
    if (claimed.status === 401) {
      sendSyntheticEnvelope(res, 401, GATE_MESSAGES.AuthSessionRequired, 'AuthSessionRequired');
      return;
    }
    if (claimed.status !== 200) throw new Error(`cf_claim_workspace ${claimed.status}`);
    workspace = asWorkspace(await claimed.json());
  } catch {
    sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
    return;
  }
  if (!workspace) {
    sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
    return;
  }
  /*
   * Coming back, or arriving by invite: the account already has a bot it can
   * OPEN and this is a read. A reservation does not count — `addBot` writes
   * one before Chatfuel is asked, and reading it as a finished bot is what
   * answered a sign-up "done" when nothing had been made. Only a workspace
   * with nothing openable in it gets a bot made for it.
   */
  if (workspace.bots.some(isReady)) {
    sendJson(res, 200, workspaceJson(workspace));
    return;
  }

  const name = workspace.name || 'My workspace';
  const tenantId = workspace.tenantId;
  const { run, joined } = provisionRun(ctx, tenantId, () =>
    /*
     * The cross-process half of the same guard. Two instances (serverless
     * scale-out) hold two of the map above, so the loser is settled in the
     * database instead: reserve, look again, and stand down if somebody else's
     * bot has landed or their reservation was made first. `cf_my_bots_json`
     * orders by created_at and each reservation commits before its response,
     * so exactly one of two racing runs sees itself first.
     */
    addBot(ctx, callerJwt, name, async (slotId) => {
      const rows = await tenantBotRows(ctx, callerJwt, tenantId);
      /* Cannot tell: finish. An account with no bot is worse than a workspace
         with one it did not strictly need. */
      if (!rows) return false;
      if (rows.some((row) => row.botId)) return true;
      const mine = rows.find((row) => row.id === slotId);
      if (!mine) return false;
      /* Of the reservations that are still ALIVE, the earliest wins. Both runs
         read the same rows and the same clock, so exactly one of them sees
         itself first; ties break on the row id so neither can defer to the
         other for ever. A reservation older than the window belongs to a run
         that died and is ignored. */
      return rows.some(
        (row) =>
          row.id !== slotId &&
          !row.botId &&
          Date.now() - row.createdAt < RESERVATION_ALIVE_MS &&
          (row.createdAt < mine.createdAt || (row.createdAt === mine.createdAt && row.id < mine.id)),
      );
    }),
  );
  const added = await run;

  if ('yielded' in added || !added.ok) {
    if ('ok' in added && !added.ok) {
      sendSyntheticEnvelope(res, added.status, added.message, added.code);
      return;
    }
    /*
     * Somebody else's run owns the bot. Wait for it rather than answering with
     * their half-made reservation: this request IS the sign-up, and a 200 that
     * carries nothing openable is the answer that started all of this. The
     * winner is another process (the in-process join covers the rest), so
     * there is nothing to await but the database.
     */
    const mine = await awaitReadyWorkspace(ctx, callerJwt);
    if (mine === 'unavailable' || !mine) {
      sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
      return;
    }
    gate.clear();
    sendJson(res, 200, workspaceJson(mine));
    return;
  }

  /*
   * Every session was gated moments ago, when this account owned nothing — a
   * cached empty set keeps answering "not your bot" about the bot just made.
   * `clear` and not `forget`: the person may be signed in on a second device
   * under a different JWT, and its entry is stale in exactly the same way.
   */
  gate.clear();
  if (joined) {
    const mine = await callerWorkspace(ctx, callerJwt);
    if (mine === 'unavailable' || !mine) {
      sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
      return;
    }
    sendJson(res, 200, workspaceJson(mine));
    return;
  }
  sendJson(res, 200, workspaceJson({ ...workspace, bots: [added.bot] }));
}

/**
 * POST   <authPath>/bots      {name}  → another bot for the caller's workspace
 * PATCH  <authPath>/bots/<id> {name}  → rename it here and in Chatfuel
 * DELETE <authPath>/bots/<id>         → delete it in Chatfuel, then here
 *
 * All three need the master token, so all three live on this side. The
 * database decides whether the caller may; this only sequences the two systems
 * so neither is left holding a bot the other has forgotten.
 */
export async function handleBots(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  const { gate } = ctx;
  const { auth, token, workspaceId, authPath } = ctx.config;
  if (!gate || !auth?.serviceRoleKey || !token) {
    sendSyntheticEnvelope(res, 500, MISCONFIGURED_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }
  if (!workspaceId) {
    sendSyntheticEnvelope(res, 500, WORKSPACE_MISSING_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }

  const method = (req.method ?? 'GET').toUpperCase();
  const slotId = pathname === `${authPath}/bots` ? null : pathname.slice(`${authPath}/bots/`.length);
  const allowed = slotId === null ? method === 'POST' : method === 'PATCH' || method === 'DELETE';
  if (!allowed) {
    send405(res, slotId === null ? 'POST' : 'PATCH, DELETE');
    return;
  }
  if (slotId !== null && (slotId === '' || slotId.includes('/'))) {
    sendSyntheticEnvelope(res, 404, 'No such bot', 'BotNotFound');
    return;
  }

  const callerJwt = bearerOf(req.headers.authorization);
  // Checked here rather than left to the gate so the token is a string from
  // this line down: an RPC "as the caller" with no caller is an RPC as the
  // anon key, which is a different request than the one that was asked for.
  if (!callerJwt) {
    sendSyntheticEnvelope(res, 401, GATE_MESSAGES.AuthSessionRequired, 'AuthSessionRequired');
    return;
  }
  const caller = await gate.verify(callerJwt);
  if (!caller.ok) {
    sendSyntheticEnvelope(res, caller.status, caller.message, caller.code);
    return;
  }

  let name: string | undefined;
  if (method !== 'DELETE') {
    const body = await readJsonBodyCapped(req, JSON_BODY_MAX_BYTES);
    if (body.tooLarge) {
      refuseOversizedBody(req, res);
      return;
    }
    name = nameIn(body.value);
    if (!name) {
      sendSyntheticEnvelope(res, 422, 'A name is required', 'BadBotName');
      return;
    }
  }

  if (slotId === null) {
    // No stand-down here: two people asking Team for two bots should get two.
    const added = await addBot(ctx, callerJwt, name!);
    if ('yielded' in added || !added.ok) {
      if ('ok' in added && !added.ok) sendSyntheticEnvelope(res, added.status, added.message, added.code);
      else sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
      return;
    }
    // Every session cached this account's bots before this one existed — a
    // colleague's tab included, which holds a different JWT.
    gate.clear();
    sendJson(res, 200, added.bot);
    return;
  }

  // Awaited under a backstop: everything inside the two handlers is already
  // answered-and-caught, so this only turns an unexpected escape into a 500
  // instead of an unhandled rejection nobody sees.
  try {
    if (method === 'PATCH') await handleRenameBot(ctx, res, callerJwt, slotId, name!);
    else await handleDeleteBot(ctx, res, gate, callerJwt, slotId);
  } catch {
    if (!res.headersSent) {
      sendSyntheticEnvelope(res, 500, 'The proxy hit an unexpected error handling this bot', 'ProxyInternalError');
    }
  }
}

/**
 * The database first, because it is the one that can say no. Chatfuel second;
 * if it refuses, the name goes back — a bot called one thing here and another
 * there is worse than a rename that did not happen.
 */
async function handleRenameBot(
  ctx: ProxyContext,
  res: ServerResponse,
  callerJwt: string,
  slotId: string,
  name: string,
): Promise<void> {
  let botId: string | null;
  let previousName: string;
  try {
    const renamed = await rpcAsCaller(ctx, 'cf_rename_bot', { p_slot: slotId, p_name: name }, callerJwt);
    if (renamed.status !== 200) {
      const refused = await rpcRefusal(renamed);
      if (refused) {
        sendSyntheticEnvelope(res, refused.status, refused.message, refused.code);
        return;
      }
      throw new Error(`cf_rename_bot ${renamed.status}`);
    }
    const row = (await renamed.json()) as { bot_id?: unknown; previous_name?: unknown };
    botId = typeof row.bot_id === 'string' ? row.bot_id : null;
    previousName = typeof row.previous_name === 'string' ? row.previous_name : name;
  } catch {
    sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
    return;
  }

  // A bot still being created has no Chatfuel id to rename yet.
  if (botId && !(await renameBotUpstream(ctx, botId, name))) {
    await rpcAsCaller(ctx, 'cf_rename_bot', { p_slot: slotId, p_name: previousName }, callerJwt).catch(() => undefined);
    sendSyntheticEnvelope(res, 502, 'Chatfuel could not rename this bot', 'BotRenameFailed');
    return;
  }
  sendJson(res, 200, { id: slotId, botId, name });
}

/**
 * Chatfuel first, this side second — the opposite of a rename, and for the
 * same reason. A row without its bot is a dead entry in everybody's switcher;
 * a bot without its row is merely out of reach, and the next attempt finishes
 * the job (deleting an already-deleted bot reads as success).
 */
async function handleDeleteBot(
  ctx: ProxyContext,
  res: ServerResponse,
  activeGate: AuthGate,
  callerJwt: string,
  slotId: string,
): Promise<void> {
  let botId: string | null;
  try {
    const found = await rpcAsCaller(ctx, 'cf_bot_for_admin', { p_slot: slotId }, callerJwt);
    if (found.status !== 200) {
      const refused = await rpcRefusal(found);
      if (refused) {
        sendSyntheticEnvelope(res, refused.status, refused.message, refused.code);
        return;
      }
      throw new Error(`cf_bot_for_admin ${found.status}`);
    }
    const row = (await found.json()) as { bot_id?: unknown };
    botId = typeof row.bot_id === 'string' ? row.bot_id : null;
  } catch {
    sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
    return;
  }

  if (botId) {
    /*
     * The caller's OWN last bot, checked first and without asking Chatfuel.
     *
     * A workspace with nothing openable in it now means one thing — that
     * provisioning never finished — and the app acts on it by asking for
     * another bot. So this may not be a state somebody can put themselves in
     * on purpose: they would delete their bot and be handed a fresh one on the
     * deployment's plan. Asked as the CALLER, so the answer is the database's;
     * this request has already proved they administer the bot, and an admin
     * sees every bot of the workspace rather than only their grants.
     *
     * A reservation is not a replacement: it may never finish.
     */
    const mine = await callerWorkspace(ctx, callerJwt);
    if (mine === 'unavailable' || !mine) {
      sendSyntheticEnvelope(res, 503, BOT_CHECK_UNAVAILABLE_MESSAGE, 'BotDeleteUnavailable');
      return;
    }
    if (!mine.bots.some((bot) => bot.id !== slotId && isReady(bot))) {
      sendSyntheticEnvelope(res, 409, LAST_BOT_MESSAGE, 'LastBotInWorkspace');
      return;
    }

    const last = await isLastBotInDeploymentWorkspace(ctx, botId);
    if (last === null) {
      sendSyntheticEnvelope(res, 503, BOT_CHECK_UNAVAILABLE_MESSAGE, 'BotDeleteUnavailable');
      return;
    }
    if (last) {
      sendSyntheticEnvelope(res, 409, LAST_BOT_MESSAGE, 'LastBotInWorkspace');
      return;
    }
    if (!(await deleteBotUpstream(ctx, botId))) {
      sendSyntheticEnvelope(res, 502, 'Chatfuel could not delete this bot', 'BotDeleteFailed');
      return;
    }

    /*
     * The bot is gone upstream, so the row may let go of its id — and until it
     * does, cf_remove_bot below refuses. That is what keeps the same delete run
     * against PostgREST directly, which any caller can reach with the anon key
     * out of the bundle, from dropping a row whose bot is still alive on the
     * deployment's plan and freeing its place under both bot ceilings.
     *
     * Asked as the SERVER, because it is the server's fact: only the request
     * above knows Chatfuel no longer has this bot. If it fails the row keeps
     * its id and the delete simply has not happened; deleteBotUpstream treats
     * an already-gone bot as success, so the next attempt finishes it.
     */
    try {
      const released = await rpcAsService(ctx, 'cf_bot_deleted', { p_slot: slotId });
      if (released.status !== 200) throw new Error(`cf_bot_deleted ${released.status}`);
    } catch {
      sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
      return;
    }
  }

  try {
    const removed = await rpcAsCaller(ctx, 'cf_remove_bot', { p_slot: slotId }, callerJwt);
    if (removed.status !== 200) {
      const refused = await rpcRefusal(removed);
      if (refused) {
        sendSyntheticEnvelope(res, refused.status, refused.message, refused.code);
        return;
      }
      throw new Error(`cf_remove_bot ${removed.status}`);
    }
  } catch {
    sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
    return;
  }

  // The bot this session could reach a moment ago is gone.
  activeGate.forget(callerJwt);
  sendJson(res, 200, { id: slotId, botId });
}
