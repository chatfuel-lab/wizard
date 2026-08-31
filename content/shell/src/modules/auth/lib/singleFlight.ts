/**
 * Join-or-start: one run of a task per key, for as long as that run is going.
 *
 * Signing up asks the server for a workspace from two directions within
 * milliseconds — the SIGNED_IN membership fetch and the sign-up screen's own
 * await — and two runs are two attempts to create the same account's first
 * bot, on the deployment's Chatfuel plan. The second caller joins the first
 * instead.
 *
 * This is NOT a cache. The promise is dropped the moment it settles, in either
 * direction, so the next caller gets a real second attempt rather than a
 * remembered answer: a workspace whose bot was deleted must be provisionable
 * again, and a failure must be retryable.
 *
 * The same shape as the proxy's `workspaceFence` (`inFlight ??= ask()…`) and
 * `ResetPasswordPage`'s `verifyOnce`, pulled out here because this one has to
 * be provable: the app has no DOM test environment, so anything asserted about
 * provisioning has to live in a module that runs on its own.
 */
export interface SingleFlight<T> {
  /** The run already going for this key, or a new one. */
  run(key: string, task: () => Promise<T>): Promise<T>;
  /** Whether a run is going for this key. */
  pending(key: string): boolean;
}

export function createSingleFlight<T>(): SingleFlight<T> {
  const running = new Map<string, Promise<T>>();
  return {
    run(key, task) {
      const joined = running.get(key);
      if (joined) return joined;
      const started = task();
      running.set(key, started);
      /*
       * `then(clear, clear)` and not `.finally()`: finally returns a NEW
       * promise that nobody awaits, so a rejection every real caller handles
       * would still surface as an unhandled one. The identity check keeps a
       * slow run from clearing the entry of the run that replaced it.
       */
      const clear = () => {
        if (running.get(key) === started) running.delete(key);
      };
      void started.then(clear, clear);
      return started;
    },
    pending: (key) => running.has(key),
  };
}
