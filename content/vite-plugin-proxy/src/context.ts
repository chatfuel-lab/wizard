/**
 * The shared context: everything the route handlers have in common, built once
 * per createChatfuelProxy call. State only — behaviour lives in the modules
 * that take this as their first argument, so no single object grows into the
 * god-closure this replaced.
 */
import { createAdminThrottle, type AdminThrottle } from './adminSession.js';
import { createAuthGate, type AuthGate } from './gate.js';
import { outboundFetch } from './egress.js';
import { createResourceFence, type ResourceFence } from './resourceFence.js';
import { createResourceStore, type ResourceStore } from './resourceStore.js';
import { createTenantLimits, type TenantLimits } from './tenantLimits.js';
import { createWorkspaceFence, type WorkspaceFence } from './workspaceFence.js';
import { describeProblem, type ChatfuelProxyOptions, type ResolvedProxyConfig } from './proxyConfig.js';

export interface ProxyContext {
  readonly config: ResolvedProxyConfig;
  /**
   * Present iff config.authMode === 'on'. Exposed whole, not just `verify`:
   * the provisioning and bot routes call `gate.forget` on the cache every
   * other route reads through `gate.verify`.
   */
  readonly gate: AuthGate | undefined;
  /** Present iff config.dynamicFence and a token exists — see its construction below. */
  readonly fence: WorkspaceFence | undefined;
  /**
   * Present iff config.resourceFence is not 'off'. Which bot each flow, block
   * or contact id was handed out under — learned from this proxy's own traffic,
   * held in THIS process. See resourceFence.ts.
   */
  readonly resources: ResourceFence | undefined;
  /**
   * Present iff config.resourceStore. The floor under the memory above — the
   * bindings the whole DEPLOYMENT knows, on its own Supabase project. Held here
   * as well as inside the fence so closing the proxy can stop its timer. See
   * resourceStore.ts.
   */
  readonly resourceStore: ResourceStore | undefined;
  /**
   * How much of this deployment one tenant may take — requests per minute and
   * live sockets, keyed by the caller's fence. Always present; a caller with no
   * fence is not keyed and passes it untouched. See tenantLimits.ts.
   */
  readonly tenants: TenantLimits;
  /**
   * Present iff the admin routes are mounted. Wrong-password counters, held in
   * THIS process — on a host that answers each request from a fresh instance
   * there is nothing shared to hold them in, which is why the panel leans on a
   * long password rather than on this.
   */
  readonly adminThrottle: AdminThrottle | undefined;
  /**
   * Admin sessions issued at or before this instant are refused. Signing out
   * moves it to now, which is the only revocation a stateless cookie has: the
   * cookie carries when it was issued, and this says how far back "still
   * valid" reaches.
   *
   * Held in THIS process, like the throttle above and with the same caveat —
   * on per-request functions a sign-out is felt by the instance that served it
   * and no other. Rotating ADMIN_PASSWORD is the revocation that holds
   * everywhere.
   */
  adminRevokedBefore: number;
  /** REST passthroughs running right now, against config.restMaxConcurrent. */
  restInFlight: number;
  /** GraphQL passthroughs running right now, against config.graphqlMaxConcurrent. */
  graphqlInFlight: number;
  /**
   * Close live browser WebSockets — see WsRelay.closeSockets. Wired in by
   * createChatfuelProxy once the relay exists, which is why it is settable:
   * the relay takes this context as its argument, so it cannot be built before
   * the context it belongs to.
   *
   * Undefined only in a test that builds a context by hand.
   */
  closeSockets: ((botIds?: ReadonlySet<string>) => void) | undefined;
  /** Supabase-bound fetch: the test injection when given, outboundFetch otherwise. */
  readonly supabaseFetch: typeof globalThis.fetch;
  /** describeProblem('ProxyTokenMissing', config), computed once. */
  readonly tokenMissingMessage: string;
}

export function createProxyContext(
  config: ResolvedProxyConfig,
  fenceOptions?: ChatfuelProxyOptions['fence'],
): ProxyContext {
  const { auth, upstream, token, dynamicFence } = config;
  const gate: AuthGate | undefined = auth
    ? createAuthGate({
        supabaseUrl: auth.supabaseUrl,
        anonKey: auth.anonKey,
        cacheTtlMs: auth.cacheTtlMs,
        rpcName: auth.rpcName,
        fetch: auth.fetch ?? outboundFetch,
      })
    : undefined;
  /* Without a token there is nobody to ask; every request already fails with
     ProxyTokenMissing before the fence would be consulted. */
  const fence: WorkspaceFence | undefined =
    dynamicFence && token
      ? createWorkspaceFence({ upstream, token, ...fenceOptions, fetch: fenceOptions?.fetch ?? outboundFetch })
      : undefined;
  /* Guarded on the key rather than on `auth` alone: the shared table is
     service-role only, exactly so that a caller who could read it cannot ask
     which bot an id belongs to — the question the fence exists to refuse. */
  const resourceStore: ResourceStore | undefined =
    config.resourceStore && auth?.serviceRoleKey
      ? createResourceStore({
          supabaseUrl: auth.supabaseUrl,
          serviceRoleKey: auth.serviceRoleKey,
          fetch: auth.fetch ?? outboundFetch,
        })
      : undefined;
  return {
    config,
    gate,
    fence,
    resources:
      config.resourceFence === 'off'
        ? undefined
        : createResourceFence({ mode: config.resourceFence, store: resourceStore }),
    resourceStore,
    tenants: createTenantLimits({
      requestsPerMinute: config.tenantRequestsPerMinute,
      maxSockets: config.tenantMaxSockets,
    }),
    adminThrottle: config.adminRoute ? createAdminThrottle() : undefined,
    adminRevokedBefore: 0,
    restInFlight: 0,
    graphqlInFlight: 0,
    closeSockets: undefined,
    supabaseFetch: auth?.fetch ?? outboundFetch,
    tokenMissingMessage: describeProblem('ProxyTokenMissing', config),
  };
}
