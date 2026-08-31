import { createChatfuelClient, credentialOrigin, uploadFile, type ModuleClient, type TokenGetter } from '~api';

/**
 * Where the proxy is mounted. The same prefix `uploadFile` defaults to and the
 * same one `vercel.json` rewrites, written once here so a module never has to
 * know it.
 */
const PROXY_PREFIX = '/chatfuel';

/** The GraphQL endpoint on that prefix — the address every other url here is held to. */
const GRAPHQL_PATH = `${PROXY_PREFIX}/graphql`;

export interface AppClientOptions {
  /**
   * The USER's session token for the proxy gate (auth module) — never the
   * Chatfuel token. Undefined when the deployment has no auth: the proxy then
   * runs open, exactly as before.
   */
  getAccessToken?: TokenGetter;
  /** The proxy rejected the session; the auth runtime decides what to do. */
  onSessionError?: (err: unknown) => void;
}

/**
 * Browser client in proxy mode: NO Chatfuel token here — the proxy
 * (vite dev plugin or server/) injects Authorization server-side and relays the
 * WebSocket with its own connection_init. What the browser does send is the
 * caller's session token (when auth is on) so the proxy can gate. Path-only
 * urls resolve against window.location. uploadFile rides the proxy's
 * /chatfuel/api passthrough, and proxyFetch reaches the proxy's own routes —
 * both of them are the same session bearer over a path this file owns, because
 * where the proxy is mounted is the host's business and not a module's.
 */
export function createAppClient(options: AppClientOptions = {}): ModuleClient {
  const getAuthHeader = async (): Promise<string | undefined> => {
    const value = await options.getAccessToken?.();
    return value ? `Bearer ${value}` : undefined;
  };
  const client = createChatfuelClient({
    url: GRAPHQL_PATH,
    wsUrl: GRAPHQL_PATH,
    token: options.getAccessToken,
    onSessionError: options.onSessionError,
  });
  // Where the session bearer is allowed to go, taken off the same path the
  // client was given. Both are relative here, so in the browser this is the
  // page's own origin and an absolute `basePath` from anywhere else is refused.
  const pinnedOrigin = credentialOrigin(GRAPHQL_PATH);
  return {
    query: client.query,
    mutate: client.mutate,
    subscribe: client.subscribe,
    onReconnect: client.onReconnect,
    uploadFile: (botId, file, fileType, pluginId) =>
      uploadFile({ botId, file, fileType, pluginId, getAuthHeader, pinnedOrigin }),
    proxyFetch: async (path, init) => {
      const auth = await getAuthHeader();
      const headers = new Headers(init?.headers);
      if (auth) headers.set('authorization', auth);
      return fetch(`${PROXY_PREFIX}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
    },
  };
}
