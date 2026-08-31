/**
 * The message-aware graphql-transport-ws relay: the browser's connection_init
 * is gated and consumed, the upstream socket gets the relay's own init with
 * the master token, and every other frame is relayed — upstream ones verbatim,
 * browser ones only if this relay could read them and re-serialized from what
 * it read. admitSocket below is admitRequest's twin (admission.ts) in
 * close-code vocabulary — a change to the policy there is a change to both.
 */
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import { GATE_MESSAGES, bearerOf, decodeJwtExp } from './gate.js';
import { upstreamAgent } from './egress-ws.js';
import { pathnameOf } from './envelope.js';
import { requestRefusal } from './origin.js';
import { ACCOUNT_SCOPE_MESSAGE, BOT_SCOPE_MESSAGE, botAllowed, botBlockedMessage } from './admission.js';
import {
  EXTENSIONS_MESSAGE,
  INTROSPECTION_MESSAGE,
  MALFORMED_QUERY_MESSAGE,
  accountOperationMessage,
  accountStructureMessage,
  botIdsInOperation,
  carriesExtensions,
  disallowedOperation,
  operationNotAllowedMessage,
  mayNameUpstreamService,
  neutraliseServiceName,
  ownerOf,
  scrubUpstreamErrors,
} from './queryAnalysis.js';
import { admits, operationNotShippedMessage, parses } from './operationRegistry.js';
import { mayCarryResourceIds, resourceBlockedMessage, resourceUnknownMessage } from './resourceFence.js';
import { TENANT_SOCKETS_MESSAGE } from './tenantLimits.js';
import type { GraphqlFacts } from './queryAnalysis.js';
import type { ProxyContext } from './context.js';

const GRAPHQL_WS_PROTOCOL = 'graphql-transport-ws';

interface WsFrame {
  type?: unknown;
  id?: unknown;
  payload?: {
    query?: unknown;
    operationName?: unknown;
    variables?: unknown;
    authToken?: unknown;
    authorization?: unknown;
  };
}

/** Undefined for anything that is not a readable JSON object — see BROWSER_FRAME_TYPES. */
function parseFrame(frame: string): WsFrame | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(frame);
  } catch {
    return undefined;
  }
  return typeof parsed === 'object' && parsed !== null ? (parsed as WsFrame) : undefined;
}

/**
 * Every type a browser may send once the relay has consumed its
 * connection_init. The upstream socket carries the master token, so the list is
 * closed rather than open: an unreadable frame, a type this relay does not
 * know, or a second init it would have to answer for is refused the way a
 * binary frame is, not forwarded on the strength of the upstream being strict.
 */
const BROWSER_FRAME_TYPES = new Set(['subscribe', 'complete', 'ping', 'pong']);

/**
 * scrubGraphqlResponse's twin (passthrough.ts): an upstream error naming an
 * internal service must not reach the browser over the socket either. `next`
 * carries an ordinary GraphQL envelope; `error` carries the bare error array,
 * wrapped here so the same scrubber reads it. The byte check keeps the parse
 * off every ordinary frame, which is nearly all of them.
 */
function scrubFrame(frame: string): string {
  if (!mayNameUpstreamService(frame)) return frame;
  let parsed: { type?: unknown; payload?: unknown };
  try {
    parsed = JSON.parse(frame) as typeof parsed;
  } catch {
    return frame;
  }
  if (parsed.type === 'next') scrubUpstreamErrors(parsed.payload);
  else if (parsed.type === 'error' && Array.isArray(parsed.payload)) scrubUpstreamErrors({ errors: parsed.payload });
  else return frame;
  return JSON.stringify(parsed);
}

/**
 * What a close reason may weigh on the wire. RFC 6455 gives the control frame
 * 125 bytes and two of them are the code, so `ws` throws on anything longer —
 * on the one path whose whole job is closing the socket cleanly.
 */
const CLOSE_REASON_MAX_BYTES = 123;

/**
 * The close reason the browser is given for an upstream close it must see.
 *
 * scrubFrame is the wrong tool here and would hand this straight back: it reads
 * a frame as JSON, and a close reason is bare text. So the neutralising the
 * error messages get is applied to it directly — otherwise `next` and `error`
 * are scrubbed and this one string, on the same socket, is not.
 *
 * Truncated after the scrub rather than before it, because the neutral sentence
 * can be longer than the text it replaced, and a reason that arrived inside the
 * limit can leave it over.
 */
export function closeReasonFor(reason: string): string {
  let text = neutraliseServiceName(reason);
  while (Buffer.byteLength(text, 'utf8') > CLOSE_REASON_MAX_BYTES) text = text.slice(0, -1);
  return text;
}

/**
 * The ceiling on one browser frame.
 *
 * `ws` allows 100 MiB by default, and this relay accepts frames from a socket
 * that has not been through the gate yet — the frames arrive while the gate's
 * RPC is still out. A connection that has not been let in does not get to
 * decide what it costs in memory. graphql-transport-ws frames here are an
 * operation and its variables; the whole generated document is 80 KB.
 */
const WS_MAX_FRAME_BYTES = 1024 * 1024;

/**
 * What may be held for the upstream socket while it is still connecting.
 *
 * The same window, seen from the other side: whatever a client sends behind
 * its connection_init is held here until the gate answers, so the buffer needs
 * a ceiling of its own rather than the socket's. Past the ceiling the socket
 * is closed rather than trimmed — a relay that silently dropped a subscribe
 * frame would leave the client waiting on data that is never coming.
 */
/**
 * The ceiling on one frame from upstream.
 *
 * Its own number rather than the browser's: what arrives here is a
 * subscription payload, and one of those legitimately carries a whole record
 * where a browser frame carries an operation. But `ws` still defaults to 100
 * MiB on this socket, and the relay opens one per browser connection, so the
 * default made a subscription's memory cost something nothing this side
 * chose - the same objection as above, arriving from the other direction.
 */
const WS_MAX_UPSTREAM_FRAME_BYTES = 16 * 1024 * 1024;

const WS_MAX_PENDING_FRAMES = 64;
const WS_MAX_PENDING_BYTES = 512 * 1024;

const WS_PENDING_OVERFLOW_MESSAGE = 'Too much sent before the connection was ready';

/**
 * What may be held while the resource fence asks the shared store whose an id
 * is.
 *
 * That lookup is the one thing on the frame path that is not an answer this
 * process already has, and a fence has to speak before the frame it is about
 * goes upstream — so the frame waits, and everything the client sent behind it
 * waits too, or a `complete` would overtake the `subscribe` it ends. The wait
 * is one round trip to Supabase with a two-second ceiling on it, and the queue
 * is what a real client can pipeline into that window. Past it the socket is
 * closed rather than trimmed, for the reason the ceiling above is: a dropped
 * subscribe leaves a client waiting on data that is never coming.
 */
const WS_MAX_FENCE_QUEUE = 64;

const WS_FENCE_OVERFLOW_MESSAGE = 'Too much sent while a resource was being checked';

/**
 * What the fence chain answers with when it cannot decide yet — the shared
 * resource store has to be asked first. Not a refusal and not an approval, so
 * it is neither `null` nor a message: a symbol nothing else in this file can
 * be mistaken for.
 */
const NEEDS_LOOKUP = Symbol('resource-lookup');

/**
 * How many subscriptions one socket may hold open at once.
 *
 * Each is a live stream upstream, opened under the deployment's master token
 * and paid for by this process for as long as the socket lives; a client that
 * subscribes in a loop costs the deployment without ever exceeding a frame or
 * a socket ceiling. A real client holds a handful — a canvas, a conversation
 * list, a couple of counters. Past this the `subscribe` is answered with an
 * error frame and not relayed, which is what the protocol says to do with a
 * subscription that cannot be started.
 *
 * The same map is what the resource fence reads to attribute the ids an answer
 * streams back, so an entry outlives nothing: `complete` drops it and so does
 * the socket closing.
 */
const WS_MAX_SUBSCRIPTIONS = 128;

/**
 * How long a browser socket may live before the caller has to be gated again.
 *
 * The gate runs once, at connect, and the fence it read stands for the life of
 * the socket — so a member removed from a workspace in Supabase keeps whatever
 * they had subscribed to until they disconnect. Nothing tells this proxy that
 * happened: the change is made on the customer's own Supabase project, and the
 * admin panel's `closeSockets` only covers what the panel itself does.
 *
 * So a socket is given a deadline instead. A session's own JWT expiry is the
 * natural one — past it the gate would refuse the token anyway — and this is
 * the ceiling when a token outlives it or carries no `exp` at all. The close is
 * 1012, the code the relay already uses for "reconnect through a fresh relay":
 * graphql-ws retries it, asks for a token again, and the new socket is gated
 * from scratch. What a client loses is the frames between the close and the
 * reconnect, which is the same thing a deploy costs it.
 */
const WS_MAX_SOCKET_LIFETIME_MS = 60 * 60 * 1000;

/** The close reason for that deadline. Not an error: the client reconnects. */
const WS_REVALIDATE_REASON = 'chatfuel proxy: reconnect to be re-authorised';

/** What a socket over that ceiling is told, per refused subscription. */
const WS_TOO_MANY_SUBSCRIPTIONS_MESSAGE =
  'This socket already has as many subscriptions open as the proxy will relay for one connection';

export interface WsRelay {
  /** True when the upgrade was on wsPath (socket owned by the relay). */
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean;
  /**
   * Close live browser sockets — all of them, or only those whose fence names
   * one of `botIds`.
   *
   * The fence is read once per socket, at connect, so a subscription that was
   * legitimate when it opened stays open on the frames it already asked for.
   * Dropping access is therefore only felt on the next connect unless somebody
   * ends the socket, and this is that somebody. A socket whose fence is not yet
   * known is closed too: not knowing is not the same as knowing it is unaffected.
   */
  closeSockets(botIds?: ReadonlySet<string>): void;
  close(): void;
}

export function createWsRelay(ctx: ProxyContext): WsRelay {
  const { gate, fence } = ctx;
  const { upstream, wsPath, authMode, token, allowedBotIds } = ctx.config;

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: WS_MAX_FRAME_BYTES,
    handleProtocols: (protocols) => (protocols.has(GRAPHQL_WS_PROTOCOL) ? GRAPHQL_WS_PROTOCOL : false),
  });
  /** Every timer a live socket owns — its init deadline and its lifetime — so
      closing the relay leaves nothing pending behind it. */
  const timers = new Set<ReturnType<typeof setTimeout>>();
  /** Every live browser socket, with the fence it was admitted under. */
  const live = new Map<WebSocket, () => ReadonlySet<string> | undefined>();
  /**
   * Sockets open but not yet admitted — see `wsPreAuthSockets`. A socket
   * leaves this count the moment the gate has spoken for it, whichever way,
   * and the close handler is the backstop for one that never got that far.
   */
  let preAuthSockets = 0;

  function relay(browser: WebSocket): void {
    let upstreamWs: WebSocket | undefined;
    let upstreamOpen = false;
    let browserInitSeen = false;
    /** The caller's workspaces, read once by the gate at connect. */
    let socketBotIds: ReadonlySet<string> | undefined;
    /** The deployment's own fence, read once at connect when there is no gate. */
    let socketFence: ReadonlySet<string> | undefined;
    // Browser frames buffered until the upstream socket is open — the subscribe
    // frames a client pipelines behind its connection_init without waiting for
    // the ack. They are fenced when they are flushed, not when they arrive:
    // the fence is only known once admitSocket has resolved, and a frame held
    // while it was unknown would otherwise be relayed having been checked
    // against nothing.
    const pendingToUpstream: string[] = [];
    let pendingBytes = 0;
    /**
     * The live subscriptions this socket has open, by their client-chosen id:
     * which bot each was fenced against, and the frame that opened it. Read
     * only by the resource fence, to attribute the ids an answer streams back.
     */
    const subscribed = new Map<string, { botId: string | undefined; request: string }>();
    /**
     * What the tenant limits counted this socket as, once it is admitted —
     * undefined while the fence is still unknown, and after the socket is
     * released. Kept so the release names the same tenant the count did.
     */
    let tenantKey: string | undefined;
    /** When this socket must reconnect to be gated again — see the constant. */
    let lifetimeTimer: ReturnType<typeof setTimeout> | undefined;
    /** Whether this socket is still one of the `preAuthSockets`. */
    let waitingToBeAdmitted = true;
    const doneWaiting = (): void => {
      if (!waitingToBeAdmitted) return;
      waitingToBeAdmitted = false;
      preAuthSockets -= 1;
    };

    preAuthSockets += 1;
    live.set(browser, () => socketBotIds ?? socketFence);

    const initTimer = setTimeout(() => {
      timers.delete(initTimer);
      if (!browserInitSeen && browser.readyState === WebSocket.OPEN) {
        browser.close(4408, 'Connection initialisation timeout');
      }
    }, ctx.config.wsInitTimeoutMs);
    timers.add(initTimer);

    /**
     * Gate the browser's connection_init payload; false = the socket was closed.
     * The fence — the caller's workspaces, or the deployment's — is read once,
     * at connect, and every `subscribe` frame on this socket is checked against
     * it: the per-frame check has to stay synchronous or frames would reach the
     * upstream socket out of order. A bot added mid-socket is therefore felt on
     * the next connect, not on this one.
     */
    async function admitSocket(payload: WsFrame['payload']): Promise<boolean> {
      if (gate) {
        const raw = payload?.authToken ?? payload?.authorization;
        const bearer = bearerOf(typeof raw === 'string' ? raw : undefined);
        const verdict = await gate.verify(bearer);
        if (!verdict.ok) {
          const closeCode = verdict.status === 401 ? 4401 : verdict.status === 403 ? 4403 : 1013;
          if (browser.readyState === WebSocket.OPEN) browser.close(closeCode, verdict.code);
          return false;
        }
        socketBotIds = verdict.botIds;
        // Nothing to subscribe to: refuse at connect rather than open an
        // upstream socket that can only ever be told "not yours".
        if (verdict.botIds.size === 0) {
          if (browser.readyState === WebSocket.OPEN) browser.close(4403, 'AuthTenantForbidden');
          return false;
        }
        // The fence this socket now carries is only as current as the session
        // it was read for, so the socket ends when that session would.
        const exp = bearer ? decodeJwtExp(bearer) : undefined;
        const ceiling = Date.now() + WS_MAX_SOCKET_LIFETIME_MS;
        const deadline = exp === undefined ? ceiling : Math.min(exp * 1000, ceiling);
        const lifetime = setTimeout(
          () => {
            timers.delete(lifetime);
            if (browser.readyState === WebSocket.OPEN) browser.close(1012, WS_REVALIDATE_REASON);
          },
          Math.max(1_000, deadline - Date.now()),
        );
        timers.add(lifetime);
        lifetimeTimer = lifetime;
      } else if (authMode === 'misconfigured') {
        if (browser.readyState === WebSocket.OPEN) browser.close(4500, 'ProxyAuthMisconfigured');
        return false;
      } else if (fence) {
        const answer = await fence.resolve();
        if (!answer.ok) {
          if (browser.readyState === WebSocket.OPEN) browser.close(1013, 'ProxyFenceUnavailable');
          return false;
        }
        socketFence = answer.botIds;
      }
      // The caller is known now, and with them the tenant this socket belongs
      // to. Counted here rather than at the upgrade, where there is nobody to
      // count it against yet — the window between the two has a budget of its
      // own (`wsPreAuthSockets`).
      //
      // Keyed on the session's own bots and nothing else, which is what the
      // HTTP twin does (admission.ts). Falling back to the deployment fence
      // named every caller in open mode by the same key, so the per-tenant
      // ceiling became a global one an eighth the size of `wsMaxSockets`: eight
      // anonymous connects and nobody else could open a socket. Open mode has
      // no tenants to tell apart, and its ceiling is the deployment's.
      const key = ctx.tenants.key(socketBotIds);
      if (!ctx.tenants.openSocket(key)) {
        if (browser.readyState === WebSocket.OPEN) browser.close(4429, TENANT_SOCKETS_MESSAGE);
        return false;
      }
      tenantKey = key;
      // The gate above is awaited, and a socket can go away while it is out.
      // The close handler then ran with nothing counted yet, and this count,
      // made after it, had no second close to release it — one leaked slot per
      // dropped connect, permanently: the sweep drops an entry only once its
      // sockets are back to zero. A fenced account with no bots shares one key
      // and one slot, so a single dropped connect closed WS for every account
      // in that state.
      if (browser.readyState !== WebSocket.OPEN) {
        ctx.tenants.closeSocket(tenantKey);
        tenantKey = undefined;
        return false;
      }
      return true;
    }

    function openUpstream(): void {
      if (browser.readyState !== WebSocket.OPEN) return;
      if (!token) {
        browser.close(4401, 'chatfuel proxy: token missing');
        return;
      }
      const upstreamWsUrl = `${upstream.replace(/^http/, 'ws')}/graphql`;
      const up = new WebSocket(upstreamWsUrl, GRAPHQL_WS_PROTOCOL, {
        agent: upstreamAgent(upstreamWsUrl),
        maxPayload: WS_MAX_UPSTREAM_FRAME_BYTES,
      });
      upstreamWs = up;

      up.on('open', () => {
        // The relay's own init carries the real token; the browser's payload
        // (its session JWT) was consumed by the gate and never goes upstream.
        up.send(JSON.stringify({ type: 'connection_init', payload: { authToken: `Bearer ${token}` } }));
        upstreamOpen = true;
        const held = pendingToUpstream.splice(0);
        pendingBytes = 0;
        for (const frame of held) sendUpstream(frame);
      });

      up.on('message', (data, isBinary) => {
        if (isBinary) {
          if (browser.readyState === WebSocket.OPEN) browser.send(data as Buffer);
          return;
        }
        const text = data.toString();
        // Learn on the way back, exactly as the HTTP route does on the way out.
        if (ctx.resources && subscribed.size > 0 && mayCarryResourceIds(text)) learnFromUpstream(text);
        if (browser.readyState === WebSocket.OPEN) browser.send(scrubFrame(text));
      });

      up.on('close', (code, reason) => {
        if (browser.readyState !== WebSocket.OPEN && browser.readyState !== WebSocket.CONNECTING) return;
        if (code >= 4000 && code <= 4999) {
          // Fatal application closes (4401 Unauthorized, …) pass through so the
          // browser's graphql-ws correctly refuses to retry them.
          browser.close(code, closeReasonFor(reason.toString()));
        } else {
          // 1012 Service Restart — non-fatal, the client reconnects through a
          // fresh relay.
          browser.close(1012, 'chatfuel upstream disconnected');
        }
      });
      up.on('error', () => {
        /* the 'close' handler that follows does the work */
      });

      if (browser.readyState !== WebSocket.OPEN) up.close(1000, 'browser client gone');
    }

    /**
     * One upstream frame's ids, attributed to the bot its subscription was
     * fenced against. A frame for an id this socket is not tracking teaches
     * nothing: the subscription either named no bot or named two, and neither
     * is evidence of whose an id is.
     */
    const learnFromUpstream = (text: string): void => {
      const msg = parseFrame(text);
      if (!msg || msg.type !== 'next' || typeof msg.id !== 'string') return;
      const open = subscribed.get(msg.id);
      if (!open || !ctx.resources) return;
      if (open.botId === undefined) return;
      ctx.resources.learn(open.botId, text, open.request);
    };

    const refuseBot = (blocked: unknown): { message: string; code: string } | null => {
      if (blocked === undefined) return null;
      const noWorkspace = socketBotIds?.size === 0;
      return noWorkspace
        ? { message: GATE_MESSAGES.AuthTenantForbidden, code: 'AuthTenantForbidden' }
        : { message: botBlockedMessage(String(blocked), Boolean(socketBotIds)), code: 'BotNotAllowed' };
    };

    /**
     * Bot fence: refuse subscriptions for bots this session does not own —
     * answered per-subscription so the shared socket stays healthy. The
     * operation is parsed for the ids it names, exactly as handleGraphql does
     * it; a payload that cannot be read is refused rather than relayed.
     */
    const fenceRefusal = (
      msg: WsFrame,
      facts: GraphqlFacts,
    ): { id: unknown; message: string; code: string } | null | typeof NEEDS_LOOKUP => {
      const fenceIds = socketBotIds ?? socketFence ?? allowedBotIds;
      // handleGraphql's twins, in its order. A `subscribe` frame carries any
      // operation, a query included, so every refusal the HTTP path makes needs
      // one here or the socket answers what the HTTP route would not.
      const refusal = !facts.ok
        ? { message: MALFORMED_QUERY_MESSAGE, code: 'ProxyMalformedQuery' }
        : carriesExtensions(msg.payload)
          ? { message: EXTENSIONS_MESSAGE, code: 'ProxyExtensionsUnsupported' }
          : facts.introspection
            ? { message: INTROSPECTION_MESSAGE, code: 'IntrospectionBlocked' }
            : facts.accountOperation
              ? { message: accountOperationMessage(facts.accountOperation), code: 'AccountOperationBlocked' }
              : // These three only with the gate on: without it there is one
                // account and it is the caller's own.
                facts.accountScope && socketBotIds
                ? { message: ACCOUNT_SCOPE_MESSAGE, code: 'AccountScopeBlocked' }
                : facts.botScope && socketBotIds
                  ? { message: BOT_SCOPE_MESSAGE, code: 'AccountScopeBlocked' }
                  : facts.structureOperation && socketBotIds
                    ? {
                        message: accountStructureMessage(facts.structureOperation),
                        code: 'AccountStructureBlocked',
                      }
                    : (refuseOperation(facts) ??
                      refuseBot(facts.ids.find((id) => !botAllowed(id, fenceIds))) ??
                      refuseResource(facts, fenceIds));
      if (refusal === NEEDS_LOOKUP) return NEEDS_LOOKUP;
      return refusal ? { id: msg.id, ...refusal } : null;
    };

    /**
     * The registry, per frame — and the substitution that goes with it.
     *
     * A socket is the same door the HTTP route is: a `subscribe` frame carries
     * any document at all. So the same question is asked here, first, before
     * anything is read out of the payload, and the answer is written back into
     * the frame: what is fenced below and what goes upstream at the end of
     * deliverUpstream are then one object rather than two believed to match.
     *
     * The raw client frame is untouched, and deliberately — it is what
     * `subscribed` keeps and what teaches the resource fence, which learns from
     * what the CALLER asked for. The HTTP path holds the same line with `text`.
     */
    const registryRefusal = (msg: WsFrame): { message: string; code: string } | null => {
      const registry = ctx.config.operationRegistry;
      if (!registry) return null;
      const payload = msg.payload;
      const query = payload?.query;
      // Nothing readable to check is handleGraphql's malformed body, per frame.
      if (typeof query !== 'string') return { message: MALFORMED_QUERY_MESSAGE, code: 'ProxyMalformedQuery' };
      const record = admits(registry, query);
      if (record) {
        payload!.query = record.text;
        /* Off the document, never off the frame — a caller who put another of
           the app's operation names beside a document that defines one would
           otherwise choose what upstream runs. */
        if (record.operationName === undefined) delete payload!.operationName;
        else payload!.operationName = record.operationName;
        return null;
      }
      if (!parses(query)) return { message: MALFORMED_QUERY_MESSAGE, code: 'ProxyMalformedQuery' };
      const named = payload!.operationName;
      return {
        message: operationNotShippedMessage(typeof named === 'string' ? named : undefined),
        code: 'OperationNotInRegistry',
      };
    };

    /**
     * The operation allowlist, per frame. A `subscribe` frame carries any
     * operation, so a socket is the same door the HTTP route is and needs the
     * same list on it.
     */
    const refuseOperation = (facts: GraphqlFacts): { message: string; code: string } | null => {
      const { allowedOperations } = ctx.config;
      if (!allowedOperations) return null;
      const unlisted = disallowedOperation(facts.roots, allowedOperations);
      return unlisted === undefined
        ? null
        : { message: operationNotAllowedMessage(unlisted), code: 'OperationNotAllowed' };
    };

    /**
     * The resource fence, per frame — a subscription addressed by a flow or a
     * conversation id reads the same data an HTTP query would, and reads it for
     * as long as the socket lives.
     */
    const refuseResource = (
      facts: GraphqlFacts,
      fenceIds: ReadonlySet<string> | undefined,
    ): { message: string; code: string } | null | typeof NEEDS_LOOKUP => {
      if (!ctx.resources || fenceIds === undefined) return null;
      /* The deployment may know whose an id is when this process does not, and
         the answer decides this frame. Asked here, last in the chain, so a
         frame one of the cheaper refusals above would have stopped never costs
         a round trip to Supabase. */
      if (ctx.resources.needsLookup(facts.resources)) return NEEDS_LOOKUP;
      const refusal = ctx.resources.refuse(facts.resources, fenceIds);
      if (!refusal) return null;
      return {
        message: refusal.known
          ? resourceBlockedMessage(refusal.ref.argument)
          : resourceUnknownMessage(refusal.ref.argument),
        code: 'ResourceNotAllowed',
      };
    };

    /**
     * Frames waiting on a resource lookup, and whether one is outstanding.
     *
     * Empty on every ordinary frame: the fence answers from memory and nothing
     * is queued. It fills only while the shared store is being asked, and it
     * exists because the answer must not arrive after the frames that came
     * behind the question.
     */
    const fenceQueue: string[] = [];
    let fenceWaiting = false;

    /**
     * The only path a browser frame takes to the upstream socket, so the fence
     * is reached whether the frame was relayed live or held while the upstream
     * was still connecting. Called only once the socket is admitted, which is
     * what makes the fence it reads the final one.
     *
     * Frames go through in the order they arrived, which is why anything
     * arriving while a lookup is outstanding queues behind it rather than
     * overtaking it.
     */
    function sendUpstream(frame: string): void {
      if (fenceWaiting || fenceQueue.length > 0) {
        if (fenceQueue.length >= WS_MAX_FENCE_QUEUE) {
          browser.close(4400, WS_FENCE_OVERFLOW_MESSAGE);
          return;
        }
        fenceQueue.push(frame);
        return;
      }
      deliverUpstream(frame);
    }

    /**
     * The lookup came back — deliver what was held, in order, stopping again at
     * the first frame that needs a lookup of its own.
     *
     * This terminates: `hydrate` leaves every id it asked about either bound or
     * noted as unknown, so the frame that waited is decided on the retry rather
     * than asking again.
     */
    const pumpFence = (): void => {
      fenceWaiting = false;
      while (!fenceWaiting && fenceQueue.length > 0) {
        deliverUpstream(fenceQueue.shift() as string);
      }
    };

    function deliverUpstream(frame: string): void {
      if (browser.readyState !== WebSocket.OPEN) return;
      const msg = parseFrame(frame);
      if (typeof msg?.type !== 'string' || !BROWSER_FRAME_TYPES.has(msg.type)) {
        browser.close(4400, MALFORMED_QUERY_MESSAGE);
        return;
      }
      // `subscribe` and `complete` are addressed frames, and the protocol makes
      // that address a string. Everything this relay does per subscription is
      // keyed by it — the ceiling below, the map the resource fence reads to
      // attribute what streams back, the error frame a refusal answers with —
      // so a `subscribe` that omits the id, or sends a number, is a stream this
      // side cannot account for. It used to be relayed anyway: the ceiling sat
      // inside a `typeof msg.id === 'string'` test while the send past it was
      // unconditional, so a client that left the id off opened as many upstream
      // subscriptions under the master token as it liked, none of them counted.
      if ((msg.type === 'subscribe' || msg.type === 'complete') && typeof msg.id !== 'string') {
        browser.close(4400, MALFORMED_QUERY_MESSAGE);
        return;
      }
      // A frame is fenced for what it carries, not for what it calls itself: a
      // payload with a query in it gets read whatever `type` sits beside it.
      const carriesOperation = msg.type === 'subscribe' || msg.payload?.query !== undefined;
      // First and narrowest, and it rewrites the frame it admits — see above.
      const unshipped = carriesOperation ? registryRefusal(msg) : null;
      if (unshipped) {
        browser.send(
          JSON.stringify({
            id: msg.id,
            type: 'error',
            payload: [{ message: unshipped.message, extensions: { code: unshipped.code } }],
          }),
        );
        return;
      }
      const facts = carriesOperation ? botIdsInOperation(msg.payload) : undefined;
      const refusal = facts ? fenceRefusal(msg, facts) : null;
      if (refusal === NEEDS_LOOKUP) {
        // Back to the head of the queue: it is the oldest frame here, and it
        // goes upstream before anything that arrived while this was decided.
        fenceWaiting = true;
        fenceQueue.unshift(frame);
        void Promise.resolve(ctx.resources?.hydrate(facts?.resources ?? [])).then(pumpFence, pumpFence);
        return;
      }
      if (refusal) {
        browser.send(
          JSON.stringify({
            id: refusal.id,
            type: 'error',
            payload: [{ message: refusal.message, extensions: { code: refusal.code } }],
          }),
        );
        return;
      }
      // Past the fence: remember whose subscription this is, so what it
      // streams back can teach the resource fence. Only for a subscription
      // naming exactly one bot — with two, an id in the answer came from a
      // guess. `complete` drops the entry, and so does the socket closing.
      // Both id tests below are settled by the guard at the top of this function;
      // they stay because narrowing an `unknown` is what tells the compiler that.
      if (msg.type === 'complete' && typeof msg.id === 'string') subscribed.delete(msg.id);
      if (msg.type === 'subscribe' && typeof msg.id === 'string') {
        if (!subscribed.has(msg.id) && subscribed.size >= WS_MAX_SUBSCRIPTIONS) {
          browser.send(
            JSON.stringify({
              id: msg.id,
              type: 'error',
              payload: [{ message: WS_TOO_MANY_SUBSCRIPTIONS_MESSAGE, extensions: { code: 'TooManySubscriptions' } }],
            }),
          );
          return;
        }
        // Whose subscription this is, so what it streams back can teach the
        // resource fence. Only a subscription naming exactly one bot teaches —
        // with two, an id in the answer came from a guess — but every one is
        // recorded, because this map is also what the ceiling above counts.
        const named = facts ? facts.ids.filter((id): id is string => typeof id === 'string') : [];
        subscribed.set(msg.id, { botId: ownerOf(named), request: frame });
      }
      // Sent as this relay read it, not as it arrived: JSON.parse keeps the last
      // of two duplicate keys and another parser may keep the first, so a frame
      // like {"type":"subscribe","type":"ping"} could be fenced as one thing and
      // run upstream as another.
      upstreamWs?.send(JSON.stringify(msg));
    }

    browser.on('message', (data, isBinary) => {
      // graphql-transport-ws is JSON over text frames. A binary one carries an
      // operation this relay cannot read, and what it cannot read it does not
      // forward under the master token — the same answer sendUpstream gives an
      // unreadable text frame.
      if (isBinary) {
        if (browser.readyState === WebSocket.OPEN) browser.close(4400, MALFORMED_QUERY_MESSAGE);
        return;
      }
      const frame = data.toString();
      if (!browserInitSeen) {
        const msg = parseFrame(frame);
        // Per the protocol, connection_init is the first message or there is no
        // connection. Holding anything else until the gate had spoken meant
        // flushing it upstream later against a fence that did not exist yet.
        if (msg?.type !== 'connection_init') {
          if (browser.readyState === WebSocket.OPEN) browser.close(4401, 'Unauthorized');
          return;
        }
        browserInitSeen = true;
        clearTimeout(initTimer);
        timers.delete(initTimer);
        // Discarded after the gate: the relay sends its own init upstream.
        void admitSocket(msg.payload).then(
          (admitted) => {
            doneWaiting();
            if (admitted) openUpstream();
          },
          () => {
            doneWaiting();
            if (browser.readyState === WebSocket.OPEN) browser.close(4401, 'Unauthorized');
          },
        );
        return;
      }
      if (upstreamOpen && upstreamWs) {
        sendUpstream(frame);
        return;
      }
      pendingBytes += frame.length;
      if (pendingToUpstream.length >= WS_MAX_PENDING_FRAMES || pendingBytes > WS_MAX_PENDING_BYTES) {
        browser.close(4400, WS_PENDING_OVERFLOW_MESSAGE);
        return;
      }
      pendingToUpstream.push(frame);
    });

    browser.on('close', () => {
      doneWaiting();
      clearTimeout(initTimer);
      timers.delete(initTimer);
      if (lifetimeTimer) {
        clearTimeout(lifetimeTimer);
        timers.delete(lifetimeTimer);
        lifetimeTimer = undefined;
      }
      live.delete(browser);
      if (tenantKey !== undefined) {
        ctx.tenants.closeSocket(tenantKey);
        tenantKey = undefined;
      }
      pendingToUpstream.length = 0;
      pendingBytes = 0;
      fenceQueue.length = 0;
      fenceWaiting = false;
      subscribed.clear();
      if (upstreamWs && (upstreamWs.readyState === WebSocket.OPEN || upstreamWs.readyState === WebSocket.CONNECTING)) {
        upstreamWs.close(1000, 'browser client gone');
      }
    });
    browser.on('error', () => {
      /* close follows */
    });
  }

  /** An upgrade this relay owns but will not complete, answered as plain HTTP. */
  const refuseUpgrade = (socket: Duplex, status: number, text: string): void => {
    socket.write(`HTTP/1.1 ${status} ${text}\r\nconnection: close\r\ncontent-length: 0\r\n\r\n`);
    socket.destroy();
  };

  function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean {
    const pathname = pathnameOf(req);
    // Anything else (Vite's own HMR socket included) must pass through
    // untouched — being a pure no-op for non-matching sockets is what lets
    // multiple 'upgrade' listeners coexist on one httpServer.
    if (pathname !== wsPath) return false;
    /*
     * Origin AND host, the same pair the HTTP routes ask and through the same
     * function, because this listener is bolted to the bare httpServer: no
     * middleware runs before it, so a check that is not made here is not made.
     *
     * The origin is asked because a WebSocket has no preflight to stop it —
     * `new WebSocket(...)` from any page opens a cross-origin socket, and with
     * the gate off the answers, live subscription data under the master token,
     * come back readable. The host is asked because the origin cannot answer
     * for it: a name the caller owns, resolved to this server, produces an
     * `Origin` and a `Host` that agree with each other and with nothing else.
     */
    if (requestRefusal(req, { origin: ctx.config.originPolicy, host: ctx.config.hostPolicy }) !== undefined) {
      refuseUpgrade(socket, 403, 'Forbidden');
      return true;
    }
    if (wss.clients.size >= ctx.config.wsMaxSockets) {
      refuseUpgrade(socket, 503, 'Service Unavailable');
      return true;
    }
    /* The deployment's ceiling counts every socket the same, and a socket that
       has not sent its connection_init yet has shown nothing to be counted
       against — no session, no tenant, nothing but the cost of holding it. So
       the unadmitted have a ceiling of their own, and reaching it refuses the
       next upgrade rather than the sockets already through. */
    if (preAuthSockets >= ctx.config.wsPreAuthSockets) {
      refuseUpgrade(socket, 503, 'Service Unavailable');
      return true;
    }
    wss.handleUpgrade(req, socket, head, relay);
    return true;
  }

  function closeSockets(botIds?: ReadonlySet<string>): void {
    for (const [browser, fenceOf] of live) {
      const held = fenceOf();
      if (botIds && held && ![...botIds].some((id) => held.has(id))) continue;
      if (browser.readyState === WebSocket.OPEN || browser.readyState === WebSocket.CONNECTING) {
        browser.close(4401, 'Unauthorized');
      }
      live.delete(browser);
    }
  }

  function close(): void {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    for (const clientWs of wss.clients) clientWs.terminate();
    live.clear();
    wss.close();
  }

  return { handleUpgrade, closeSockets, close };
}
