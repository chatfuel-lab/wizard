import { outboundFetch as egressFetch, proxyEnv } from '@chatfuel/vite-plugin-proxy/egress';
import { registerSecret } from './log';

/**
 * Outbound HTTP for the wizard itself.
 *
 * Node's built-in fetch ignores HTTP_PROXY and HTTPS_PROXY unless the process
 * was started with NODE_USE_ENV_PROXY=1 — which nobody types before their first
 * run. Behind a company proxy every call therefore goes direct and times out,
 * and the token check ends in "could not reach the API", which reads as "your
 * token is bad". So nothing here calls the global fetch directly.
 *
 * The implementation is the proxy package's `egress.ts` — the app the wizard
 * writes needs the same thing on its own side, and the two used to be copies
 * that drifted. The one wizard-specific concern kept here: the proxy URL can
 * carry a credential, it reaches the socket layer, so it can reach a stack
 * trace too — and this process is the one holding the log masker.
 */

export { describeProxy, maskProxyUrl, proxyEnv, proxyHint } from '@chatfuel/vite-plugin-proxy/egress';
export type { ProxyReadableEnv, ProxySetting } from '@chatfuel/vite-plugin-proxy/egress';

/**
 * A fetch, as everything here actually uses one: a URL and at most headers.
 *
 * Narrower than `typeof fetch` on purpose. It lives here rather than beside
 * either of its consumers because both of them have one — the module that
 * resolves a ref and the module that pulls the bytes down — and a second
 * declaration is the shape they would drift on.
 */
export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

/** Keyed by the value, so a changed variable re-registers instead of being missed. */
let registeredProxyUrl: string | undefined;

function registerProxySecret(): void {
  const setting = proxyEnv(process.env);
  if (!setting || setting.url === registeredProxyUrl) return;
  registeredProxyUrl = setting.url;
  try {
    /* Both halves of the userinfo. Squid and Zscaler take the credential as the
       USERNAME - `http://<token>@proxy:8080`, no password at all - so masking
       only the password protects the setup nobody in a corporate network
       actually has. Registered as written and as decoded, because a URL object
       percent-encodes what the environment variable holds literally. */
    const parsed = new URL(setting.url);
    for (const part of [parsed.username, parsed.password]) {
      if (!part) continue;
      registerSecret(part);
      try {
        const decoded = decodeURIComponent(part);
        if (decoded !== part) registerSecret(decoded);
      } catch {
        /* Not valid percent-encoding — the literal above is what it is. */
      }
    }
  } catch {
    /* An unparseable proxy URL has no credentials to protect. */
  }
}

/**
 * How long a request may take to produce a response, in milliseconds.
 *
 * Bounded on purpose at the head of the exchange only: the timer is cleared the
 * moment headers arrive, so a large download is not killed halfway for being
 * large. What the body is bounded by is size and stalling, in `readBytesCapped`
 * below - three different failures that a single overall deadline would either
 * conflate or, set generously enough to pass a slow download, stop catching.
 */
export const RESPONSE_TIMEOUT_MS = 30_000;

/** How long the body may go without producing a chunk before it is abandoned. */
export const STALL_TIMEOUT_MS = 30_000;

/**
 * `fetch`, through the proxy when the environment names one, and never without
 * a deadline.
 *
 * A caller that brings its own `signal` is left alone: it has said what its
 * budget is, and two abort sources on one request is a race nobody can read
 * out of a stack trace afterwards.
 */
export const outboundFetch: typeof globalThis.fetch = async (input, init) => {
  registerProxySecret();
  if (init?.signal) return egressFetch(input, init);
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`No response after ${RESPONSE_TIMEOUT_MS}ms`)),
    RESPONSE_TIMEOUT_MS,
  );
  try {
    return await egressFetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Read a response body with a cap on how much of it may be believed, and a
 * limit on how long it may say nothing.
 *
 * Everything this wizard downloads is checked against a digest - but the check
 * happens after the bytes are in memory, so without a cap the check is reached
 * only if the process survives long enough to reach it. A mirror named in
 * `CHATFUEL_CONTENT_ORIGIN`, or an `HTTPS_PROXY` that answers everything, is
 * the case this exists for: an endless body fills the heap, and one that arrives
 * a byte at a time holds a worker forever without ever tripping a deadline.
 *
 * `content-length` is checked first when it is there, so an oversized answer
 * costs nothing to refuse; a chunked one is counted as it arrives.
 */
export async function readBytesCapped(res: Response, maxBytes: number, what: string): Promise<Buffer> {
  const declared = Number(res.headers.get('content-length') ?? Number.NaN);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`${what}: the response declares ${declared} bytes, over the ${maxBytes}-byte cap`);
  }

  const body = res.body;
  /* No stream to read (a mock Response, a runtime without one): the whole body
     is already in hand, so the cap can only be checked after the fact. */
  if (!body) {
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error(`${what}: the response went over the ${maxBytes}-byte cap`);
    }
    return buffer;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      /* One timer per chunk, cleared as soon as the chunk lands: a timer left
         behind fires long after the read it was watching, and a download of
         many chunks would leave one for each. */
      let stall: NodeJS.Timeout | undefined;
      const chunk = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          stall = setTimeout(() => reject(new Error(`${what}: no data for ${STALL_TIMEOUT_MS}ms`)), STALL_TIMEOUT_MS);
        }),
      ]).finally(() => clearTimeout(stall));
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maxBytes) {
        throw new Error(`${what}: the response went over the ${maxBytes}-byte cap`);
      }
      chunks.push(chunk.value);
    }
  } catch (err) {
    await reader.cancel().catch(() => {
      /* Already torn down by whatever we are reporting. */
    });
    throw err;
  }
  return Buffer.concat(chunks, total);
}
