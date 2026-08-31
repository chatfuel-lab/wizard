/**
 * Error envelope handling per chatfuel-core transport-auth.md.
 *
 * Classification scans errors[].extensions.code — never the HTTP status:
 * a 401-equivalent (code "Unauthorized") arrives inside an HTTP 200.
 *
 * The API also relays some failures with the real entries nested under
 * extensions.errors, beneath a generic outer message — a bad token arrives that
 * way, so every code lookup walks one level down too.
 */

export interface GraphQLErrorEntry {
  message: string;
  path?: ReadonlyArray<string | number>;
  extensions?: {
    code?: string;
    service?: string;
    traceId?: string;
    [key: string]: unknown;
  };
}

/** Top-level code plus the codes of any errors nested under it. */
export function errorCodes(entry: GraphQLErrorEntry): string[] {
  const codes: string[] = [];
  if (entry.extensions?.code) codes.push(entry.extensions.code);
  const nested = entry.extensions?.errors;
  if (Array.isArray(nested)) {
    for (const inner of nested as GraphQLErrorEntry[]) {
      if (inner?.extensions?.code) codes.push(inner.extensions.code);
    }
  }
  return codes;
}

/** The traceId of an entry or of the error nested under it. */
export function errorTraceId(entry: GraphQLErrorEntry): string | undefined {
  if (entry.extensions?.traceId) return entry.extensions.traceId;
  const nested = entry.extensions?.errors;
  if (Array.isArray(nested)) {
    for (const inner of nested as GraphQLErrorEntry[]) {
      if (inner?.extensions?.traceId) return inner.extensions.traceId;
    }
  }
  return undefined;
}

export interface ExecutionEnvelope<TData> {
  data?: TData | null;
  errors?: GraphQLErrorEntry[];
}

export class ChatfuelApiError extends Error {}

/** fetch rejection, timeout, or WS transport failure. */
export class ChatfuelNetworkError extends ChatfuelApiError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ChatfuelNetworkError';
  }
}

/** Non-2xx response without a parseable GraphQL envelope — plus any 429, which is always surfaced this way so the throttle can retry it. */
export class ChatfuelHttpError extends ChatfuelApiError {
  readonly status: number;
  readonly bodySnippet: string;

  constructor(status: number, body: string) {
    // The body stays on `bodySnippet` and out of `message`. The message is
    // what a UI renders and a logger keeps, and somebody else's error body is
    // not guaranteed to be free of tokens or personal data — a relayed
    // upstream failure can carry either. Callers matching on a platform code
    // (FileTooBig, FileContentTypeNotSupported) read the field, which is where
    // they read it already.
    super(`Chatfuel API HTTP ${status}`);
    this.name = 'ChatfuelHttpError';
    this.status = status;
    this.bodySnippet = body.slice(0, 200);
  }
}

/** errors[] present in the envelope (any HTTP status, including 200). data + errors can coexist — partial data rides on the error. */
export class ChatfuelGraphQLError extends ChatfuelApiError {
  readonly errors: GraphQLErrorEntry[];
  /** Partial data that arrived alongside the errors, if any. */
  readonly data?: unknown;

  constructor(errors: GraphQLErrorEntry[], data?: unknown) {
    const first = errors[0];
    const code = first ? errorCodes(first)[0] : undefined;
    const traceId = errors.map(errorTraceId).find(Boolean);
    const parts = [first?.message ?? 'GraphQL error'];
    if (code) parts.push(`code=${code}`);
    if (traceId) parts.push(`traceId=${traceId}`);
    super(parts.join(' | '));
    this.name = 'ChatfuelGraphQLError';
    this.errors = errors;
    this.data = data;
  }

  get code(): string | undefined {
    const first = this.errors[0];
    return first ? errorCodes(first)[0] : undefined;
  }

  get traceId(): string | undefined {
    return this.errors.map(errorTraceId).find(Boolean);
  }

  get isPermissionDenied(): boolean {
    return this.errors.some((e) => errorCodes(e).includes('NotEnoughPermissions'));
  }
}

/** Some errors[].extensions.code === "Unauthorized" — the token needs rotation; never retried. */
export class ChatfuelAuthError extends ChatfuelGraphQLError {
  constructor(errors: GraphQLErrorEntry[], data?: unknown) {
    super(errors, data);
    this.name = 'ChatfuelAuthError';
  }
}

/**
 * Codes the proxy gate answers with BEFORE anything reaches Chatfuel: the
 * caller's own session (Supabase) is missing/expired, or the caller is not a
 * member of this deployment's tenant. Distinct from `Unauthorized`, which still
 * means "the Chatfuel token needs rotation".
 */
export const SESSION_ERROR_CODES = ['AuthSessionRequired', 'AuthTenantForbidden'] as const;
export type SessionErrorCode = (typeof SESSION_ERROR_CODES)[number];

/** The proxy rejected the caller's session (401 AuthSessionRequired) or membership (403 AuthTenantForbidden). */
export class ChatfuelSessionError extends ChatfuelGraphQLError {
  constructor(errors: GraphQLErrorEntry[], data?: unknown) {
    super(errors, data);
    this.name = 'ChatfuelSessionError';
  }

  get reason(): 'sessionRequired' | 'forbidden' {
    return this.errors.some((e) => errorCodes(e).includes('AuthTenantForbidden')) ? 'forbidden' : 'sessionRequired';
  }
}

export const isSessionError = (err: unknown): err is ChatfuelSessionError => err instanceof ChatfuelSessionError;

/** True when err is a ChatfuelGraphQLError carrying the given extensions.code. */
export const hasErrorCode = (err: unknown, code: string): boolean =>
  err instanceof ChatfuelGraphQLError && err.errors.some((e) => errorCodes(e).includes(code));

/**
 * Every defined error code on an unknown error, nested ones first within each
 * entry — the API relays its real code one level down (see the file header),
 * and the nested code is the one worth acting on.
 *
 * Duck-typed on `.errors` rather than `instanceof ChatfuelGraphQLError`: tests
 * hand back plain envelope-shaped objects, and "which code is this?" must
 * answer the same either way. Anything without an errors array answers [].
 */
export function nestedErrorCodes(err: unknown): string[] {
  const errors = (err as { errors?: unknown } | null | undefined)?.errors;
  if (!Array.isArray(errors)) return [];
  const codes: string[] = [];
  for (const entry of errors as GraphQLErrorEntry[]) {
    const nested = entry?.extensions?.errors;
    if (Array.isArray(nested)) {
      for (const inner of nested as GraphQLErrorEntry[]) {
        const code = inner?.extensions?.code;
        if (typeof code === 'string' && code) codes.push(code);
      }
    }
    const code = entry?.extensions?.code;
    if (typeof code === 'string' && code) codes.push(code);
  }
  return codes;
}

/**
 * The first code in `messages`, in `nestedErrorCodes` order; otherwise the
 * error's own message, which is at least honest. The messages table stays with
 * the caller — codes are domain vocabulary, this is only the lookup.
 */
export function errorMessageFor(
  err: unknown,
  messages: Record<string, string>,
  fallback = 'Something went wrong.',
): string {
  for (const code of nestedErrorCodes(err)) {
    const message = messages[code];
    if (message) return message;
  }
  if (err instanceof Error) return err.message || fallback;
  return err === null || err === undefined ? fallback : String(err);
}

/** Wrap an envelope's errors into the right error class. Call only when errors[] is non-empty. */
export function toApiError(envelope: ExecutionEnvelope<unknown>): ChatfuelGraphQLError {
  const errors = envelope.errors ?? [];
  const isSession = errors.some((e) =>
    errorCodes(e).some((code) => (SESSION_ERROR_CODES as readonly string[]).includes(code)),
  );
  if (isSession) return new ChatfuelSessionError(errors, envelope.data);
  const isAuth = errors.some((e) => errorCodes(e).includes('Unauthorized'));
  return isAuth ? new ChatfuelAuthError(errors, envelope.data) : new ChatfuelGraphQLError(errors, envelope.data);
}
