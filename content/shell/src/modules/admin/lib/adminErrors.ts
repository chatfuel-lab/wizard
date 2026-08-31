/**
 * What went wrong, as one sentence.
 *
 * The proxy already writes those sentences — every admin refusal is a
 * GraphQL-shaped envelope carrying a message meant to be read — so this file
 * carries no copy of its own beyond the two cases the server never gets to
 * answer: a request that never reached it, and a deployment that has no panel.
 */

export class AdminError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
    this.status = status;
  }
}

export const UNREACHABLE_MESSAGE = 'The server did not answer';

export const errorMessage = (err: unknown): string =>
  err instanceof AdminError || err instanceof Error ? err.message || UNREACHABLE_MESSAGE : UNREACHABLE_MESSAGE;

export const errorCode = (err: unknown): string | null => (err instanceof AdminError ? err.code : null);
