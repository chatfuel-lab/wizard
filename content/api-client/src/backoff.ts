export interface BackoffOptions {
  baseMs?: number;
  capMs?: number;
  /** Injectable for tests; defaults to Math.random. */
  rand?: () => number;
}

/**
 * Exponential backoff with jitter per transport-auth.md:
 * min(base * 2^attempt, cap) * (0.5 + rand * 0.5).
 * Defaults are the WS reconnect constants (5s base, 60s cap).
 */
export function backoffDelay(attempt: number, options: BackoffOptions = {}): number {
  const { baseMs = 5000, capMs = 60_000, rand = Math.random } = options;
  return Math.min(baseMs * 2 ** attempt, capMs) * (0.5 + rand() * 0.5);
}
