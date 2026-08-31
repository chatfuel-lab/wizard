import { createClient as createGraphqlWsClient, type SubscribePayload } from 'graphql-ws';
import { backoffDelay } from '../backoff';
import {
  ChatfuelAuthError,
  ChatfuelSessionError,
  SESSION_ERROR_CODES,
  ChatfuelNetworkError,
  toApiError,
  type ExecutionEnvelope,
  type GraphQLErrorEntry,
} from '../errors';

export interface WsTransportOptions {
  /** Absolute ws(s):// url, http(s):// (scheme swapped), or a path ('/chatfuel/graphql') resolved against location at connect time. */
  wsUrl: string;
  /**
   * Direct mode: the Chatfuel token. Behind the proxy: the USER's session token
   * (the relay reads `authToken` from this init payload for its gate, then sends
   * its own upstream init). Absent / undefined value = empty payload.
   */
  getToken?: () => string | undefined | Promise<string | undefined>;
  /** WebSocket class for runtimes without a global one (Node < 22 passes the `ws` package's WebSocket). */
  webSocketImpl?: unknown;
}

export interface WsSink<TData> {
  next: (envelope: ExecutionEnvelope<TData>) => void;
  error: (err: unknown) => void;
  complete: () => void;
}

export interface WsTransport {
  subscribe<TData>(payload: SubscribePayload, sink: WsSink<TData>): () => void;
  iterate<TData>(payload: SubscribePayload): AsyncIterableIterator<ExecutionEnvelope<TData>>;
  /** Fires after the shared socket re-establishes following an abnormal close — views must refetch (server does not replay missed events). */
  onReconnect(cb: () => void): () => void;
  dispose(): Promise<void>;
}

export function resolveWsUrl(
  wsUrl: string,
  loc: { protocol: string; host: string } | undefined = typeof location !== 'undefined' ? location : undefined,
): string {
  if (wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://')) return wsUrl;
  if (wsUrl.startsWith('http://')) return `ws://${wsUrl.slice('http://'.length)}`;
  if (wsUrl.startsWith('https://')) return `wss://${wsUrl.slice('https://'.length)}`;
  if (wsUrl.startsWith('/')) {
    if (!loc) {
      throw new Error(
        `Cannot resolve path-only wsUrl "${wsUrl}" without a window.location (pass an absolute ws(s):// url in Node)`,
      );
    }
    const scheme = loc.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${loc.host}${wsUrl}`;
  }
  throw new Error(`Unsupported wsUrl "${wsUrl}"`);
}

interface CloseEventLike {
  code: number;
  reason?: string;
}

function asCloseEvent(value: unknown): CloseEventLike | undefined {
  if (value !== null && typeof value === 'object' && typeof (value as { code?: unknown }).code === 'number') {
    return value as CloseEventLike;
  }
  return undefined;
}

/** Map a graphql-ws sink error (GraphQLError[], CloseEvent or Error) onto the api-client error hierarchy. Exported for tests. */
export function wsErrorToApiError(err: unknown): Error {
  if (Array.isArray(err)) {
    return toApiError({ errors: err as GraphQLErrorEntry[] });
  }
  const close = asCloseEvent(err);
  if (close) {
    if (close.code === 4401 || close.code === 4403) {
      // The proxy gate closes with the session code as the reason; Chatfuel's
      // own 4401 has no such reason and keeps meaning "rotate the token".
      const reason = close.reason ?? '';
      if ((SESSION_ERROR_CODES as readonly string[]).includes(reason)) {
        return new ChatfuelSessionError([{ message: reason, extensions: { code: reason } }]);
      }
      return new ChatfuelAuthError([
        {
          message: close.reason || `WebSocket closed ${close.code}`,
          extensions: { code: 'Unauthorized' },
        },
      ]);
    }
    return new ChatfuelNetworkError(`WebSocket closed ${close.code}${close.reason ? `: ${close.reason}` : ''}`, {
      cause: err,
    });
  }
  if (err instanceof Error) return new ChatfuelNetworkError(err.message, { cause: err });
  return new ChatfuelNetworkError(String(err), { cause: err });
}

/**
 * Spec (transport-auth.md): close codes 4400/4401/4403/4406/4409/4429 must not
 * be retried. graphql-ws already hard-fails on all of them except 4403 —
 * this predicate adds 4403 and keeps everything else (including non-CloseEvent
 * network errors) retryable. Exported for tests.
 */
export function shouldRetryWsError(errOrCloseEvent: unknown): boolean {
  const close = asCloseEvent(errOrCloseEvent);
  return !(close && close.code === 4403);
}

const PONG_WAIT_MS = 5_000; // keepAlive 10s + 5s pong wait ≈ dead socket after ~15s, per spec

export function createWsTransport(options: WsTransportOptions): WsTransport {
  const reconnectListeners = new Set<() => void>();
  let dirty = false; // an abnormal close happened; next 'connected' is a reconnect
  let activeSocket: { readyState: number; close(code: number, reason: string): void } | undefined;
  let pongTimer: ReturnType<typeof setTimeout> | undefined;

  const client = createGraphqlWsClient({
    url: () => resolveWsUrl(options.wsUrl),
    connectionParams: async () => {
      const value = options.getToken ? await options.getToken() : undefined;
      return value ? { authToken: `Bearer ${value}` } : {};
    },
    lazy: true,
    keepAlive: 10_000,
    retryAttempts: Infinity,
    shouldRetry: shouldRetryWsError,
    retryWait: (retries) =>
      new Promise<void>((resolve) => {
        // Backoff per spec, resolved early when the browser comes back online.
        const win = typeof window !== 'undefined' ? window : undefined;
        const timer = setTimeout(done, backoffDelay(retries));
        const onOnline = () => done();
        win?.addEventListener('online', onOnline);
        function done() {
          clearTimeout(timer);
          win?.removeEventListener('online', onOnline);
          resolve();
        }
      }),
    webSocketImpl: options.webSocketImpl,
    on: {
      opened: (socket) => {
        activeSocket = socket as typeof activeSocket;
      },
      connected: () => {
        if (dirty) {
          dirty = false;
          for (const cb of reconnectListeners) cb();
        }
      },
      closed: (event) => {
        const close = asCloseEvent(event);
        // Clean lazy idle-close (1000) must not trigger spurious refetches.
        if (!close || close.code !== 1000) dirty = true;
        if (pongTimer) clearTimeout(pongTimer);
      },
      error: () => {
        dirty = true;
      },
      ping: (received) => {
        if (received) return; // we only watchdog pings we sent
        if (pongTimer) clearTimeout(pongTimer);
        pongTimer = setTimeout(() => {
          if (activeSocket && activeSocket.readyState === 1 /* OPEN */) {
            activeSocket.close(4408, 'Request Timeout');
          }
        }, PONG_WAIT_MS);
      },
      pong: (received) => {
        if (received && pongTimer) clearTimeout(pongTimer);
      },
    },
  });

  return {
    subscribe<TData>(payload: SubscribePayload, sink: WsSink<TData>): () => void {
      return client.subscribe<TData>(payload, {
        next: (result) => sink.next(result as ExecutionEnvelope<TData>),
        error: (err) => sink.error(wsErrorToApiError(err)),
        complete: () => sink.complete(),
      });
    },

    async *iterate<TData>(payload: SubscribePayload): AsyncIterableIterator<ExecutionEnvelope<TData>> {
      for await (const result of client.iterate<TData>(payload)) {
        yield result as ExecutionEnvelope<TData>;
      }
    },

    onReconnect(cb: () => void): () => void {
      reconnectListeners.add(cb);
      return () => reconnectListeners.delete(cb);
    },

    async dispose(): Promise<void> {
      if (pongTimer) clearTimeout(pongTimer);
      await client.dispose();
    },
  };
}
