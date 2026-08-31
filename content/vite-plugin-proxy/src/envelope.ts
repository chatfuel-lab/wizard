/**
 * Reading requests and writing answers — the byte-level half every route
 * shares. Refusals are GraphQL-shaped envelopes even on the non-GraphQL
 * routes, so the client's error path reads every answer the same way.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

/** A plain JSON answer (the auth routes are not GraphQL). */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

export function sendSyntheticEnvelope(res: ServerResponse, status: number, message: string, code: string): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  // A refusal must not outlive the moment it was true: a cached 403 would keep
  // saying "not your bot" about a bot that has since become the caller's.
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({ errors: [{ message, extensions: { code } }] }));
}

/**
 * 405, with an `allow` header and a BARE body — deliberately no envelope.
 * A wrong method is a caller-side programming error, not an application answer.
 */
export function send405(res: ServerResponse, allow: string): void {
  res.statusCode = 405;
  res.setHeader('allow', allow);
  res.end();
}

export function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * The same, with a ceiling: `null` when the body went past it.
 *
 * Past the limit the bytes are DROPPED rather than kept. A ceiling checked after
 * the body has been collected is not a ceiling on anything — somebody who sends
 * a gigabyte has already been given a gigabyte of memory by the time it fails.
 *
 * And the answer is settled THERE, at the byte that crossed the line, rather
 * than at the end of a body nobody is going to read. Waiting for `end` made the
 * ceiling a limit on memory and on nothing else: a caller could hold the socket
 * and pour bytes into it for as long as they liked, at no cost to themselves,
 * and N of those held N connections for as long as they liked. The stream is
 * paused so TCP stops asking for more, and `refuseOversizedBody` closes the
 * connection once the 413 is out — which is the only way to stop a sender that
 * has not finished sending.
 */
export function readBodyCapped(req: IncomingMessage, maxBytes: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    const settle = (value: Buffer | null): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    req.on('data', (chunk: Buffer) => {
      if (settled) return;
      size += chunk.length;
      if (size > maxBytes) {
        chunks.length = 0;
        req.pause();
        settle(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => settle(Buffer.concat(chunks)));
    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

/**
 * Answer a body that went past its ceiling, and hang up.
 *
 * The caller is by definition still sending, so `connection: close` and a
 * closed socket after the refusal has been flushed is the whole point: a 413 on
 * a keep-alive connection invites the rest of the gigabyte.
 *
 * The close is a FIN first and a destroy only after a grace period. A reset
 * discards whatever is still in flight, which on a socket the caller is writing
 * into means the 413 itself — the caller is told nothing and retries. FIN is
 * ordered behind the bytes already sent, so the refusal arrives, and the
 * destroy that follows is there for the caller who keeps pouring anyway.
 */
const REFUSAL_FLUSH_MS = 250;

export function refuseOversizedBody(
  req: IncomingMessage,
  res: ServerResponse,
  code = 'RequestTooLarge',
  message = JSON_BODY_TOO_LARGE_MESSAGE,
): void {
  if (!res.headersSent) res.setHeader('connection', 'close');
  res.once('finish', () => {
    const socket = res.socket;
    socket?.end();
    const timer = setTimeout(() => req.destroy(), REFUSAL_FLUSH_MS);
    timer.unref();
    socket?.once('close', () => clearTimeout(timer));
  });
  sendSyntheticEnvelope(res, 413, message, code);
}

/**
 * The ceiling for a route that reads a JSON body of its own: the same 2 MiB the
 * GraphQL passthrough allows. These bodies carry a name, an id or a post —
 * nothing here is a file, and the media route has its own, larger, ceiling.
 */
export const JSON_BODY_MAX_BYTES = 2 * 1024 * 1024;

/** What a caller who sent more than the ceiling is answered with. */
const JSON_BODY_TOO_LARGE_MESSAGE = 'That request body is too large';

/**
 * A JSON body read under a ceiling.
 *
 * `tooLarge` is kept apart from a `value` of `undefined` because the two are
 * different answers: too much is refused before the route looks at it, while
 * nothing usable is the route's own 400 about the field it wanted.
 */
export type CappedJsonBody = { tooLarge: true } | { tooLarge: false; value: unknown };

export async function readJsonBodyCapped(req: IncomingMessage, maxBytes: number): Promise<CappedJsonBody> {
  let raw: Buffer | null;
  try {
    raw = await readBodyCapped(req, maxBytes);
  } catch {
    /* The request went away mid-read. Nothing to parse. */
    return { tooLarge: false, value: undefined };
  }
  if (raw === null) return { tooLarge: true };
  try {
    return { tooLarge: false, value: JSON.parse(raw.toString() || 'null') as unknown };
  } catch {
    return { tooLarge: false, value: undefined };
  }
}

export function pathnameOf(req: IncomingMessage): string | undefined {
  try {
    return new URL(req.url ?? '', 'http://localhost').pathname;
  } catch {
    return undefined;
  }
}

export function searchOf(req: IncomingMessage): string {
  const i = req.url?.indexOf('?') ?? -1;
  return i >= 0 ? req.url!.slice(i) : '';
}
