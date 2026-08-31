import { useEffect, useState } from 'react';
import { acquireCoworkerRuntime, type CoworkerRuntime } from '../lib/runtime';
import type { ApiClient } from '../types';

/**
 * Hold the shared runtime for as long as this surface is mounted.
 *
 * Acquired in an effect and not in a `useState` initialiser: React may throw a
 * render away, and a released-in-a-cleanup-that-never-runs subscription is a
 * leak. The grace period inside `acquireCoworkerRuntime` is what makes the
 * effect's own double-invocation under StrictMode free.
 *
 * Returns null for exactly one render, which every caller already handles —
 * it is the same tick the thread spends loading.
 */
export function useCoworkerRuntime(client: ApiClient, botId: string): CoworkerRuntime | null {
  const [runtime, setRuntime] = useState<CoworkerRuntime | null>(null);
  useEffect(() => {
    const held = acquireCoworkerRuntime(client, botId);
    setRuntime(held.runtime);
    return () => {
      setRuntime(null);
      held.release();
    };
  }, [client, botId]);
  return runtime;
}
