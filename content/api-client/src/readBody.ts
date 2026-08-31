import { ChatfuelNetworkError } from './errors';

/**
 * Reading a response body with a cap on how much of it may be believed.
 *
 * Every other budget in this client is a time budget, and a time budget does
 * not bound memory: a response that keeps arriving, slowly but without ever
 * stalling, never trips a timeout and fills the tab anyway. An upstream that
 * has been compromised, or that answers a GraphQL query with something that is
 * not one, is the case this exists for — a browser tab is the thing that dies,
 * and it dies without a message.
 *
 * `content-length` is checked first when it is there, so an oversized answer
 * costs nothing to refuse; a chunked one is counted as it arrives and
 * abandoned the moment it goes over.
 */

/** Generous for GraphQL — the largest module document answers in low single-digit MB. */
export const DEFAULT_MAX_RESPONSE_BYTES = 32 * 1024 * 1024;

export async function readTextCapped(res: Response, maxBytes: number, what: string): Promise<string> {
  const declared = Number(res.headers.get('content-length') ?? Number.NaN);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ChatfuelNetworkError(`${what}: the response declares ${declared} bytes, over the ${maxBytes}-byte cap`);
  }

  const body = res.body;
  // No stream to read (a mock Response, a runtime without one): the whole body
  // is already in hand, so the cap can only be checked after the fact.
  if (!body) {
    const text = await res.text();
    if (text.length > maxBytes) {
      throw new ChatfuelNetworkError(`${what}: the response went over the ${maxBytes}-byte cap`);
    }
    return text;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ChatfuelNetworkError(`${what}: the response went over the ${maxBytes}-byte cap`);
    }
    // `stream: true` so a multi-byte character split across two chunks is not
    // decoded into a replacement character.
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
