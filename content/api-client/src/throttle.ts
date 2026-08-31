import { backoffDelay } from './backoff';
import { ChatfuelHttpError, ChatfuelNetworkError } from './errors';

export interface ThrottleOptions {
  /** Requests per second (token-bucket refill rate). Keep it below whatever ceiling the API enforces on your token. */
  rps: number;
  /** Maximum in-flight requests. */
  concurrency: number;
  /**
   * Retries for 429/5xx/network errors. Default 3. GraphQL and auth errors are
   * never retried, and a non-idempotent task is retried only on 429 — see
   * `isRetryable`.
   */
  maxRetries?: number;
}

/** Preset for a program working the API in bulk: modest rate, concurrency 2, backoff on failure. */
export const BATCH_THROTTLE: ThrottleOptions = { rps: 5, concurrency: 2 };

export interface TaskOptions {
  /**
   * Whether replaying the task is safe. Default false: a caller that has not
   * said so does not get its work repeated.
   */
  idempotent?: boolean;
}

export type Throttle = <T>(task: () => Promise<T>, opts?: TaskOptions) => Promise<T>;

/**
 * 429 is retried whatever the task is: the server is saying it turned the
 * request away before running it, so a repeat cannot double anything.
 *
 * A network failure and a 5xx say nothing of the sort. The request may have
 * reached Chatfuel, been executed, and lost its answer on the way back — so a
 * retry there is a second execution. For a query that costs a wasted round
 * trip; for a mutation it is a second workspace on somebody's card. Hence a
 * non-idempotent task stops at the first of those.
 */
function isRetryable(err: unknown, idempotent: boolean): boolean {
  if (err instanceof ChatfuelHttpError && err.status === 429) return true;
  if (!idempotent) return false;
  if (err instanceof ChatfuelNetworkError) return true;
  if (err instanceof ChatfuelHttpError) return err.status >= 500;
  return false;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createThrottle(options: ThrottleOptions): Throttle {
  const { rps, concurrency, maxRetries = 3 } = options;
  // Each of these has a quiet failure mode rather than a loud one. `rps: 0`
  // makes the interval Infinity, so the second request ever made sleeps until
  // the process is killed; a concurrency below one means no task acquires a
  // slot at all. Neither says anything on the way down, so they are refused
  // here instead.
  if (!Number.isFinite(rps) || rps <= 0) {
    throw new Error(`createThrottle: rps must be a positive number, got ${rps}`);
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`createThrottle: concurrency must be a positive integer, got ${concurrency}`);
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new Error(`createThrottle: maxRetries must be a non-negative integer, got ${maxRetries}`);
  }
  const interval = 1000 / rps;
  let nextSlot = 0; // earliest time the next request may start
  let active = 0;
  const waiters: Array<() => void> = [];

  async function acquire(): Promise<void> {
    if (active >= concurrency) {
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
    active += 1;
    const now = Date.now();
    const startAt = Math.max(now, nextSlot);
    nextSlot = startAt + interval;
    if (startAt > now) await sleep(startAt - now);
  }

  function release(): void {
    active -= 1;
    waiters.shift()?.();
  }

  return async function throttled<T>(task: () => Promise<T>, opts: TaskOptions = {}): Promise<T> {
    const idempotent = opts.idempotent ?? false;
    let attempt = 0;
    let delay = 0;
    for (;;) {
      if (delay > 0) await sleep(delay);
      await acquire();
      try {
        return await task();
      } catch (err) {
        if (attempt < maxRetries && isRetryable(err, idempotent)) {
          delay = backoffDelay(attempt, { baseMs: 1000, capMs: 30_000 });
          attempt += 1;
          continue; // finally releases the slot before the backoff sleep
        }
        throw err;
      } finally {
        release();
      }
    }
  };
}
