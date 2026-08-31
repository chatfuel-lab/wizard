import { ChatfuelHttpError, ChatfuelNetworkError, type ExecutionEnvelope } from '../errors';
import type { TypedDoc } from '../module-client';
import { DEFAULT_MAX_RESPONSE_BYTES, readTextCapped } from '../readBody';
import { assertCredentialSafeUrl, carriesCredential } from '../urlGuard';

export interface DocMeta {
  text: string;
  name?: string;
  kind: 'query' | 'mutation' | 'subscription';
  /**
   * Whether `kind` was read off the document or fell back to the default.
   * A caller deciding whether an operation may be retried needs to tell the
   * two apart: a document this regex could not read might be a mutation, and
   * replaying a mutation is the one mistake that costs somebody money.
   */
  kindKnown: boolean;
}

// Codegen prints the operation first and its fragments after it, so the head
// of the text is the operation definition: kind, then a name unless the
// operation is anonymous (`query {` / `query(`), which the optional group
// leaves undefined the way the AST's `name` used to.
const OPERATION_HEAD = /^\s*(query|mutation|subscription)\b\s*([A-Za-z_]\w*)?/;

// Documents are module-level consts, so reading one is a one-time cost per
// operation. A generated document is a String *object* (TypedDocumentString
// subclasses String), so it keys a WeakMap like any other object.
const docMetaCache = new WeakMap<object, DocMeta>();

/**
 * What the transport needs to know about a document: its text and, off the
 * text, the operation's kind and name. The generated document already is the
 * text — printed once by codegen, fragments included — so there is no AST here
 * to walk or print any more; the transport does not depend on `graphql`.
 */
export function getDocMeta<TData, TVars>(doc: TypedDoc<TData, TVars>): DocMeta {
  let meta = docMetaCache.get(doc);
  if (!meta) {
    const text = String(doc);
    const head = OPERATION_HEAD.exec(text);
    meta = {
      text,
      name: head?.[2],
      kind: (head?.[1] as DocMeta['kind'] | undefined) ?? 'query',
      kindKnown: head !== null,
    };
    docMetaCache.set(doc, meta);
  }
  return meta;
}

export interface HttpTransportOptions {
  url: string;
  /** The origin `url` was derived to, from `credentialOrigin`. Undefined leaves the check on scheme alone. */
  pinnedOrigin?: string;
  /** Resolves to the full header value ("Bearer <token>") or undefined in browser-behind-proxy mode. */
  getAuthHeader: () => Promise<string | undefined>;
  fetchImpl: typeof fetch;
  headers?: Record<string, string>;
  timeoutMs: number;
  maxResponseBytes?: number;
}

/**
 * A timeout that is not a positive number of milliseconds is a configuration
 * mistake with a quiet failure mode: `AbortSignal.timeout(0)` fires before the
 * request leaves, and the caller sees a network error rather than the typo
 * that caused it.
 */
export function requirePositiveMs(value: number, option: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${option} must be a positive number of milliseconds, got ${value}`);
  }
  return value;
}

/**
 * Header names are case-insensitive on the wire but not in an object literal,
 * so a caller's `Authorization` and this transport's own `authorization` would
 * both survive the merge and `Headers` would join them into one value —
 * "Bearer theirs, Bearer ours". Folding every caller key to lower case first
 * means there is exactly one authorization header and the client's own wins.
 */
function mergeHeaders(extra: Record<string, string> | undefined): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  for (const [key, value] of Object.entries(extra ?? {})) headers[key.toLowerCase()] = value;
  return headers;
}

export async function executeHttp<TData, TVars>(
  transport: HttpTransportOptions,
  doc: TypedDoc<TData, TVars>,
  variables: TVars,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<ExecutionEnvelope<TData>> {
  const meta = getDocMeta(doc);
  // ?op=<name> is ignored by the server but keeps proxy/upstream logs readable.
  const url = meta.name
    ? `${transport.url}${transport.url.includes('?') ? '&' : '?'}op=${encodeURIComponent(meta.name)}`
    : transport.url;

  const headers = mergeHeaders(transport.headers);
  const auth = await transport.getAuthHeader();
  if (auth) headers.authorization = auth;

  // The last point that knows whether this request carries a credential: the
  // token may be a getter that only now resolved to a value, and the header may
  // have come from the caller with no token configured at all. The client
  // checked its urls at construction, and this checks what is about to be sent.
  if (carriesCredential(headers)) assertCredentialSafeUrl(transport.url, 'url', transport.pinnedOrigin);

  // The per-request budget wins over the transport's. Both are still `any`-ed
  // with the caller's own signal, so an abort stays an abort.
  const budgetMs =
    opts.timeoutMs === undefined ? transport.timeoutMs : requirePositiveMs(opts.timeoutMs, 'RequestOptions.timeoutMs');
  const signals = [AbortSignal.timeout(budgetMs)];
  if (opts.signal) signals.push(opts.signal);

  let text: string;
  let status: number;
  try {
    const res = await transport.fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: meta.text, operationName: meta.name, variables }),
      signal: AbortSignal.any(signals),
    });
    status = res.status;
    text = await readTextCapped(res, transport.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, meta.name ?? meta.kind);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new ChatfuelNetworkError(`Network failure for ${meta.name ?? meta.kind}: ${reason}`, {
      cause,
    });
  }

  // 429 is always surfaced as an HTTP error so the throttle can retry it.
  if (status === 429) throw new ChatfuelHttpError(429, text);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  if (body !== null && typeof body === 'object' && ('data' in body || 'errors' in body)) {
    // Any status with a parseable envelope passes through — the error envelope
    // matters more than the status line (transport-auth.md).
    return body as ExecutionEnvelope<TData>;
  }
  throw new ChatfuelHttpError(status, text);
}
