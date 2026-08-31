/**
 * @chatfuel/vite-plugin-proxy — public entry.
 *
 * Re-exports the Vite plugin (vite.ts), the host-agnostic core (core.ts), the
 * auth gate (gate.ts) and the deployment fence (workspaceFence.ts). The
 * production server (server.ts) is deliberately
 * NOT re-exported here: importing it by path (`…/server`) keeps `vite` out of
 * the server bundle.
 */
export { chatfuelProxy, default } from './vite.js';
export {
  createChatfuelProxy,
  resolveProxyConfig,
  HEALTH_PATH,
  serveHealth,
  DEFAULT_MEDIA_BUCKET,
  sendSyntheticEnvelope,
  readBody,
  readBodyCapped,
  refuseOversizedBody,
  describeAuthMode,
  describeEgress,
  describeProblem,
  describeProxy,
  MISCONFIGURED_MESSAGE,
  ADMIN_COOKIE,
  ADMIN_HEADER,
  ADMIN_MIN_PASSWORD_LENGTH,
  ADMIN_MISCONFIGURED_MESSAGE,
  ADMIN_SESSION_MS,
  signAdminSession,
  verifyAdminSession,
  type ChatfuelProxy,
  type ChatfuelProxyOptions,
  type ProxyAuthOptions,
  type ProxyAdminMode,
  type ProxyAuthMode,
  type ProxyEnv,
  type ProxyProblem,
  type ResolvedProxyAuth,
  type ResolvedProxyConfig,
  type ResolvedProxyPublishing,
  type OperationModule,
  type OperationRecord,
  type OperationRegistry,
} from './core.js';
export {
  createAuthGate,
  decodeJwtClaims,
  decodeJwtExp,
  bearerOf,
  GATE_MESSAGES,
  type AuthGate,
  type AuthGateOptions,
  type GateFailureCode,
  type GateResult,
  type JwtClaims,
} from './gate.js';
export {
  createWorkspaceFence,
  botIdsInFenceAnswer,
  FENCE_UNAVAILABLE_MESSAGE,
  type FenceResult,
  type WorkspaceFence,
  type WorkspaceFenceOptions,
} from './workspaceFence.js';
