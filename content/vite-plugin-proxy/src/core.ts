/**
 * Chatfuel proxy core — "shape A" of the CORS-proxy pattern (described in the
 * chatfuel-core skill's cors-proxy.md reference), host-agnostic.
 *
 * - POST <httpPath>   → {upstream}/graphql with Authorization injected
 *                       server-side; client Authorization/cookies never
 *                       forwarded (outgoing headers are built from scratch).
 * - <apiPath>/*       → {upstream}/api/* passthrough (REST file uploads),
 *                       same Authorization injection.
 * - WS <wsPath>       → message-aware graphql-transport-ws relay: the relay
 *                       waits for the browser's connection_init, gates it,
 *                       and only then opens the upstream socket and sends its
 *                       own connection_init {authToken: "Bearer …"}; every
 *                       other frame is relayed verbatim in both directions.
 * - POST <authPath>/provision (gate on + SUPABASE_SERVICE_ROLE_KEY +
 *                       CHATFUEL_WORKSPACE_ID) → the bots this account has,
 *                       adding the first one if it has none. Bots are created
 *                       here with the master token, inside the Chatfuel
 *                       workspace the deployment bills to.
 * - POST <authPath>/bots (same requirements) → another bot for the caller's
 *                       workspace; PATCH and DELETE <authPath>/bots/<id> rename
 *                       and delete one. Chatfuel and the database are kept in
 *                       step here because only this side holds the master token.
 * - POST <authPath>/recovery-link (same requirements) → an admin-issued
 *                       password-recovery link.
 * - <adminPath>/*     (ADMIN_PASSWORD set) → the admin panel: the account
 *                       behind the master token, its workspaces and its bots,
 *                       created, renamed and deleted. Authorized by a signed
 *                       cookie minted from that password and by NOTHING else —
 *                       see adminRoutes.ts for why it reaches past every fence
 *                       below.
 * - <publishingPath>/*   (same requirements) → the Instagram publish queue: the
 *                       posts a deployment has written, the media it uploaded
 *                       for them, and the callback its own database knocks on
 *                       when one falls due. See publishing.ts for
 *                       why any of it exists.
 *
 * The auth gate (gate.ts) sits in front of everything that would reach
 * Chatfuel: with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set, every HTTP call
 * and every WS connect must carry the user's Supabase session token, and every
 * bot named in the request must belong to a workspace that session is a member
 * of. Nothing else ever gets the CHATFUEL_TOKEN injected. Neither set → open
 * mode (the pre-auth behaviour, byte for byte); one but not the other → fail
 * closed with 500 ProxyAuthMisconfigured.
 *
 * Without the gate, a second fence applies (workspaceFence.ts): the bots of
 * every workspace the token's account owns, asked for at request time and
 * cached, so a bot created after the deployment went up is usable at once. A
 * caller may pass `allowedBotIds` to freeze that list, or 'any' to drop it.
 *
 * What no fence covers, and none can: an operation that names a flow, a contact
 * or a conversation instead of a bot. Those ids are unguessable and issued per
 * bot, but they are not checked here — Chatfuel has one account behind the
 * master token, so it will not check them either.
 *
 * When the upstream socket dies the browser socket is closed (upstream
 * 4000-4999 codes pass through so fatal auth closes are not retried;
 * anything else becomes 1012 Service Restart) — the browser's graphql-ws
 * client then reconnects through a fresh relay with its own spec backoff,
 * and the api-client's onReconnect fires naturally.
 *
 * The token comes from the CHATFUEL_TOKEN env var (a merged bag of .env +
 * process.env is passed in by the host — vite.ts / server.ts). Never log
 * request bodies, variables, emails or any token.
 *
 * node:http + `ws` only — no `vite` import here: this directory is vendored
 * into scaffolded apps as `vendor/chatfuel-proxy/`, and the same core serves
 * the Vite dev server (vite.ts) and the production server (server.ts).
 *
 * This file assembles the proxy from its per-concern modules and re-exports
 * their public surface, so every host keeps importing from one place.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { send405, pathnameOf, sendSyntheticEnvelope } from './envelope.js';
import { SAME_ORIGIN_ONLY, applyRequestPolicy } from './origin.js';
import type { RequestRefusal } from './origin.js';
import {
  resolveProxyConfig,
  type ChatfuelProxy,
  type ChatfuelProxyOptions,
  type ProxyEnv,
  type ResolvedProxyConfig,
} from './proxyConfig.js';
import { createProxyContext } from './context.js';
import { handleGraphql, handleRest } from './passthrough.js';
import { handleProvision, handleBots } from './botRoutes.js';
import { handleRecoveryLink } from './recoveryLink.js';
import {
  handlePublishingConfig,
  handlePublishingRegister,
  handlePublishingPosts,
  handlePublishDue,
} from './publishing.js';
import { handlePublishingMedia } from './publishingMedia.js';
import { handleAdmin } from './adminRoutes.js';
import { createWsRelay } from './wsRelay.js';
import { setSecurityHeaders } from './securityHeaders.js';

/* Each host prints the proxy on its own startup line, so this belongs with the rest of what the proxy says about itself. */
export { describeEgress, describeProxy } from './egress.js';

export { sendJson, sendSyntheticEnvelope, readBody, readBodyCapped, refuseOversizedBody } from './envelope.js';
export { graphqlErrorCodes } from './queryAnalysis.js';
export {
  normalizeOrigin,
  DEFAULT_MEDIA_BUCKET,
  MISCONFIGURED_MESSAGE,
  WORKSPACE_MISSING_MESSAGE,
  describeProblem,
  describeAuthMode,
  resolveProxyConfig,
} from './proxyConfig.js';
export type {
  ProxyAuthOptions,
  ChatfuelProxyOptions,
  ProxyEnv,
  ProxyAdminMode,
  ProxyAuthMode,
  ProxyProblem,
  ResolvedProxyAuth,
  ResolvedProxyPublishing,
  ResolvedProxyConfig,
  ChatfuelProxy,
} from './proxyConfig.js';
export { buildOperationRegistry, canonicalKey } from './operationRegistry.js';
export type { OperationModule, OperationRecord, OperationRegistry } from './operationRegistry.js';
export { PROVISION_FAILED_MESSAGE, LAST_BOT_MESSAGE } from './botRoutes.js';
export { ADMIN_HOME_WORKSPACE_MESSAGE, ADMIN_WORKSPACE_GOES_MESSAGE } from './adminRoutes.js';
export {
  ADMIN_COOKIE,
  ADMIN_HEADER,
  ADMIN_MIN_PASSWORD_LENGTH,
  ADMIN_MISCONFIGURED_MESSAGE,
  ADMIN_SESSION_MS,
  signAdminSession,
  verifyAdminSession,
} from './adminSession.js';
export { HOST_FORBIDDEN_MESSAGE, ORIGIN_FORBIDDEN_MESSAGE } from './origin.js';
export type { HostPolicy, OriginPolicy } from './origin.js';
export { publishOperation } from './publishing.js';
export type { PublishRow } from './publishing.js';
export { parseMultipartFile } from './publishingMedia.js';
export {
  configWarnings,
  fetchAuthSettings,
  parseAuthSettings,
  reachableBeyondLoopback,
  reportAuthSettingsWarnings,
  serveRefusals,
  signupWarnings,
} from './startupWarnings.js';
export type { AuthSettings, StartupWarningConfig } from './startupWarnings.js';

/** The one answer for a request this deployment does not serve — wrong name, or wrong caller. */
const sendRequestRefusal = (res: ServerResponse, refusal: RequestRefusal): void =>
  sendSyntheticEnvelope(res, 403, refusal.message, refusal.code);

let rejectionGuardInstalled = false;

/**
 * The health route, and the same path on every host.
 *
 * It sits inside the proxy's public prefix rather than at the root, because at
 * the root it is not the proxy's to claim: `/healthz` on Vercel matches the SPA
 * rewrite and answers 200 with `index.html`, which is a liveness check that is
 * green because it never reached the proxy at all. One path here, one in the
 * dev server, one in the serverless function — a monitor written against one
 * host works against the others.
 */
export const HEALTH_PATH = '/chatfuel/healthz';

/**
 * The one health answer: `{"ok":…}` and the status code, nothing else.
 *
 * The route is open to anyone who can reach the deployment, so the body says
 * healthy or not and stops there. `authMode` used to be in it, volunteering to
 * an unauthenticated caller whether the gate is off or half-wired — their first
 * question, answered before they asked. The startup log says why, to the
 * deployer.
 */
export function serveHealth(config: ResolvedProxyConfig, res: ServerResponse): void {
  const ok = config.problems.length === 0;
  res.statusCode = ok ? 200 : 503;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  setSecurityHeaders(res);
  res.end(JSON.stringify({ ok }));
}

/**
 * The floor under every promise this process runs.
 *
 * Since Node 15 an unhandled rejection ends the process, so one caller who
 * hangs up mid-upload, or one path nobody thought to catch, takes the proxy
 * down for everyone connected to it. The handlers here answer their own
 * rejections; this catches whatever is left - a timer, a stream, a callback
 * that was never awaited - and turns it into a log line.
 *
 * Only the hosts that own their process call this: `createChatfuelServer` and
 * the Vercel function. The Vite plugin mounts this core inside someone else's
 * dev server and has no business deciding how that process handles its own
 * rejections. Installing twice is a no-op, so a host with several servers in it
 * does not stack listeners.
 */
export function guardUnhandledRejections(logError: (line: string) => void = console.error): void {
  if (rejectionGuardInstalled) return;
  rejectionGuardInstalled = true;
  process.on('unhandledRejection', (reason: unknown) => {
    const detail = reason instanceof Error ? (reason.stack ?? reason.message) : String(reason);
    logError(`[chatfuel-proxy] unhandled rejection, kept running: ${detail}`);
  });
}

/**
 * Runs a route handler and answers its rejection.
 *
 * Every handler below is async and every call site used to be a bare `void`,
 * which is what makes a rejection an unhandled one - and Node ends the process
 * for those. A single request with a truncated body took the whole proxy down
 * with it, for every other caller on it. The one who asked gets the 500 they
 * should have had, the socket goes if the answer had already started, and the
 * server stays up.
 */
function settle(res: ServerResponse, work: Promise<void>): void {
  work.catch((error: unknown) => {
    console.error('[chatfuel-proxy] a route handler rejected', error);
    if (res.headersSent || res.writableEnded) {
      res.destroy();
      return;
    }
    sendSyntheticEnvelope(res, 500, 'The proxy could not handle this request', 'ProxyHandlerFailed');
  });
}

export function createChatfuelProxy(options: ChatfuelProxyOptions = {}, env: ProxyEnv = {}): ChatfuelProxy {
  const config = resolveProxyConfig(options, env);
  const ctx = createProxyContext(config, options.fence);
  const { httpPath, apiPath, authPath, publishingPath, adminPath } = config;

  type Route = (req: IncomingMessage, res: ServerResponse) => void;

  /**
   * The route this path names, or null when the path is not this proxy's — in
   * which case the host answers it and `handleRequest` says so by returning
   * false.
   *
   * Matching is kept apart from running so that the origin policy has somewhere
   * to stand: it must refuse a cross-site request before any handler sees it,
   * and it must answer a preflight for a path this proxy actually claims rather
   * than for every path on the deployment.
   */
  function matchRoute(pathname: string): Route | null {
    if (pathname === httpPath) {
      return (req, res) => {
        if (req.method !== 'POST') {
          send405(res, 'POST');
          return;
        }
        settle(res, handleGraphql(ctx, req, res));
      };
    }
    if (pathname === apiPath || pathname.startsWith(`${apiPath}/`)) {
      return (req, res) => settle(res, handleRest(ctx, req, res, pathname));
    }
    if (config.provisionRoute && pathname === `${authPath}/provision`) {
      return (req, res) => settle(res, handleProvision(ctx, req, res));
    }
    if (config.provisionRoute && (pathname === `${authPath}/bots` || pathname.startsWith(`${authPath}/bots/`))) {
      return (req, res) => settle(res, handleBots(ctx, req, res, pathname));
    }
    if (config.recoveryLinkRoute && pathname === `${authPath}/recovery-link`) {
      return (req, res) => settle(res, handleRecoveryLink(ctx, req, res));
    }
    // Not claimed without ADMIN_PASSWORD, so a deployment that never asked for
    // a panel answers the host's own 404 and the app reads that as "no panel".
    if (config.adminRoute && (pathname === adminPath || pathname.startsWith(`${adminPath}/`))) {
      return (req, res) => settle(res, handleAdmin(ctx, req, res, pathname));
    }
    // Not claiming these paths when the queue is unmounted is deliberate: the
    // host's own 404 is what tells the app to keep its posts in the browser.
    if (config.publishingQueueRoute) {
      if (pathname === `${publishingPath}/config`) {
        return (req, res) => settle(res, handlePublishingConfig(ctx, req, res));
      }
      if (pathname === `${publishingPath}/register`) {
        return (req, res) => settle(res, handlePublishingRegister(ctx, req, res));
      }
      if (pathname === `${publishingPath}/publish-due`) {
        return (req, res) => settle(res, handlePublishDue(ctx, req, res));
      }
      if (pathname === `${publishingPath}/media`) {
        return (req, res) => settle(res, handlePublishingMedia(ctx, req, res));
      }
      if (pathname === `${publishingPath}/posts` || pathname.startsWith(`${publishingPath}/posts/`)) {
        return (req, res) => settle(res, handlePublishingPosts(ctx, req, res, pathname));
      }
    }
    return null;
  }

  const isAdminPath = (pathname: string): boolean =>
    config.adminRoute && (pathname === adminPath || pathname.startsWith(`${adminPath}/`));

  function handleRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const pathname = pathnameOf(req);
    if (pathname === undefined) return false;
    const route = matchRoute(pathname);
    if (route === null) return false;
    /* The panel answers its own origin only — see SAME_ORIGIN_ONLY. The host
       policy is not narrowed with it: it is a statement about this server, and
       this server is the same one whichever route was asked for. */
    const origin = isAdminPath(pathname) ? SAME_ORIGIN_ONLY : config.originPolicy;
    if (!applyRequestPolicy(req, res, { origin, host: config.hostPolicy }, sendRequestRefusal)) return true;
    route(req, res);
    return true;
  }

  const relay = createWsRelay(ctx);
  /* So the admin routes can end the subscriptions a revoked grant was feeding:
     the socket fence is read once, at connect, and nothing else would notice. */
  ctx.closeSockets = relay.closeSockets;

  function close(): void {
    relay.close();
    ctx.gate?.clear();
    // The fence snapshot must not outlive the instance that asked for it.
    ctx.fence?.clear();
    // Whatever the resource fence has queued for the shared table goes now:
    // after this there is no timer left to send it on.
    void ctx.resourceStore?.flush();
    ctx.resourceStore?.close();
  }

  return { config, handleRequest, handleUpgrade: relay.handleUpgrade, close };
}
