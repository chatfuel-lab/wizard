/**
 * The proxy's options, their resolution against the env bag, and how the
 * resolved configuration describes itself on a startup line.
 */
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { ADMIN_MIN_PASSWORD_LENGTH, ADMIN_MISCONFIGURED_MESSAGE } from './adminSession.js';
import type { HostPolicy, OriginPolicy } from './origin.js';
import { ALLOWED_ROOT_FIELDS } from './allowedOperations.js';
import { buildOperationRegistry, type OperationModule, type OperationRegistry } from './operationRegistry.js';
import type { ResourceFenceMode } from './resourceFence.js';
import type { WorkspaceFenceOptions } from './workspaceFence.js';

export interface ProxyAuthOptions {
  /** The Supabase project URL. */
  supabaseUrl: string;
  /** The publishable (or legacy anon) key. */
  anonKey: string;
  /** Positive-answer cache TTL. Default 30 000. */
  cacheTtlMs?: number;
  /** Gate RPC name. Default 'cf_my_bot_ids'. */
  rpcName?: string;
  /**
   * The Supabase secret / service-role key. Optional; when present (or in
   * env as SUPABASE_SERVICE_ROLE_KEY) the admin recovery-link route is mounted.
   * Never leaves the server.
   */
  serviceRoleKey?: string;
  /** Test injection for every Supabase call; defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
}

export interface ChatfuelProxyOptions {
  /** Explicit upstream; else CHATFUEL_API_BASE from env; else 'https://panel.chatfuel.com'. */
  upstream?: string;
  /** Default '/chatfuel/graphql'. */
  httpPath?: string;
  /** Default: same as httpPath (POST vs Upgrade disambiguate). */
  wsPath?: string;
  /** Default '/chatfuel/api' → forwarded to {upstream}/api. */
  apiPath?: string;
  /** Default '/chatfuel/auth' — the proxy's own auth routes (recovery-link). */
  authPath?: string;
  /** Default '/chatfuel/publishing' — the Instagram publish queue's own routes. */
  publishingPath?: string;
  /** Default '/chatfuel/admin' — the admin panel's own routes. */
  adminPath?: string;
  /**
   * The admin panel's password. Default: ADMIN_PASSWORD from env, which is
   * unprefixed and therefore server-only — it must never reach a bundle.
   *
   * Unset → the admin routes are not claimed at all and the host answers 404,
   * exactly as the publish queue does when it is not configured. Set but
   * shorter than ADMIN_MIN_PASSWORD_LENGTH → adminMode 'misconfigured', and
   * the routes answer 500 rather than 404: a panel that quietly is not there
   * teaches the operator nothing.
   */
  adminPassword?: string;
  /**
   * The salt the admin cookie's signing key is derived with. Default:
   * ADMIN_COOKIE_SALT from env, and failing that a digest of this deployment's
   * own secrets (see the resolution below).
   *
   * It does not have to be secret, but it does have to differ between
   * deployments and stay the same across restarts and across the instances of
   * one deployment: it is what stops a single precomputed table, built once
   * against a constant baked into this source, from covering every deployment
   * that runs this code. Changing it invalidates every live admin session.
   */
  adminCookieSalt?: string;
  /**
   * The origins, besides this deployment's own, whose pages may call the proxy
   * from a browser. Default: ALLOWED_ORIGINS from env, comma-separated.
   *
   * Same-origin is always allowed and needs no entry here — this is for an app
   * served from somewhere other than the proxy. Each entry is a scheme and host
   * as a browser writes an Origin (`https://app.example.com`), never a path and
   * never a wildcard host.
   *
   * `'*'` allows every origin WITH credentials, which the CORS spec forbids a
   * browser to do and this proxy therefore does by hand. It is not a shortcut
   * for "I could not get the list right": it means every page on the internet
   * may spend this deployment's master token. Only for a proxy that is already
   * unreachable from the public internet.
   */
  allowedOrigins?: string | readonly string[];
  /**
   * The host names this deployment answers to, as they arrive in `Host`.
   * Default: ALLOWED_HOSTS from env, plus the hosts already named by
   * `allowedOrigins` and `publicUrl`, which are the same statement made for a
   * different reason.
   *
   * This is the answer to DNS rebinding and nothing else. `Origin` says which
   * page is calling and is checked separately; this says whether the address
   * that page used is one of ours. A name someone else owns, pointed at this
   * server, produces a matching `Origin` and `Host` pair honestly — so the
   * origin check passes it, and only a list of our own names does not.
   *
   * Entries are hostnames (`app.example.com`) or authorities (`app.example.com:8080`);
   * a bare hostname matches any port. Loopback is always allowed and needs no
   * entry: a request cannot arrive as `localhost` from a page served elsewhere.
   *
   * `'*'` turns the check off. The case it is for is a tunnel — ngrok, a
   * Cloudflare tunnel, a preview URL — where the name changes every run and
   * listing it is not possible; naming that one host is still better than '*'.
   * When neither this nor `publicUrl` nor `allowedOrigins` says anything AND
   * the bind is not loopback, the check does not run at all: see hostAllowed.
   */
  allowedHosts?: string | readonly string[];
  /**
   * True when the socket is bound to loopback. Default: false — the safe
   * direction, since a caller that gets this wrong loses a check rather than
   * gaining a refusal it cannot explain.
   *
   * The vite plugin and the standalone server both know their bind and pass it;
   * a serverless function is never loopback and leaves it alone.
   */
  loopbackOnly?: boolean;
  /**
   * How many REST uploads may be in flight at once. Default: REST_MAX_CONCURRENT
   * from env, or 8.
   *
   * The REST route reads a body of up to 25 MiB, so the ceiling on one request
   * was never a ceiling on the process: N of them cost N times as much, and N
   * was whatever the caller chose. Over the limit the answer is a 503 that
   * reads nothing.
   */
  restMaxConcurrent?: number;
  /**
   * How many GraphQL requests may be in flight at once. Default:
   * GRAPHQL_MAX_CONCURRENT from env, or 32.
   *
   * Same reason as the REST ceiling and a different number: one GraphQL body is
   * 2 MiB rather than 25, and this is the route the whole app talks through, so
   * a ceiling as low as the upload one would refuse ordinary use. It exists
   * because without it the count is whatever the caller opens — the body size
   * was never a ceiling on the process. Over the limit the answer is a 503 that
   * reads nothing.
   */
  graphqlMaxConcurrent?: number;
  /**
   * How many operations one GraphQL body may carry. Default:
   * GRAPHQL_MAX_BATCH from env, or 25.
   *
   * A batch is one request to every ceiling above — one slot, one token from
   * the tenant's minute — and as many documents to parse and to run as it has
   * entries. The 2 MiB body limit bounds the bytes, not the count, and the
   * count is what the work is proportional to. The shell sends no batches at
   * all; the array form is accepted because the protocol has it, so the
   * default is room for a client that uses it rather than a number this app
   * has ever needed.
   */
  graphqlMaxBatch?: number;
  /**
   * Whether requests naming a resource INSIDE a bot — a flow, a block, a
   * contact, a conversation — are checked against the bot it was handed out
   * under. Default: CHATFUEL_RESOURCE_FENCE from env, or `bound` with the gate
   * on and `off` without it (with no gate there is one tenant, and nothing to
   * be foreign to).
   *
   * See resourceFence.ts for what each mode costs and covers. `strict` is
   * opt-in: it refuses ids this instance has not seen handed out, which a
   * multi-instance deployment cannot promise.
   */
  resourceFence?: ResourceFenceMode;
  /**
   * Whether the resource fence's bindings are shared through the deployment's
   * own Supabase project instead of living only in this process. Default:
   * CHATFUEL_RESOURCE_STORE from env, or on wherever it can be — a resource
   * fence that is not off and a service-role key to reach the table with.
   *
   * It is what makes `bound` hold across instances and across restarts, and
   * what makes `strict` mean "this deployment never handed that id out" rather
   * than "this process did not". See resourceStore.ts.
   */
  resourceStore?: 'on' | 'off';
  /**
   * Whether an operation this app does not send is refused before any other
   * question about it is asked. Default: CHATFUEL_OPERATION_ALLOWLIST from env,
   * or `on` with the gate on and `off` without it — with no gate the caller is
   * the deployer, and refusing them a field of their own account's schema is
   * friction with nothing on the other side of it.
   *
   * The list is generated from the shipped modules' documents
   * (allowedOperations.ts). An app that sends operations of its own adds them
   * with `operationAllowlistExtra` rather than turning this off.
   *
   * Behind the gate, `off` is not enough on its own: it also needs
   * CHATFUEL_OPERATION_ALLOWLIST_OFF=1 in the environment, or it is ignored and
   * the startup line says so.
   */
  operationAllowlist?: 'on' | 'off';
  /**
   * Root fields to allow beside the generated list — the escape hatch for an
   * app that writes its own operations. Default:
   * CHATFUEL_OPERATION_ALLOWLIST_EXTRA from env, comma-separated.
   */
  operationAllowlistExtra?: readonly string[];
  /**
   * The app's own generated GraphQL namespaces — `operations` from
   * src/operationDocs.ts, the barrel the wizard writes for the selected
   * modules. Given them, the proxy admits the documents they hold and refuses
   * every other one; given nothing, it does not ask the question at all, which
   * is what an app scaffolded before the barrel existed gets until it
   * regenerates.
   *
   * An empty array is not the same as omitting it: an app that says it ships no
   * operations is taken at its word and everything is refused. Fail-closed is
   * the point of the fence.
   */
  operations?: readonly OperationModule[];
  /**
   * How many browser WebSockets one instance will hold. Default:
   * WS_MAX_SOCKETS from env, or 256.
   */
  wsMaxSockets?: number;
  /**
   * How many requests one TENANT may send per minute, as a token bucket that
   * also holds a minute's worth as burst. Default: TENANT_REQUESTS_PER_MINUTE
   * from env, or 600.
   *
   * Only felt with a fence to key a tenant by; see tenantLimits.ts.
   */
  tenantRequestsPerMinute?: number;
  /**
   * How many browser WebSockets one TENANT may hold at once, out of
   * `wsMaxSockets`. Default: TENANT_MAX_SOCKETS from env, or 8.
   */
  tenantMaxSockets?: number;
  /**
   * The secret the publish queue's scheduler and this server share, so each can
   * tell that a request came from the other. Default: PUBLISHING_SECRET
   * from env. Without it nothing is scheduled — the queue still stores posts,
   * it just never fires — and the callback route refuses every request.
   */
  publishingSecret?: string;
  /**
   * The host's deployment-protection bypass token, recorded when the queue is
   * registered so the scheduler's callback is not turned away at the edge
   * before any of this code runs. Default: VERCEL_AUTOMATION_BYPASS_SECRET from
   * env, which the host sets on its own deployments.
   */
  bypassSecret?: string;
  /**
   * The Supabase Storage bucket the composer's uploads go into. Default:
   * PUBLISHING_MEDIA_BUCKET from env, or 'cf-pub-media'.
   *
   * It has to match what the publishing migration created, because the two
   * sides address the same objects: the migration makes the bucket and the
   * public-read policy, this side writes into it and hands Instagram the
   * public URL. They are configured from one value for that reason — the
   * wizard writes this name into the .env and into the migration it renders.
   *
   * A name is a path segment in a storage URL this code builds, so anything
   * that is not one is not a name: a value outside [A-Za-z0-9._-] is dropped
   * and the default stands, the same way an absurd ceiling is not a ceiling.
   */
  mediaBucket?: string;
  /**
   * How many megabytes of media ONE BOT may keep in that bucket. Default:
   * PUBLISHING_MEDIA_QUOTA_MB from env, or 512.
   *
   * The per-file ceiling says nothing about how many files there are, and the
   * bucket is billed by the byte and read by anybody: without this, an account
   * with one bot can fill the operator's storage a legal upload at a time.
   */
  mediaQuotaMb?: number;
  /**
   * How many days an object no post refers to is kept. Default:
   * PUBLISHING_MEDIA_TTL_DAYS from env, or 30.
   *
   * The composer uploads before it saves, so a draft abandoned mid-compose
   * leaves bytes behind that nothing will ever name again. Old AND unreferenced
   * is the pair that makes one safe to let go — recent-and-unreferenced is the
   * post somebody is still writing.
   */
  mediaTtlDays?: number;
  /**
   * Where this deployment answers from the outside — 'https://posts.example.com'.
   * Default: PUBLIC_URL from env.
   *
   * Two routes need it, and both attach a credential to the address they name:
   * registering the publish queue tells the scheduler where to post the shared
   * secret every minute, and the recovery-link route builds a working
   * password-reset URL. Deriving either from a request header would let whoever
   * sends the request choose where that credential lands, so an unset value is
   * a refusal, not a fallback. Set it on any deployment that terminates TLS
   * elsewhere or serves more than one name — including local dev, where
   * 'http://localhost:5173' is the right value.
   */
  publicUrl?: string;
  /** Env var holding the Chatfuel API token. Default 'CHATFUEL_TOKEN'. */
  tokenEnv?: string;
  /** Explicit token override (tests); wins over the env var. */
  token?: string;
  /**
   * The Chatfuel workspace every provisioned bot is created in — Chatfuel's
   * BILLING container, the one the deployer's plan is paid on. Default:
   * CHATFUEL_WORKSPACE_ID from env. Without it the provisioning route answers
   * ProxyAuthMisconfigured rather than creating bots that bill nowhere.
   */
  workspaceId?: string;
  /** Upstream HTTP timeout. Default 30_000. */
  timeoutMs?: number;
  /**
   * Budget for the handful of upstream mutations that block on somebody else's
   * work rather than on Chatfuel's. Default 290_000.
   *
   * Publishing a Reel sits inside the mutation while Instagram transcodes the
   * video — the schema says up to five minutes — so the ordinary timeout turns
   * every video publish into a failure that already succeeded. It is a separate
   * number rather than a raised default because a dead upstream must still be
   * felt in thirty seconds for the other several hundred operations.
   *
   * The ceiling is the host's, not ours: a serverless function that is killed at
   * five minutes takes the request with it, so this stays just under that.
   */
  slowTimeoutMs?: number;
  /**
   * Bot ids this deployment may touch, fixed at startup. Checked against
   * `variables.botID` on HTTP operations and WS subscribe frames, and the
   * `botID` query param on REST calls — a guardrail orthogonal to the auth
   * gate (operations addressing objects by contact/message id alone carry no
   * botID).
   *
   * Default: none of the above — the fence is asked for at request time
   * instead (workspaceFence.ts), so a bot created after the deployment went
   * up is usable without a rebuild. Pass a list to freeze it, or 'any' to
   * turn the whole check off.
   */
  allowedBotIds?: string[] | 'any';
  /** Tuning and test injection for the request-time fence. */
  fence?: Pick<WorkspaceFenceOptions, 'ttlMs' | 'retryMs' | 'timeoutMs' | 'fetch' | 'now'>;
  /**
   * The auth gate. Default: resolved from env (VITE_SUPABASE_URL +
   * VITE_SUPABASE_ANON_KEY → on; neither → off; one of them →
   * misconfigured, fail closed). An object forces the gate on with these
   * values; `false` never gates (tests, trusted single-user dev).
   */
  auth?: ProxyAuthOptions | false;
  /** How long the relay waits for the browser's connection_init. Default 5 000. */
  wsInitTimeoutMs?: number;
  /**
   * How many sockets may be waiting to be admitted at once. Default:
   * WS_PRE_AUTH_SOCKETS from env, or 32.
   *
   * `wsMaxSockets` is counted from the upgrade, and `tenantMaxSockets` cannot
   * be counted until the gate has answered — so between those two a socket
   * that has shown nothing holds one of the deployment's places for as long as
   * `wsInitTimeoutMs` allows. This is the budget for that window, and it is a
   * small fraction of the total on purpose: what it protects is the sockets
   * already admitted, which keep running while the unadmitted contend for
   * this. Refusing a legitimate connect during a flood is the price; dropping
   * the sessions of everyone already signed in is what it buys off.
   */
  wsPreAuthSockets?: number;
  /**
   * Trust `x-forwarded-for` as the key of the admin-password throttle.
   * Default: TRUST_FORWARDED_FOR from env is 'true' or '1'; otherwise false.
   * Turn this on ONLY behind an edge that writes that header itself (Vercel, a
   * reverse proxy) — without one it lets a caller forge a fresh throttle key
   * per request and slip the speed bump. Off, the counter keys on the socket
   * address.
   *
   * This governs the throttle key and nothing else. Whether the admin cookie
   * carries `Secure` is decided separately, from the socket and the host (see
   * isSecureRequest), so a deployment that must leave this off does not thereby
   * ship a session cookie without `Secure`.
   */
  trustForwardedFor?: boolean;
  /**
   * Let the recovery-link route write its link to the server log. Default:
   * AUTH_RECOVERY_LINK_LOG from env is 'true' or '1'; otherwise false, and the
   * route answers 501 rather than logging. The link is a working credential
   * for the account it names, so writing it is a deliberate choice about who
   * may read this deployment's logs — not something a deployment falls into by
   * having a service-role key.
   */
  recoveryLinkLogging?: boolean;
}

/** A merged env bag: `{ ...loadEnv(mode, envDir, ''), ...process.env }` in Vite, `process.env` in prod. */
export type ProxyEnv = Record<string, string | undefined>;

export type ProxyAuthMode = 'on' | 'off' | 'misconfigured';

export type ProxyProblem =
  'ProxyTokenMissing' | 'ProxyAuthMisconfigured' | 'ProxyWorkspaceMissing' | 'ProxyAdminPasswordWeak';

/** 'off' = no ADMIN_PASSWORD, and the routes are not claimed at all. */
export type ProxyAdminMode = 'on' | 'off' | 'misconfigured';

export interface ResolvedProxyAuth {
  supabaseUrl: string;
  anonKey: string;
  cacheTtlMs: number;
  rpcName: string;
  serviceRoleKey: string | undefined;
  fetch: typeof globalThis.fetch | undefined;
}

/**
 * The origin part of a configured public URL, or undefined.
 *
 * Anything that is not an absolute http(s) URL is dropped rather than patched
 * up: this value decides where a credential is posted, and a half-understood
 * one is worse than none, because none falls back to the request's own Host and
 * is at least constrained by what the platform routes.
 */
export function normalizeOrigin(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}

/** The publish queue's own settings. Contains secrets — never log it. */
export interface ResolvedProxyPublishing {
  /** Raw shared secret. This side holds the value; the database holds its sha256. */
  publishSecret: string | undefined;
  /** The host's deployment-protection bypass, passed on to the database at registration. */
  bypassSecret: string | undefined;
}

export interface ResolvedProxyConfig {
  upstream: string;
  httpPath: string;
  wsPath: string;
  apiPath: string;
  authPath: string;
  publishingPath: string;
  adminPath: string;
  tokenEnv: string;
  timeoutMs: number;
  slowTimeoutMs: number;
  wsInitTimeoutMs: number;
  /** Undefined = missing/invalid → every proxied request answers 500 ProxyTokenMissing. */
  token: string | undefined;
  /** A frozen fence. Undefined = either the request-time fence or no fence at all. */
  allowedBotIds: ReadonlySet<string> | undefined;
  /** True when the fence is the account's workspaces, resolved per request. */
  dynamicFence: boolean;
  /**
   * Where this deployment answers from the outside, as an origin — configured,
   * never derived. Undefined = the routes that need to name their own address
   * refuse rather than guess.
   *
   * Nothing here reads `Host`, `X-Forwarded-Host` or `Origin` to build a URL:
   * every one of those is chosen by whoever sends the request, and both places
   * that need an address attach something worth stealing to it — the secret the
   * scheduler posts back, and a password-recovery token.
   */
  publicUrl: string | undefined;
  /** The Chatfuel workspace provisioned bots are created in. Undefined = the route cannot run. */
  workspaceId: string | undefined;
  /**
   * The workspace this deployment is ABOUT: the one it bills to with the gate
   * on (CHATFUEL_WORKSPACE_ID), the one it opens on without it
   * (VITE_CHATFUEL_WORKSPACE_ID). Only the admin panel reads it, and it reads
   * it for one reason: deleting the last bot of a workspace destroys the
   * workspace, and this is the workspace that may not be destroyed.
   */
  homeWorkspaceId: string | undefined;
  authMode: ProxyAuthMode;
  /**
   * True iff CHATFUEL_OPEN_PROXY=1 — the operator saying that this deployment
   * is meant to answer strangers under the master token.
   *
   * Open mode is the right shape for a laptop and the wrong one for a public
   * hostname, and nothing inside the process can tell the two apart: the
   * config is identical, only the socket differs. So the flag is not what
   * turns open mode on - the absence of the Supabase pair already did that -
   * it is what says the answer was meant for a host strangers can reach. The
   * hosts that can be reached are the ones that check it: `server.ts` before it
   * binds anything but loopback, and the Vercel function, which has no loopback
   * to bind. Neither reads it in development.
   */
  openProxyAcknowledged: boolean;
  /** Present iff authMode === 'on'. Contains secrets — never log it. */
  auth: ResolvedProxyAuth | undefined;
  /** True iff the gate is on AND a service-role key is available. */
  recoveryLinkRoute: boolean;
  /** True iff the deployment opted the route's server-log delivery in. */
  recoveryLinkLogging: boolean;
  /** True iff the gate is on AND a service-role key is available — sign-up cannot finish without it. */
  provisionRoute: boolean;
  /**
   * True iff the gate is on AND a service-role key is available. False means
   * the dispatcher does not claim those paths at all, so the host answers 404 —
   * which is the signal the app reads to fall back to a queue in the browser.
   */
  publishingQueueRoute: boolean;
  /** Present iff publishingQueueRoute. Contains secrets — never log it. */
  instagram: ResolvedProxyPublishing | undefined;
  /**
   * The storage bucket the media routes read and write. Always resolved, even
   * with no queue route: uploads are mounted on the auth key, not on the
   * scheduler, so a deployment can store media without ever scheduling a post.
   */
  mediaBucket: string;
  /** How many bytes of media one bot may keep in that bucket. */
  mediaQuotaBytes: number;
  /** How long an object nothing refers to survives, in milliseconds. */
  mediaTtlMs: number;
  adminMode: ProxyAdminMode;
  /** The admin panel's password. A SECRET — never log it, never send it anywhere. */
  adminPassword: string | undefined;
  /** The per-deployment salt the admin cookie's key is derived with. Never log it. */
  adminCookieSalt: string;
  /** Which browser origins may reach the proxy at all — see origin.ts. */
  originPolicy: OriginPolicy;
  /** Which host names this deployment answers to — the rebinding check, see origin.ts. */
  hostPolicy: HostPolicy;
  /** In-flight ceiling on the REST passthrough. */
  restMaxConcurrent: number;
  graphqlMaxConcurrent: number;
  /** How many operations one GraphQL body may carry. */
  graphqlMaxBatch: number;
  /** Whether resource ids inside a bot are fenced, and how — see resourceFence.ts. */
  resourceFence: ResourceFenceMode;
  /** True iff those bindings are shared through Supabase — see resourceStore.ts. */
  resourceStore: boolean;
  /**
   * The root fields a forwarded operation may name, or undefined when the
   * allowlist is off. Already merged with `operationAllowlistExtra`.
   */
  allowedOperations: ReadonlySet<string> | undefined;
  /**
   * True iff `off` was asked for behind the gate without the acknowledgement,
   * so the list above is the default one rather than what was asked for.
   */
  allowlistOffIgnored: boolean;
  /**
   * The documents this app ships, indexed both ways — or undefined when the app
   * named none and the question is not asked. See operationRegistry.ts.
   */
  operationRegistry: OperationRegistry | undefined;
  /** How many browser WebSockets one instance holds. */
  wsMaxSockets: number;
  /** How many sockets may sit unadmitted at once. */
  wsPreAuthSockets: number;
  /** Requests per minute one tenant may send — see tenantLimits.ts. */
  tenantRequestsPerMinute: number;
  /** Browser WebSockets one tenant may hold at once. */
  tenantMaxSockets: number;
  /** True iff adminMode is not 'off' — a misconfigured panel still answers, with a 500. */
  adminRoute: boolean;
  /** True iff `x-forwarded-for` may key the admin-attempt throttle (edge-only). */
  trustForwardedFor: boolean;
  /** Configuration problems, each also enforced at request time (fail closed). */
  problems: ProxyProblem[];
}

export interface ChatfuelProxy {
  readonly config: ResolvedProxyConfig;
  /** True when the request was one of the proxy's routes (response owned by the proxy). */
  handleRequest(req: IncomingMessage, res: ServerResponse): boolean;
  /** True when the upgrade was on wsPath (socket owned by the proxy). */
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean;
  close(): void;
}

/** The token page decides the shape — reject only what cannot be a token. */
const isPlausibleToken = (value: string): boolean => value.length > 0 && !/\s/.test(value);
const AUTH_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export const MISCONFIGURED_MESSAGE =
  'Auth gate misconfigured — VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set together (or neither)';

export const WORKSPACE_MISSING_MESSAGE =
  'CHATFUEL_WORKSPACE_ID is not set — the server has no Chatfuel workspace to create this account’s bot in';

/** Human-readable text for a configuration problem (for the host's log line). */
export function describeProblem(problem: ProxyProblem, config: Pick<ResolvedProxyConfig, 'tokenEnv'>): string {
  if (problem === 'ProxyTokenMissing') {
    return `${config.tokenEnv} missing or invalid — run the Chatfuel wizard or add it to .env`;
  }
  if (problem === 'ProxyWorkspaceMissing') {
    return `${WORKSPACE_MISSING_MESSAGE} — nobody can finish signing up until it is`;
  }
  if (problem === 'ProxyAdminPasswordWeak') return ADMIN_MISCONFIGURED_MESSAGE;
  return MISCONFIGURED_MESSAGE;
}

/** One line for startup logs — never includes keys. */
export function describeAuthMode(
  config: Pick<
    ResolvedProxyConfig,
    | 'authMode'
    | 'auth'
    | 'recoveryLinkRoute'
    | 'recoveryLinkLogging'
    | 'provisionRoute'
    | 'publishingQueueRoute'
    | 'workspaceId'
    | 'allowedBotIds'
    | 'dynamicFence'
    | 'resourceFence'
    | 'resourceStore'
    | 'allowedOperations'
    | 'allowlistOffIgnored'
    | 'operationRegistry'
    | 'adminMode'
    | 'originPolicy'
  >,
): string {
  /* Every browser page on the internet may call this proxy, and the proxy calls
     Chatfuel with the master token — a fact about the deployment as large as
     the gate's own state, and one nothing else in a running deployment says
     out loud. On the same line as the rest, so a deployment carrying a '*' left
     over from a demo says so at every boot. */
  const origins = config.originPolicy.any ? ', ORIGINS: * (ANY origin may call this proxy)' : '';
  /* The panel reaches past every fence on this line, so every line says whether it is there. */
  const admin =
    config.adminMode === 'on'
      ? ', admin panel mounted'
      : config.adminMode === 'misconfigured'
        ? ', admin panel MISCONFIGURED (ADMIN_PASSWORD too short)'
        : '';
  /* Named on the line because it is the one fence that can refuse a request the
     bot fence would have allowed, and because 'strict' is a mode a deployment
     can only run knowingly. */
  const resources =
    config.resourceFence === 'off'
      ? ''
      : `, resource fence: ${config.resourceFence}${config.resourceStore ? ' (shared)' : ' (this instance only)'}`;
  /* The outermost fence, and the one a deployment can switch off in an env var
     — so the line says whether it is holding and how wide it is. */
  const operations = config.allowedOperations
    ? `, operation allowlist: ${config.allowedOperations.size} fields${config.allowlistOffIgnored ? ' (CHATFUEL_OPERATION_ALLOWLIST=off IGNORED: behind the gate it also needs CHATFUEL_OPERATION_ALLOWLIST_OFF=1)' : ''}`
    : ', operation allowlist: OFF';
  /* The narrowest of the fences and the newest, so the line says whether this
     deployment has it at all — an app that never regenerated its barrel is
     otherwise indistinguishable from one that did. */
  /* A host that passed no `operations` runs on — an app scaffolded before the
     barrel existed still has to boot — but it says so, because silence on this
     line would read exactly like a registry that is holding. */
  const registry = config.operationRegistry
    ? `, operations: ${config.operationRegistry.size} documents`
    : ', operations: NO REGISTRY (this host passes no `operations`; document checking is off)';
  if (config.authMode === 'on') {
    return `auth gate on (bots per account${config.workspaceId ? ` in workspace ${config.workspaceId}` : ''}${config.recoveryLinkRoute ? `, recovery-link route mounted${config.recoveryLinkLogging ? ' (link written to the server log)' : ' (server-log delivery off)'}` : ''}${config.provisionRoute ? ', provisioning + bot routes mounted' : ''}${config.publishingQueueRoute ? ', publish queue routes mounted' : ''}${resources}${operations}${registry}${admin}${origins})`;
  }
  // With no gate the bot fence is the only thing standing between a request and
  // the whole account, so the startup line says which one is in force.
  const fence = config.dynamicFence
    ? "this account's workspaces"
    : config.allowedBotIds
      ? `${config.allowedBotIds.size} bot(s)`
      : 'off';
  return config.authMode === 'off'
    ? `auth gate off, bot fence: ${fence}${resources}${operations}${registry}${admin}${origins}`
    : 'auth gate MISCONFIGURED — every request will fail with ProxyAuthMisconfigured';
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/** What the migration names the bucket, and what this side assumes without one. */
export const DEFAULT_MEDIA_BUCKET = 'cf-pub-media';

/* A bucket name is interpolated into a storage URL as one path segment. Supabase
   allows rather more than this, but everything it allows beyond these is a
   character that would have to be escaped to travel there, so the narrow set is
   the one that is always the same name on both sides. */
const BUCKET_NAME = /^[A-Za-z0-9._-]+$/;

/** A ceiling somebody set, or ours — an unparseable or absurd value is not a ceiling. */
const positiveOr = (value: number | undefined, fallback: number): number =>
  Number.isFinite(value) && (value as number) > 0 ? Math.floor(value as number) : fallback;

/**
 * The resource fence somebody asked for, or the one that follows from the gate.
 *
 * An unrecognised value is not a mode: it falls back to the default rather than
 * being read as `off`, because a typo in a deploy script must not be the way a
 * fence is turned off — the same reasoning the auth gate's misconfiguration
 * follows.
 */
const resourceFenceMode = (value: string | undefined, authMode: ProxyAuthMode): ResourceFenceMode => {
  const asked = value?.trim().toLowerCase();
  if (asked === 'off' || asked === 'bound' || asked === 'strict') return asked;
  return authMode === 'on' ? 'bound' : 'off';
};

/**
 * Whether the bindings are shared, which needs somewhere to share them.
 *
 * Only `off` turns it off — there is nothing to be gained by refusing to share
 * bindings when the table is there, so an unrecognised value is not read as one
 * and a deployment that has a service-role key gets the shared fence by
 * default.
 */
const resourceStoreShared = (
  value: string | undefined,
  fence: ResourceFenceMode,
  auth: ResolvedProxyAuth | undefined,
): boolean => {
  if (fence === 'off' || !auth?.serviceRoleKey) return false;
  return value?.trim().toLowerCase() !== 'off';
};

/**
 * The operation allowlist somebody asked for, or the one that follows from the
 * gate — merged with whatever a deployment added on top.
 *
 * Undefined means off. An unrecognised value falls back to the default rather
 * than to `off`, for the reason the resource fence's does: a typo in a deploy
 * script must not be how a fence is turned off.
 */
const allowedOperationsFor = (
  value: string | undefined,
  extra: readonly string[] | undefined,
  authMode: ProxyAuthMode,
  offIgnored: boolean,
): ReadonlySet<string> | undefined => {
  const asked = offIgnored ? undefined : value?.trim().toLowerCase();
  const on = asked === 'off' ? false : asked === 'on' ? true : authMode === 'on';
  if (!on) return undefined;
  const named = (extra ?? []).map((field) => field.trim()).filter((field) => field.length > 0);
  return named.length > 0 ? new Set([...ALLOWED_ROOT_FIELDS, ...named]) : ALLOWED_ROOT_FIELDS;
};

/**
 * Whether an `off` asked for behind the gate is being dropped.
 *
 * `off` is the one fence switch that is a single env var away from the widest
 * opening this proxy has. Behind the gate every caller is a stranger, and the
 * allowlist is what holds a stranger's operation to the ones this app actually
 * sends; without it the master token answers the whole account schema. A deploy
 * script that carries the value — copied off a laptop, or added the day an app
 * needed one field it never named with `_EXTRA` — looks exactly like a decision
 * somebody made on purpose, and nothing in the process can tell the two apart.
 * So it asks to be said twice, the way CHATFUEL_OPEN_PROXY does: the value, and
 * CHATFUEL_OPERATION_ALLOWLIST_OFF=1 beside it. Said once, it is ignored and the
 * startup line names it. With no gate there is nothing to acknowledge — the
 * caller is the deployer and `off` is already the default.
 */
const allowlistOffIgnoredBy = (value: string | undefined, authMode: ProxyAuthMode, acknowledged: boolean): boolean =>
  value?.trim().toLowerCase() === 'off' && authMode === 'on' && !acknowledged;

/** A bucket somebody named, or ours — a value that is not a path segment is not a name. */
const bucketOr = (value: string | undefined): string => {
  const name = value?.trim();
  return name && BUCKET_NAME.test(name) ? name : DEFAULT_MEDIA_BUCKET;
};

export function resolveProxyConfig(options: ChatfuelProxyOptions = {}, env: ProxyEnv = {}): ResolvedProxyConfig {
  const problems: ProxyProblem[] = [];
  const httpPath = options.httpPath ?? '/chatfuel/graphql';
  const tokenEnv = options.tokenEnv ?? 'CHATFUEL_TOKEN';

  // Explicit option → env → default.
  const upstream = trimSlash(options.upstream ?? env.CHATFUEL_API_BASE ?? 'https://panel.chatfuel.com');

  // A frozen list, no fence at all, or — the default — the account's own
  // workspaces, asked for at request time.
  let allowedBotIds: ReadonlySet<string> | undefined;
  let dynamicFence = false;
  if (options.allowedBotIds === 'any') {
    allowedBotIds = undefined;
  } else if (options.allowedBotIds) {
    allowedBotIds = new Set(options.allowedBotIds);
  } else {
    dynamicFence = true;
  }

  const workspaceId = (options.workspaceId ?? env.CHATFUEL_WORKSPACE_ID)?.trim() || undefined;
  /* Both names, in the order a deployment means them: the billing workspace when
     there is one, the workspace the app opens on otherwise. */
  const homeWorkspaceId = workspaceId ?? (env.VITE_CHATFUEL_WORKSPACE_ID?.trim() || undefined);

  const adminPassword = (options.adminPassword ?? env.ADMIN_PASSWORD)?.trim() || undefined;
  let adminMode: ProxyAdminMode = 'off';
  if (adminPassword) {
    adminMode = adminPassword.length >= ADMIN_MIN_PASSWORD_LENGTH ? 'on' : 'misconfigured';
    if (adminMode === 'misconfigured') problems.push('ProxyAdminPasswordWeak');
  }

  const candidate = options.token ?? env[tokenEnv];
  const token = candidate && isPlausibleToken(candidate) ? candidate : undefined;
  if (!token) problems.push('ProxyTokenMissing');

  let authMode: ProxyAuthMode;
  let auth: ResolvedProxyAuth | undefined;
  if (options.auth === false) {
    authMode = 'off';
  } else if (options.auth) {
    authMode = 'on';
    auth = {
      supabaseUrl: trimSlash(options.auth.supabaseUrl),
      anonKey: options.auth.anonKey,
      cacheTtlMs: options.auth.cacheTtlMs ?? 30_000,
      rpcName: options.auth.rpcName ?? 'cf_my_bot_ids',
      serviceRoleKey: (options.auth.serviceRoleKey ?? env.SUPABASE_SERVICE_ROLE_KEY) || undefined,
      fetch: options.auth.fetch,
    };
  } else {
    const present = AUTH_ENV.filter((name) => Boolean(env[name]));
    if (present.length === AUTH_ENV.length) {
      authMode = 'on';
      auth = {
        supabaseUrl: trimSlash(env.VITE_SUPABASE_URL!),
        anonKey: env.VITE_SUPABASE_ANON_KEY!,
        cacheTtlMs: 30_000,
        rpcName: 'cf_my_bot_ids',
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || undefined,
        fetch: undefined,
      };
    } else if (present.length === 0) {
      authMode = 'off';
    } else {
      authMode = 'misconfigured';
      problems.push('ProxyAuthMisconfigured');
    }
  }

  // Only a deployment that WOULD provision can miss the workspace: without the
  // gate or the service-role key the route never runs at all.
  if (authMode === 'on' && Boolean(auth?.serviceRoleKey) && !workspaceId) problems.push('ProxyWorkspaceMissing');

  const publishingQueueRoute = authMode === 'on' && Boolean(auth?.serviceRoleKey);

  const operationAllowlist = options.operationAllowlist ?? env.CHATFUEL_OPERATION_ALLOWLIST;
  const allowlistOffIgnored = allowlistOffIgnoredBy(
    operationAllowlist,
    authMode,
    env.CHATFUEL_OPERATION_ALLOWLIST_OFF === '1',
  );

  /*
   * A salt of this deployment's own, without asking the operator for one.
   *
   * The digest is over secrets this deployment already has, so it is stable
   * across restarts and identical across the instances of one deployment —
   * which is what a stateless cookie needs — while differing from every other
   * deployment's. A deployment with neither a token nor a Supabase project
   * falls back to a constant, which is the state ADMIN_COOKIE_SALT exists for;
   * that is also the setting to use when the token is rotated on a schedule and
   * admins should not be signed out by it.
   */
  const adminCookieSalt =
    (options.adminCookieSalt ?? env.ADMIN_COOKIE_SALT)?.trim() ||
    createHash('sha256')
      .update(`cf-admin-salt\n${token ?? ''}\n${auth?.supabaseUrl ?? ''}`)
      .digest('hex')
      .slice(0, 32);

  /* Split on commas and whitespace alike, since an env var written across a
     line in a dashboard is a list somebody meant as a list. */
  const originList = (
    Array.isArray(options.allowedOrigins)
      ? options.allowedOrigins
      : (typeof options.allowedOrigins === 'string' ? options.allowedOrigins : (env.ALLOWED_ORIGINS ?? '')).split(
          /[\s,]+/,
        )
  )
    .map((entry) => entry.trim().toLowerCase().replace(/\/+$/, ''))
    .filter((entry) => entry.length > 0);
  const originPolicy: OriginPolicy = {
    any: originList.includes('*'),
    allowed: new Set(originList.filter((entry) => entry !== '*')),
  };

  const publicUrl = normalizeOrigin(options.publicUrl ?? env.PUBLIC_URL);

  /* Same splitting rule as the origins, and for the same reason. */
  const hostList = (
    Array.isArray(options.allowedHosts)
      ? options.allowedHosts
      : (typeof options.allowedHosts === 'string' ? options.allowedHosts : (env.ALLOWED_HOSTS ?? '')).split(/[\s,]+/)
  )
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  /* An origin and a public URL both name a host this deployment answers to.
     Asking the operator to write it a third time is how a list goes stale. */
  const hostsFromOrigins = [...originPolicy.allowed, publicUrl ?? '']
    .map((entry) => {
      try {
        return new URL(entry).host;
      } catch {
        return '';
      }
    })
    .filter((entry) => entry.length > 0);
  const hostPolicy: HostPolicy = {
    any: hostList.includes('*'),
    expected: new Set([...hostList.filter((entry) => entry !== '*'), ...hostsFromOrigins]),
    loopbackOnly: options.loopbackOnly === true,
  };

  const resourceFence = resourceFenceMode(options.resourceFence ?? env.CHATFUEL_RESOURCE_FENCE, authMode);

  return {
    upstream,
    httpPath,
    wsPath: options.wsPath ?? httpPath,
    apiPath: options.apiPath ?? '/chatfuel/api',
    authPath: options.authPath ?? '/chatfuel/auth',
    publishingPath: options.publishingPath ?? '/chatfuel/publishing',
    adminPath: options.adminPath ?? '/chatfuel/admin',
    tokenEnv,
    timeoutMs: options.timeoutMs ?? 30_000,
    slowTimeoutMs: options.slowTimeoutMs ?? 290_000,
    wsInitTimeoutMs: options.wsInitTimeoutMs ?? 5_000,
    token,
    allowedBotIds,
    dynamicFence,
    publicUrl,
    workspaceId,
    homeWorkspaceId,
    authMode,
    openProxyAcknowledged: env.CHATFUEL_OPEN_PROXY === '1',
    auth,
    recoveryLinkRoute: authMode === 'on' && Boolean(auth?.serviceRoleKey),
    recoveryLinkLogging:
      options.recoveryLinkLogging ?? (env.AUTH_RECOVERY_LINK_LOG === 'true' || env.AUTH_RECOVERY_LINK_LOG === '1'),
    provisionRoute: authMode === 'on' && Boolean(auth?.serviceRoleKey),
    publishingQueueRoute,
    instagram: publishingQueueRoute
      ? {
          publishSecret: (options.publishingSecret ?? env.PUBLISHING_SECRET)?.trim() || undefined,
          bypassSecret: (options.bypassSecret ?? env.VERCEL_AUTOMATION_BYPASS_SECRET)?.trim() || undefined,
        }
      : undefined,
    mediaBucket: bucketOr(options.mediaBucket ?? env.PUBLISHING_MEDIA_BUCKET),
    mediaQuotaBytes: positiveOr(options.mediaQuotaMb ?? Number(env.PUBLISHING_MEDIA_QUOTA_MB), 512) * 1024 * 1024,
    mediaTtlMs: positiveOr(options.mediaTtlDays ?? Number(env.PUBLISHING_MEDIA_TTL_DAYS), 30) * 24 * 60 * 60 * 1000,
    adminMode,
    /* A password that failed the floor is dropped here, so nothing downstream
       can accept it by reaching past adminMode. */
    adminPassword: adminMode === 'on' ? adminPassword : undefined,
    adminCookieSalt,
    originPolicy,
    hostPolicy,
    restMaxConcurrent: positiveOr(options.restMaxConcurrent ?? Number(env.REST_MAX_CONCURRENT), 8),
    graphqlMaxConcurrent: positiveOr(options.graphqlMaxConcurrent ?? Number(env.GRAPHQL_MAX_CONCURRENT), 32),
    graphqlMaxBatch: positiveOr(options.graphqlMaxBatch ?? Number(env.GRAPHQL_MAX_BATCH), 25),
    resourceFence,
    resourceStore: resourceStoreShared(options.resourceStore ?? env.CHATFUEL_RESOURCE_STORE, resourceFence, auth),
    allowedOperations: allowedOperationsFor(
      operationAllowlist,
      options.operationAllowlistExtra ?? env.CHATFUEL_OPERATION_ALLOWLIST_EXTRA?.split(','),
      authMode,
      allowlistOffIgnored,
    ),
    allowlistOffIgnored,
    operationRegistry: options.operations ? buildOperationRegistry(options.operations) : undefined,
    wsMaxSockets: positiveOr(options.wsMaxSockets ?? Number(env.WS_MAX_SOCKETS), 256),
    wsPreAuthSockets: positiveOr(options.wsPreAuthSockets ?? Number(env.WS_PRE_AUTH_SOCKETS), 32),
    tenantRequestsPerMinute: positiveOr(options.tenantRequestsPerMinute ?? Number(env.TENANT_REQUESTS_PER_MINUTE), 600),
    tenantMaxSockets: positiveOr(options.tenantMaxSockets ?? Number(env.TENANT_MAX_SOCKETS), 8),
    adminRoute: adminMode !== 'off',
    trustForwardedFor:
      options.trustForwardedFor ?? (env.TRUST_FORWARDED_FOR === 'true' || env.TRUST_FORWARDED_FOR === '1'),
    problems,
  };
}
