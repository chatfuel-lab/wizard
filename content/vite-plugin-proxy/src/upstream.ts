/**
 * Every HTTP call this proxy makes to Chatfuel: the passthrough primitive the
 * forwarded routes use, and the one-operation helper the proxy's own
 * mutations share.
 */
import type { ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { outboundFetch, proxyBypassed, proxyHint } from './egress.js';
import { sendSyntheticEnvelope } from './envelope.js';
import { setSecurityHeaders } from './securityHeaders.js';
import type { ProxyContext } from './context.js';

export async function forward(
  ctx: ProxyContext,
  res: ServerResponse,
  url: string,
  /* A string body where the proxy built it (the GraphQL route reissues what it
     read), a Buffer where it is passing bytes through (the REST route). */
  init: { method: string; headers: Record<string, string>; body?: Buffer | string; timeoutMs?: number },
  transform?: (body: Buffer, contentType: string | null) => Buffer,
): Promise<void> {
  const budget = init.timeoutMs ?? ctx.config.timeoutMs;
  try {
    const upstreamRes = await outboundFetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body as BodyInit | undefined,
      signal: AbortSignal.timeout(budget),
    });
    // Status passes through untouched — the HTTP-200-with-errors envelope must
    // reach the client with its status intact. The body passes through too
    // unless a caller supplies a transform (the GraphQL route uses one to keep
    // an internal service name out of a relayed error).
    const contentType = upstreamRes.headers.get('content-type');
    res.statusCode = upstreamRes.status;
    /* Set here rather than in each host: this is the one place a proxied body
       is written, so the standalone server and the dev server end up sending
       what Vercel already sends from vercel.json for every path. `nosniff` is
       the one that matters — an upstream content-type this proxy passes
       through unread must not be re-guessed by the browser. Ours, not the
       upstream's: none of these names is copied off the upstream response, so
       there is nothing here to duplicate or override. */
    setSecurityHeaders(res);
    if (contentType) res.setHeader('content-type', contentType);
    /*
     * Without a transform the answer is piped rather than collected. Reading it
     * whole made the proxy's memory a function of what UPSTREAM sends — a file
     * download is bounded by nothing this side wrote, and N concurrent ones by
     * nothing at all — for no benefit, since every byte was going straight out
     * again. The transform path still buffers because a scrub cannot be decided
     * on half a body.
     */
    if (!transform) {
      const length = upstreamRes.headers.get('content-length');
      if (length) res.setHeader('content-length', length);
      if (!upstreamRes.body) {
        res.end();
        return;
      }
      await pipeline(Readable.fromWeb(upstreamRes.body as Parameters<typeof Readable.fromWeb>[0]), res);
      return;
    }
    const raw = Buffer.from(await upstreamRes.arrayBuffer());
    res.end(transform(raw, contentType));
  } catch (err) {
    /* Past the headers there is no answer left to write: the client has the
       status and part of a body, and the only honest end is a broken stream. */
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    // The message names the host, and — when the machine talks to the internet
    // through a proxy — says so: "unreachable" alone cannot be told apart from
    // a bad token by the person reading it.
    const host = new URL(url).host;
    const hint = proxyBypassed(host, process.env) ? undefined : proxyHint(host);
    sendSyntheticEnvelope(
      res,
      504,
      timedOut
        ? `chatfuel upstream timed out after ${budget}ms`
        : `chatfuel upstream unreachable (${host})${hint ? ` — ${hint}` : ''}`,
      'ProxyUpstreamUnavailable',
    );
  }
}

/**
 * POST one GraphQL operation to Chatfuel with the master token; returns the
 * parsed body. Throws on network failure, timeout, or a non-JSON answer —
 * every caller decides for itself what a failure means.
 */
export async function upstreamGraphql(
  ctx: ProxyContext,
  query: string,
  variables?: Record<string, unknown>,
  budgetMs?: number,
): Promise<unknown> {
  return (await upstreamGraphqlResult(ctx, query, variables, budgetMs)).payload;
}

/**
 * The same call, with the HTTP status kept.
 *
 * Chatfuel's GraphQL answers a refusal as an envelope under 200, so the status
 * is usually noise — except when it is not. A token that has expired or
 * belongs to another account is a NON-200 whose body carries none of the codes
 * `graphqlErrorCodes` knows, and reading only the body makes that identical to
 * "Chatfuel said something odd". A caller that has to tell an operator what
 * went wrong needs the difference.
 */
export async function upstreamGraphqlResult(
  ctx: ProxyContext,
  query: string,
  variables?: Record<string, unknown>,
  budgetMs?: number,
): Promise<{ status: number; payload: unknown }> {
  const response = await outboundFetch(`${ctx.config.upstream}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${ctx.config.token}` },
    body: JSON.stringify(variables === undefined ? { query } : { query, variables }),
    signal: AbortSignal.timeout(budgetMs ?? ctx.config.timeoutMs),
  });
  /* A non-JSON body (an HTML error page from something in front of Chatfuel)
     is not a reason to lose the status the caller came for. */
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}
