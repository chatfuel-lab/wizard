import type { TypedDoc } from './module-client';
import { ChatfuelSessionError, toApiError, type ChatfuelGraphQLError, type ExecutionEnvelope } from './errors';
import { executeHttp, getDocMeta, requirePositiveMs } from './transport/http';
import { createWsTransport, type WsTransport } from './transport/ws';
import { stripTypename } from './strip-typename';
import { createThrottle, type Throttle, type ThrottleOptions } from './throttle';
import { assertCredentialSafeUrl, credentialOrigin } from './urlGuard';

/**
 * Resolves the bearer value per request / per socket connect. Behind the proxy
 * this is the USER's session token (Supabase access token) for the gate — the
 * Chatfuel token itself never lives in the browser. `undefined` = no header.
 */
export type TokenGetter = () => string | undefined | Promise<string | undefined>;

export const DEFAULT_URL = 'https://panel.chatfuel.com/graphql';

export interface ChatfuelClientOptions {
  /** Default DEFAULT_URL. Browser-behind-proxy mode passes '/chatfuel/graphql'. */
  url?: string;
  /**
   * Default: derived from url (http→ws, https→wss). Path-only values
   * ('/chatfuel/graphql') resolve against window.location at connect time.
   */
  wsUrl?: string;
  /**
   * Dashboard user token or an async getter (rotation-friendly).
   * Omit entirely in browser-behind-proxy mode — the dev proxy injects auth
   * server-side and the token never reaches the browser.
   */
  token?: string | TokenGetter;
  /** WebSocket class for runtimes without a global one (Node < 22 passes the `ws` package's WebSocket). */
  webSocketImpl?: unknown;
  /** Test injection; defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  /** Extra HTTP headers. */
  headers?: Record<string, string>;
  /** Per-request HTTP timeout. Default 30 000. */
  timeoutMs?: number;
  /** Default false (UI mode — a human paces requests). Node scripts pass BATCH_THROTTLE. */
  throttle?: ThrottleOptions | false;
  /**
   * The proxy gate rejected the caller's session (401 AuthSessionRequired /
   * 403 AuthTenantForbidden). Fired once per lapse — re-armed by the next
   * successful call — from both HTTP and WS paths, so the shell can refresh or
   * send the user to sign-in without every module handling it.
   */
  onSessionError?: (err: ChatfuelSessionError) => void;
  /**
   * How much response body to accept before giving up on it. Default 32 MiB.
   * The time budget bounds how long an answer may take, not how large it may
   * be, and only one of those two protects the tab.
   */
  maxResponseBytes?: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  /**
   * Overrides the client's `timeoutMs` for this one request.
   *
   * A handful of Chatfuel mutations block while the platform waits on somebody
   * else's work — `instagramAccountPublishReel` sits on Instagram's transcoder
   * for up to five minutes — and the client-wide default is tuned for the other
   * several hundred operations. Raising the default for all of them so that four
   * can finish would mean a dead upstream is felt five minutes late everywhere.
   */
  timeoutMs?: number;
}

export interface SubscriptionObserver<TData> {
  next: (data: TData) => void;
  /**
   * Terminal 'error' frames and fatal closes arrive here as api-client errors
   * (4401/4403 → ChatfuelAuthError). Result-level errors[] inside a 'next'
   * frame are also routed here; the subscription itself stays alive — the
   * server decides when it completes.
   */
  error?: (err: unknown) => void;
  complete?: () => void;
}

export interface ChatfuelClient {
  /** Throws ChatfuelGraphQLError/ChatfuelAuthError when errors[] is present (partial data rides on the error). */
  query<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars, opts?: RequestOptions): Promise<TData>;

  /** Same contract as query; kept separate for intent. Variables are always stripped of __typename. */
  mutate<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars, opts?: RequestOptions): Promise<TData>;

  /** Escape hatch: returns { data?, errors? } without throwing — for views that render partial data. */
  execute<TData, TVars>(
    doc: TypedDoc<TData, TVars>,
    variables: TVars,
    opts?: RequestOptions,
  ): Promise<ExecutionEnvelope<TData>>;

  /**
   * Primary subscription API: sink + unsubscribe, mapping 1:1 onto useEffect
   * cleanup. One lazy shared WebSocket serves all subscriptions.
   */
  subscribe<TData, TVars>(
    doc: TypedDoc<TData, TVars>,
    variables: TVars,
    observer: SubscriptionObserver<TData>,
  ): () => void;

  /** AsyncIterable form for Node scripts. Throws on error frames and result-level errors[]. */
  iterate<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars): AsyncIterableIterator<TData>;

  /** Fires after the shared WS re-establishes following an abnormal close — refetch every query backing a live view. */
  onReconnect(cb: () => void): () => void;

  dispose(): Promise<void>;
}

export function createChatfuelClient(options: ChatfuelClientOptions = {}): ChatfuelClient {
  const url = options.url ?? DEFAULT_URL;
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = requirePositiveMs(options.timeoutMs ?? 30_000, 'timeoutMs');
  const token = options.token;

  // Checked whatever the request will carry. Tying this to the presence of a
  // token made the guard a property of the request rather than of the address,
  // and the address is what it is about: a client with no token still sends
  // this app's queries over the wire and still acts on whatever answers, so a
  // plaintext or foreign upstream is a mistake before any credential is
  // involved — and a token added later, by a getter or by a caller's own
  // authorization header, arrives at an address nobody rechecked.
  //
  // Done at construction so a misconfigured deployment fails at startup instead
  // of on the wire; `executeHttp` checks again against the header it resolved,
  // which is the only place that knows what actually goes out.
  //
  // `url` is the address the deployment named, so it is judged on its own; every
  // other url here is judged against it. `wsUrl` is a second knob for the same
  // proxy, and a second knob is where a foreign host gets in without anyone
  // rereading the first one.
  const pinnedOrigin = credentialOrigin(url);
  assertCredentialSafeUrl(url, 'url');
  assertCredentialSafeUrl(options.wsUrl ?? url, 'wsUrl', pinnedOrigin);

  const getAuthHeader = async (): Promise<string | undefined> => {
    if (token == null) return undefined;
    const value = typeof token === 'function' ? await token() : token;
    return value ? `Bearer ${value}` : undefined;
  };

  // Session-error notification, deduped per lapse.
  let sessionErrorArmed = true;
  const noteResult = (err: unknown): void => {
    if (err instanceof ChatfuelSessionError) {
      if (sessionErrorArmed) {
        sessionErrorArmed = false;
        options.onSessionError?.(err);
      }
    } else if (err === undefined) {
      sessionErrorArmed = true;
    }
  };
  const failWith = (envelope: ExecutionEnvelope<unknown>): ChatfuelGraphQLError => {
    const err = toApiError(envelope);
    noteResult(err);
    return err;
  };

  // Shapes HTTP execute() only. WS subscriptions are long-lived and unpaced —
  // acceptable while nothing Node-side subscribes; revisit if one ever does.
  const throttled: Throttle = options.throttle ? createThrottle(options.throttle) : (task) => task();

  const transport = {
    url,
    pinnedOrigin,
    getAuthHeader,
    fetchImpl,
    headers: options.headers,
    timeoutMs,
    maxResponseBytes: options.maxResponseBytes,
  };

  async function execute<TData, TVars>(
    doc: TypedDoc<TData, TVars>,
    variables: TVars,
    opts: RequestOptions = {},
  ): Promise<ExecutionEnvelope<TData>> {
    // Strip universally: mutations require it (server rejects unknown input
    // fields), and query variables may round-trip fetched objects too.
    const vars = stripTypename(variables);
    // Read off the document rather than off which wrapper was called, so a
    // caller reaching for `execute` directly is covered by the same rule.
    const meta = getDocMeta(doc);
    const idempotent = meta.kindKnown && meta.kind !== 'mutation';
    return throttled(() => executeHttp<TData, TVars>(transport, doc, vars, opts), { idempotent });
  }

  async function run<TData, TVars>(
    doc: TypedDoc<TData, TVars>,
    variables: TVars,
    opts?: RequestOptions,
  ): Promise<TData> {
    const envelope = await execute(doc, variables, opts);
    if (envelope.errors && envelope.errors.length > 0) throw failWith(envelope);
    noteResult(undefined);
    return envelope.data as TData;
  }

  // The WS transport itself is created lazily so Node query-only consumers
  // (the wizard's token check, scripts without subscriptions) never need a
  // webSocketImpl. graphql-ws is additionally lazy: no socket until the
  // first subscribe.
  let ws: WsTransport | undefined;
  function getWs(): WsTransport {
    if (!ws) {
      ws = createWsTransport({
        wsUrl: options.wsUrl ?? url,
        getToken: token == null ? undefined : () => (typeof token === 'function' ? token() : token),
        webSocketImpl: options.webSocketImpl,
      });
    }
    return ws;
  }

  function toPayload<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars) {
    const meta = getDocMeta(doc);
    return {
      query: meta.text,
      operationName: meta.name,
      variables: stripTypename(variables) as Record<string, unknown> | undefined,
    };
  }

  return {
    // One implementation for both: what separates a mutation from a query here
    // is whether a failed attempt may be replayed, and `execute` decides that
    // from the document itself.
    query: run,
    mutate: run,
    execute,

    subscribe<TData, TVars>(
      doc: TypedDoc<TData, TVars>,
      variables: TVars,
      observer: SubscriptionObserver<TData>,
    ): () => void {
      return getWs().subscribe<TData>(toPayload(doc, variables), {
        next: (envelope) => {
          if (envelope.errors && envelope.errors.length > 0) {
            observer.error?.(failWith(envelope));
            return;
          }
          noteResult(undefined);
          observer.next(envelope.data as TData);
        },
        error: (err) => {
          noteResult(err);
          observer.error?.(err);
        },
        complete: () => observer.complete?.(),
      });
    },

    async *iterate<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars): AsyncIterableIterator<TData> {
      for await (const envelope of getWs().iterate<TData>(toPayload(doc, variables))) {
        if (envelope.errors && envelope.errors.length > 0) throw failWith(envelope);
        noteResult(undefined);
        yield envelope.data as TData;
      }
    },

    onReconnect(cb: () => void): () => void {
      return getWs().onReconnect(cb);
    },

    async dispose() {
      await ws?.dispose();
      ws = undefined;
    },
  };
}
