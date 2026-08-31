/**
 * The two forwarded routes: GraphQL POSTs and the REST passthrough. Both admit
 * the caller, check the fence against every bot the request names, and hand
 * the body to the upstream with the master token injected.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GATE_MESSAGES } from './gate.js';
import { FENCE_UNAVAILABLE_MESSAGE } from './workspaceFence.js';
import { readBodyCapped, refuseOversizedBody, searchOf, send405, sendSyntheticEnvelope } from './envelope.js';
import {
  EXTENSIONS_MESSAGE,
  INTROSPECTION_MESSAGE,
  MALFORMED_QUERY_MESSAGE,
  accountOperationMessage,
  accountStructureMessage,
  disallowedOperation,
  factsOfBody,
  operationNotAllowedMessage,
  mayNameUpstreamService,
  ownerOf,
  readGraphqlBody,
  scrubUpstreamErrors,
  serializeGraphqlBody,
} from './queryAnalysis.js';
import { admits, operationNotShippedMessage, parses } from './operationRegistry.js';
import { resourceBlockedMessage, resourceUnknownMessage } from './resourceFence.js';
import type { Admission } from './admission.js';
import {
  ACCOUNT_SCOPE_MESSAGE,
  BOT_SCOPE_MESSAGE,
  admitRequest,
  botAllowed,
  botBlockedMessage,
  fenceFor,
} from './admission.js';
import { forward } from './upstream.js';
import type { ProxyContext } from './context.js';

/**
 * The ceiling on a forwarded GraphQL body, and on a REST one.
 *
 * Both routes hold the whole body in memory — the GraphQL one has to, to parse
 * the operation before it can fence it — so with no ceiling the caller chose
 * how much memory the proxy spent, before any check had run.
 *
 * 2 MiB is far above anything this app sends: the largest single operation is a
 * flow save, a whole canvas of blocks travelling as variables, and the biggest
 * document in the repository is 80 KB of operations TOGETHER. The REST ceiling
 * is the upload one instead, because /api/filestorage carries files; it matches
 * the limit the publishing media route already applies (publishingMedia.ts).
 */
const GRAPHQL_MAX_BYTES = 2 * 1024 * 1024;
const REST_MAX_BYTES = 25 * 1024 * 1024;

/** What both routes answer when the body ran past the ceiling. */
const TOO_LARGE_MESSAGE = 'That request body is too large for this proxy to forward';
const BATCH_TOO_LARGE_MESSAGE = 'That request carries more operations than this proxy will forward at once';

/**
 * `readBodyCapped`, minus the rejection.
 *
 * The stream fails when the caller disconnects mid-upload, which is a thing any
 * caller can do at any time and not an error on this side. Unhandled, that
 * rejection ended the process for everyone else on the proxy. `undefined` means
 * the request is gone and there is nobody left to answer; `null` still means the
 * body ran past the cap.
 */
async function readBodyOrGone(req: IncomingMessage, maxBytes: number): Promise<Buffer | null | undefined> {
  try {
    return await readBodyCapped(req, maxBytes);
  } catch {
    return undefined;
  }
}

/**
 * The one content type a GraphQL POST may arrive with.
 *
 * Not pedantry about correctness — it is half of the CSRF story. A cross-origin
 * `fetch` with `content-type: application/json` is not a simple request, so the
 * browser asks permission first and this proxy never grants it; the same fetch
 * with `text/plain`, `application/x-www-form-urlencoded` or `multipart/form-data`
 * IS simple, and goes out with no preflight at all. origin.ts refuses those on
 * the origin, and this refuses them on the shape, because two locks on the one
 * door that leads to the master token is the right number.
 *
 * A request with NO content-type is refused too, and that is the point of the
 * second lock rather than an oversight in it. A POST with no content-type at
 * all is itself a simple request — it is the one shape a page can send
 * cross-site with no preflight and no header to declare — so treating a
 * missing header as permission would leave exactly the hole the present ones
 * close. Nothing legitimate loses: the only client of this proxy is the app
 * this package ships, and every HTTP library sends the header on a JSON body.
 */
function graphqlContentTypeAllowed(req: IncomingMessage): boolean {
  const header = req.headers['content-type'];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return false;
  return value.split(';')[0]!.trim().toLowerCase() === 'application/json';
}

export const UNSUPPORTED_MEDIA_TYPE_MESSAGE = 'A GraphQL request must be sent as application/json';

/**
 * The query string a forwarded GraphQL POST carries upstream: `?op=<name>` and
 * nothing else.
 *
 * The caller's own string used to travel whole, which made it a second place a
 * request could say what to run — beside the body this proxy read and fenced.
 * Whether Chatfuel reads `?query=` on a POST is not something this side can
 * know, and it does not have to: the app appends exactly one parameter, `op`,
 * and its only purpose is legible logs (api-client transport/http.ts — "ignored
 * by the server but keeps proxy/upstream logs readable"). Carrying that one
 * forward keeps the logs and closes the question.
 */
function forwardedSearch(req: IncomingMessage): string {
  const op = new URLSearchParams(searchOf(req).slice(1)).get('op');
  return op ? `?op=${encodeURIComponent(op)}` : '';
}

/** What a caller is told when this instance is already carrying all it will carry. */
const GRAPHQL_BUSY_MESSAGE = 'This proxy is carrying as many requests as it can — try again shortly';

/**
 * The route the app talks through, under the same ceiling the upload route has
 * had all along.
 *
 * The body limit was never a limit on the process: N requests of 2 MiB cost N
 * times as much, N was the caller's to choose, and each one holds an upstream
 * connection for as long as Chatfuel takes to answer. Counted from here rather
 * than from the body read, because admission is the last thing that is free —
 * everything after it spends memory or an upstream socket — and released in a
 * `finally` so a thrown answer does not leak a slot for the life of the
 * process.
 */
export async function handleGraphql(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!graphqlContentTypeAllowed(req)) {
    sendSyntheticEnvelope(res, 415, UNSUPPORTED_MEDIA_TYPE_MESSAGE, 'UnsupportedMediaType');
    return;
  }
  const admission = await admitRequest(ctx, req, res);
  if (!admission) return;
  if (ctx.graphqlInFlight >= ctx.config.graphqlMaxConcurrent) {
    res.setHeader('retry-after', '5');
    sendSyntheticEnvelope(res, 503, GRAPHQL_BUSY_MESSAGE, 'ProxyBusy');
    return;
  }
  ctx.graphqlInFlight += 1;
  try {
    await forwardGraphql(ctx, req, res, admission);
  } finally {
    ctx.graphqlInFlight -= 1;
  }
}

async function forwardGraphql(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  admission: Admission,
): Promise<void> {
  const { upstream, token, slowTimeoutMs } = ctx.config;
  const body = await readBodyOrGone(req, GRAPHQL_MAX_BYTES);
  if (body === undefined) return;
  if (body === null) {
    refuseOversizedBody(req, res, 'RequestTooLarge', TOO_LARGE_MESSAGE);
    return;
  }
  const text = body.toString();
  // Read once and kept: what goes upstream is built from this, not forwarded as
  // it arrived. See GraphqlBody in queryAnalysis.ts for why.
  const parsed = readGraphqlBody(text);
  // Nothing is known about a body that will not parse, so no fence can speak
  // for it: it stops here rather than going upstream under the master token.
  if (!parsed) {
    sendSyntheticEnvelope(res, 400, MALFORMED_QUERY_MESSAGE, 'ProxyMalformedQuery');
    return;
  }
  /* Counted before anything is parsed, because the count is what the rest of
     this function costs: every entry is a document to admit, to parse and to
     read facts out of, and the body ceiling above bounds the bytes rather than
     the entries. Upstream it is one POST and here it is one slot and one token
     from the tenant's minute, so without this a batch is the one thing on this
     route whose work is not what it was charged for. */
  if (parsed.entries.length > ctx.config.graphqlMaxBatch) {
    sendSyntheticEnvelope(res, 413, BATCH_TOO_LARGE_MESSAGE, 'BatchTooLarge');
    return;
  }
  if (parsed.extensions) {
    sendSyntheticEnvelope(res, 400, EXTENSIONS_MESSAGE, 'ProxyExtensionsUnsupported');
    return;
  }
  /* The narrowest document check and so the first one: a document this app
     never shipped is refused before anything is read out of it.

     Every other fence answers "may this caller name that field?", which is a
     check on names and cannot tell one shape of `bot { ... }` from another. A
     caller composing their own document out of root fields the allowlist has to
     permit — the app itself sends them — passes all of them. This one compares
     whole documents, so there is nothing to compose.

     What goes upstream is the RECORD's text and the RECORD's operation name. On
     an exact match those are the caller's own bytes; on a canonical one they
     are not, and that is the whole point of the second lane: the caller chooses
     which of the app's documents runs, never what is in it.

     A host that passed no `operations` has no registry and asks nothing — apps
     scaffolded before the barrel existed still have to boot, and the startup
     line says out loud that the check is not there. An app that shipped an
     EMPTY list is the opposite case and refuses everything: it said what it
     sends, and it sends nothing. */
  const { operationRegistry } = ctx.config;
  if (operationRegistry) {
    for (const entry of parsed.entries) {
      const record = admits(operationRegistry, entry.query);
      if (!record) {
        /* Which refusal it is, and not merely that it is one. A document that
           will not parse is a syntax error wherever it was written; a document
           that parses and is unknown is a document missing from the app's
           barrel. One code for both would send half of the people who hit this
           looking in the wrong file. */
        if (!parses(entry.query)) {
          sendSyntheticEnvelope(res, 400, MALFORMED_QUERY_MESSAGE, 'ProxyMalformedQuery');
          return;
        }
        // A batch is admitted whole or not at all, the same way it is fenced.
        sendSyntheticEnvelope(res, 403, operationNotShippedMessage(entry.operationName), 'OperationNotInRegistry');
        return;
      }
      entry.query = record.text;
      /* Read from the document, never from the body. A caller who put another
         of the app's operation names beside a document that defines one would
         otherwise choose what upstream runs. */
      if (record.operationName === undefined) delete entry.operationName;
      else entry.operationName = record.operationName;
    }
  }
  const {
    ok,
    ids,
    accountScope,
    botScope,
    slow,
    accountOperation,
    structureOperation,
    introspection,
    resources,
    roots,
  } = factsOfBody(parsed);
  if (!ok) {
    sendSyntheticEnvelope(res, 400, MALFORMED_QUERY_MESSAGE, 'ProxyMalformedQuery');
    return;
  }
  // Introspection names no bot either, and it asks for the shape of the whole
  // API rather than for anything this deployment's caller owns. Refused with
  // the gate on or off: the app is built against a bundled SDL snapshot, and
  // nothing in the repository introspects through the proxy.
  if (introspection) {
    sendSyntheticEnvelope(res, 403, INTROSPECTION_MESSAGE, 'IntrospectionBlocked');
    return;
  }
  // An account-level operation names no bot, so every fence lets it through —
  // including the deployment's own, and including no fence at all. Refused
  // whether the gate is on or off: it is the master token's authority being
  // asked for, not any one caller's.
  if (accountOperation) {
    sendSyntheticEnvelope(res, 403, accountOperationMessage(accountOperation), 'AccountOperationBlocked');
    return;
  }
  if (accountScope && admission.botIds) {
    sendSyntheticEnvelope(res, 403, ACCOUNT_SCOPE_MESSAGE, 'AccountScopeBlocked');
    return;
  }
  if (botScope && admission.botIds) {
    sendSyntheticEnvelope(res, 403, BOT_SCOPE_MESSAGE, 'AccountScopeBlocked');
    return;
  }
  // A structural operation names either no bot or the caller's own, so no fence
  // stops it — and what it changes is which workspaces and bots this deployment
  // has, which is the deployer's shape rather than the caller's content. Only
  // with the gate on: without one the caller IS the deployer.
  if (structureOperation && admission.botIds) {
    sendSyntheticEnvelope(res, 403, accountStructureMessage(structureOperation), 'AccountStructureBlocked');
    return;
  }
  // Last of the document checks and widest: an operation nobody in this app
  // writes is refused whoever asks. It runs after the denylists so that an
  // operation on both lists — `workspaceCreateBot` is one, since the app's own
  // bot route is built from it — is refused with the reason that explains it.
  const { allowedOperations } = ctx.config;
  if (allowedOperations) {
    const unlisted = disallowedOperation(roots, allowedOperations);
    if (unlisted !== undefined) {
      sendSyntheticEnvelope(res, 403, operationNotAllowedMessage(unlisted), 'OperationNotAllowed');
      return;
    }
  }
  // Only a request that names a bot needs the fence — and only then is it
  // worth refusing one because the fence could not be resolved. An operation
  // addressing a flow or a contact is unaffected by not knowing the answer,
  // and the query that lists the workspaces is how the app recovers.
  const named = ids.filter((id): id is string => typeof id === 'string');
  // An operation that named a bot in a shape no fence can match is not an
  // operation that named none: forwarding it was the fence being skipped, not
  // the fence answering.
  if (named.length < ids.length) {
    sendSyntheticEnvelope(res, 400, MALFORMED_QUERY_MESSAGE, 'ProxyMalformedQuery');
    return;
  }
  // The resource fence needs the same answer the bot fence does, so a request
  // that names only a flow asks for it too — and pays the same 503 when it
  // cannot be had, since with a resource fence on, "cannot check" is no longer
  // "nothing to check".
  const fenced = ctx.resources && resources.length > 0;
  let fenceIds: ReadonlySet<string> | undefined;
  if (named.length > 0 || fenced) {
    const lookup = await fenceFor(ctx, admission);
    if (!lookup.ok) {
      sendSyntheticEnvelope(res, 503, FENCE_UNAVAILABLE_MESSAGE, 'ProxyFenceUnavailable');
      return;
    }
    fenceIds = lookup.ids;
    const blocked = named.find((id) => !botAllowed(id, fenceIds));
    if (blocked !== undefined) {
      // No workspace at all is a session-level problem — the app answers it by
      // provisioning one — while a bot that belongs to somebody else is not.
      if (admission.botIds?.size === 0) {
        sendSyntheticEnvelope(res, 403, GATE_MESSAGES.AuthTenantForbidden, 'AuthTenantForbidden');
        return;
      }
      sendSyntheticEnvelope(res, 403, botBlockedMessage(blocked, Boolean(admission.botIds)), 'BotNotAllowed');
      return;
    }
  }
  if (ctx.resources && fenced) {
    // What this process does not remember, the deployment may: the shared
    // store is consulted before the fence decides, and only for the ids it
    // holds nothing about. Without one this resolves at once.
    await ctx.resources.hydrate(resources);
    const refusal = ctx.resources.refuse(resources, fenceIds);
    if (refusal) {
      const { ref, known } = refusal;
      const message = known ? resourceBlockedMessage(ref.argument) : resourceUnknownMessage(ref.argument);
      sendSyntheticEnvelope(res, 403, message, 'ResourceNotAllowed');
      return;
    }
  }
  await forward(
    ctx,
    res,
    `${upstream}/graphql${forwardedSearch(req)}`,
    {
      method: 'POST',
      // Built from scratch: client Authorization/cookies are stripped by
      // construction, never merged — the browser's session JWT stays here.
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      // This proxy's own bytes, not the caller's: the request that was fenced
      // and the request that runs are one object rather than two believed to
      // match. See GraphqlBody in queryAnalysis.ts.
      body: serializeGraphqlBody(parsed),
      ...(slow ? { timeoutMs: slowTimeoutMs } : {}),
    },
    (raw, contentType) => {
      // Learn on the way out: this answer was produced for one bot the caller
      // holds, so every id in it that the caller did not already have is that
      // bot's. Only for a request naming exactly one bot — with two, which one
      // an id came from is a guess. One bot named twice (the document and the
      // variables both carry it) is still one bot, hence the set.
      const owner = ownerOf(named);
      if (ctx.resources && owner && contentType?.includes('application/json')) {
        ctx.resources.learn(owner, raw.toString(), text);
      }
      return scrubGraphqlResponse(raw, contentType);
    },
  );
}

/**
 * Keep an internal service name out of a relayed GraphQL error envelope. A body
 * that names no service — every ordinary answer — is passed through untouched;
 * the cheap byte check keeps the parse off that hot path.
 */
function scrubGraphqlResponse(body: Buffer, contentType: string | null): Buffer {
  if (!contentType || !contentType.includes('application/json')) return body;
  if (!mayNameUpstreamService(body)) return body;
  let payload: unknown;
  try {
    payload = JSON.parse(body.toString());
  } catch {
    return body;
  }
  const scrubbed = Array.isArray(payload) ? payload.map(scrubUpstreamErrors) : scrubUpstreamErrors(payload);
  return Buffer.from(JSON.stringify(scrubbed));
}

/**
 * The REST paths this route forwards. It is an allowlist and not a passthrough
 * because everything under `{upstream}/api` answers to the master token, while
 * the fence here reads a single `botID` query parameter — a path that carries
 * its bot some other way, or names none, would be forwarded with the
 * deployment's full authority and nothing to check it against.
 *
 * The app's REST surface is five upload endpoints and nothing else: GraphQL
 * never takes file bytes, so an upload is REST and returns a FileID that a
 * mutation then references (modules/core/skill/references/files-tasks.md, which
 * is also what the agent skills tell a coding agent to use). Everything else a
 * module needs is a GraphQL operation on the other route.
 *
 * A module that genuinely needs another Chatfuel REST endpoint adds it here,
 * in this file, having decided what fences it.
 */
const REST_ALLOWED_PATHS: ReadonlyMap<string, 'bot' | 'account'> = new Map([
  ['/filestorage/upload/bot', 'bot'], // CSV imports, catalog images, specialist avatars
  ['/filestorage/upload/livechat', 'bot'], // chat attachments
  ['/filestorage/upload/plugin', 'bot'], // flow-builder media, WhatsApp template headers
  ['/filestorage/upload/widget', 'bot'], // the web widget's avatar
  ['/filestorage/upload/useraccount', 'account'], // profile pictures
]);

/**
 * Every upload is a POST, and the method is written rather than forwarded. A
 * DELETE or a PATCH to an allowlisted path would otherwise go upstream under
 * the master token to whatever the endpoint does with one — a question this
 * proxy has no answer to and does not need to ask.
 */
const REST_METHOD = 'POST';

/** What a bot-scoped path with no botID is answered with. */
const BOT_ID_REQUIRED_MESSAGE = 'This upload must name the bot it is for, as ?botID=';

/**
 * `useraccount` writes to the Chatfuel account behind the master token rather
 * than to any one bot, so with the gate on it is the same class of thing
 * ACCOUNT_OPERATIONS refuses on the GraphQL route: nothing fences it, and the
 * caller who reaches it is not the account's owner. With the gate off the
 * caller IS whoever runs the deployment, and it is theirs to call.
 */
const ACCOUNT_UPLOAD_MESSAGE =
  'This upload acts on the Chatfuel account behind this deployment rather than on a bot, so the proxy does not forward it';

/** What a caller is told when this instance is already carrying all it will carry. */
const REST_BUSY_MESSAGE = 'This proxy is carrying as many uploads as it can — try again shortly';

/** What a request naming more than one bot is answered with. */
const AMBIGUOUS_BOT_MESSAGE = 'One botID per request';

/**
 * Every bot this query string names, under any spelling of the parameter.
 *
 * Parsed rather than matched: a regex over the raw string finds the first
 * `botID=` and stops, so `?botID=mine&botID=theirs` would be fenced against
 * `mine` and forwarded whole — and an upstream that takes the last value, or
 * that reads `botid`, would act on `theirs`. `URLSearchParams` also does the
 * percent-decoding once, in the same way the receiver will.
 */
function botIdsIn(search: string): string[] {
  const found: string[] = [];
  for (const [name, value] of new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)) {
    if (name.toLowerCase() === 'botid') found.push(value);
  }
  return found;
}

export async function handleRest(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  const { upstream, token, apiPath } = ctx.config;
  if ((req.method ?? 'GET').toUpperCase() !== REST_METHOD) {
    send405(res, REST_METHOD);
    return;
  }
  const admission = await admitRequest(ctx, req, res);
  if (!admission) return;
  const search = searchOf(req);
  const path = pathname.slice(apiPath.length);
  // Before the fence, because this is not a question about which bot: a path
  // the app never calls is one nothing here knows how to check, and it is
  // refused whether or not the caller was admitted.
  const scope = REST_ALLOWED_PATHS.get(path);
  if (scope === undefined) {
    sendSyntheticEnvelope(res, 403, `This proxy does not forward ${path}`, 'RestPathNotAllowed');
    return;
  }
  if (scope === 'account' && ctx.config.authMode === 'on') {
    sendSyntheticEnvelope(res, 403, ACCOUNT_UPLOAD_MESSAGE, 'AccountOperationBlocked');
    return;
  }
  const rest = `${path}${search}`;
  const named = botIdsIn(search);
  if (named.length > 1) {
    // The fence can only check one value; upstream reads one too, and which one
    // it picks is its business. Two of them is a request no client sends by
    // accident, and the only reason to send it is to have the two disagree.
    sendSyntheticEnvelope(res, 400, AMBIGUOUS_BOT_MESSAGE, 'InvalidRequest');
    return;
  }
  const botParam = named[0];
  // A bot-scoped path with no botID had no fence applied to it at all: the
  // upload went upstream under the master token, and which bot it landed on was
  // between the caller and Chatfuel.
  if (scope === 'bot' && botParam === undefined) {
    sendSyntheticEnvelope(res, 400, BOT_ID_REQUIRED_MESSAGE, 'InvalidRequest');
    return;
  }
  const lookup = botParam ? await fenceFor(ctx, admission) : { ok: true as const, ids: undefined };
  if (!lookup.ok) {
    sendSyntheticEnvelope(res, 503, FENCE_UNAVAILABLE_MESSAGE, 'ProxyFenceUnavailable');
    return;
  }
  if (botParam && !botAllowed(botParam, lookup.ids)) {
    if (admission.botIds?.size === 0) {
      sendSyntheticEnvelope(res, 403, GATE_MESSAGES.AuthTenantForbidden, 'AuthTenantForbidden');
      return;
    }
    sendSyntheticEnvelope(res, 403, botBlockedMessage(botParam, Boolean(admission.botIds)), 'BotNotAllowed');
    return;
  }
  // Counted from here, where the memory starts being spent, and released in a
  // `finally` so a thrown answer does not leak a slot for the life of the
  // process.
  if (ctx.restInFlight >= ctx.config.restMaxConcurrent) {
    res.setHeader('retry-after', '5');
    sendSyntheticEnvelope(res, 503, REST_BUSY_MESSAGE, 'ProxyBusy');
    return;
  }
  ctx.restInFlight += 1;
  try {
    const body = await readBodyOrGone(req, REST_MAX_BYTES);
    if (body === undefined) return;
    if (body === null) {
      refuseOversizedBody(req, res, 'RequestTooLarge', TOO_LARGE_MESSAGE);
      return;
    }
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    // Multipart uploads need their boundary; everything else client-sent
    // (cookies included) stays behind.
    const contentType = req.headers['content-type'];
    if (contentType) headers['content-type'] = contentType;
    await forward(ctx, res, `${upstream}/api${rest}`, { method: REST_METHOD, headers, body });
  } finally {
    ctx.restInFlight -= 1;
  }
}
