/**
 * Who may pass, and which bots they may name — the admission sequence and the
 * fences, shared by every HTTP route. The WS relay's admitSocket
 * (wsRelay.ts) is this module's twin in close-code vocabulary — a change to
 * the policy here is a change to both.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { bearerOf } from './gate.js';
import { sendSyntheticEnvelope } from './envelope.js';
import { MISCONFIGURED_MESSAGE } from './proxyConfig.js';
import { TENANT_BUSY_MESSAGE } from './tenantLimits.js';
import type { ProxyContext } from './context.js';

export const botBlockedMessage = (botId: string, session: boolean): string =>
  session ? `Bot ${botId} belongs to another workspace` : `Bot ${botId} is not one this deployment may use`;

/** What a gated caller reading beyond their own row of `currentUser` is told. */
export const ACCOUNT_SCOPE_MESSAGE =
  'This query asks about the Chatfuel account behind the deployment, not about your workspace';

/**
 * The same answer one step further in: the caller holds the bot, but the fields
 * they selected under it — its workspace's other bots, its Chatfuel team, its
 * API token — are the account's rather than the bot's.
 */
export const BOT_SCOPE_MESSAGE =
  'This query reads the Chatfuel account behind the deployment through a bot, rather than the bot itself';

/**
 * Three fences, in order of authority. With the gate on, the caller's own
 * workspaces are it. With it off, either a list frozen at startup or — the
 * default — the bots of every workspace the deployment's account owns, asked
 * for at request time and cached. `undefined` means no fence.
 *
 * `{ ok: false }` is the one case that stops a request outright: nothing is
 * known yet and Chatfuel could not be asked, so no answer would be honest.
 *
 * A request that names no bot passes every fence — most operations address a
 * flow, a contact or a conversation by id, and those ids are not derivable
 * from a bot id.
 */
export type FenceLookup = { ok: true; ids: ReadonlySet<string> | undefined } | { ok: false };

export async function fenceFor(ctx: ProxyContext, admission: Admission): Promise<FenceLookup> {
  if (admission.botIds) return { ok: true, ids: admission.botIds };
  if (!ctx.fence) return { ok: true, ids: ctx.config.allowedBotIds };
  const answer = await ctx.fence.resolve();
  return answer.ok ? { ok: true, ids: answer.botIds } : { ok: false };
}

/**
 * No fence at all is the one deliberate pass: nothing was configured to check
 * against, and the deployment's own token is the whole authority.
 *
 * Everything else is weighed as it is, and an id that is not a string is
 * refused rather than read as "cannot check, so allow": a value this proxy
 * cannot match against a fence is a value it cannot vouch for, and it would go
 * upstream under the master token.
 */
export const botAllowed = (botId: unknown, fenceIds: ReadonlySet<string> | undefined): boolean =>
  !fenceIds || (typeof botId === 'string' && fenceIds.has(botId));

/**
 * The gate → misconfig → token-missing sequence every proxied HTTP request
 * goes through before anything is read or forwarded. Resolves true when the
 * request may proceed; false when a synthetic envelope has been sent.
 */
/**
 * Admission carries the fence with it: `botIds` is the set this caller may
 * touch (from the gate), or `undefined` when the gate is off and the static
 * `allowedBotIds` env fence applies instead. `null` means the response is
 * already written.
 */
export interface Admission {
  botIds: ReadonlySet<string> | undefined;
  /**
   * What the tenant limits know this caller as, undefined when there is no
   * fence to name them by. Carried so a later stage counts the same tenant the
   * request was admitted as.
   */
  tenantKey: string | undefined;
}

export async function admitRequest(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<Admission | null> {
  let sessionBotIds: ReadonlySet<string> | undefined;
  if (ctx.gate) {
    const verdict = await ctx.gate.verify(bearerOf(req.headers.authorization));
    if (!verdict.ok) {
      sendSyntheticEnvelope(res, verdict.status, verdict.message, verdict.code);
      return null;
    }
    sessionBotIds = verdict.botIds;
  } else if (ctx.config.authMode === 'misconfigured') {
    sendSyntheticEnvelope(res, 500, MISCONFIGURED_MESSAGE, 'ProxyAuthMisconfigured');
    return null;
  }
  if (!ctx.config.token) {
    sendSyntheticEnvelope(res, 500, ctx.tokenMissingMessage, 'ProxyTokenMissing');
    return null;
  }
  // Counted once the caller is known and before anything is read or forwarded:
  // what this bounds is how much of a shared deployment one tenant may spend,
  // and a request refused here costs a hash and nothing else.
  const tenantKey = ctx.tenants.key(sessionBotIds);
  if (!ctx.tenants.takeRequest(tenantKey)) {
    res.setHeader('retry-after', '5');
    sendSyntheticEnvelope(res, 429, TENANT_BUSY_MESSAGE, 'TenantBusy');
    return null;
  }
  return { botIds: sessionBotIds, tenantKey };
}
