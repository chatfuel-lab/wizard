import { useCallback, useEffect, useState } from 'react';

/** How long a flashed error stays on screen. */
export const ERROR_FLASH_MS = 4000;

export interface ErrorFlash {
  error: string | null;
  /** Show `message` now; it clears itself after `ERROR_FLASH_MS`. */
  flash: (message: string) => void;
  /** Take it down early — e.g. when the action that failed is retried. */
  clear: () => void;
}

/**
 * A transient error message on a timer, done once and done right.
 *
 * The timer is an effect keyed on the message, not a ref beside the setter:
 * the cleanup is what cancels the countdown when the component unmounts, and
 * re-running the effect is what restarts it when a second failure replaces the
 * first — a hand-held `setTimeout` next to a `setState` does neither.
 */
export function useErrorFlash(): ErrorFlash {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(null), ERROR_FLASH_MS);
    return () => clearTimeout(timer);
  }, [error]);

  const flash = useCallback((message: string) => setError(message), []);
  const clear = useCallback(() => setError(null), []);

  return { error, flash, clear };
}
