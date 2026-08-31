/**
 * Coalesce a burst of calls into one per animation frame, keeping the last
 * arguments.
 *
 * Several places in this package hand-roll the same pattern inside a larger
 * closure — `useDragSession`, `useAnchoredPosition`, `usePresence`. The canvas
 * needs this util hardest: a pointer move at 1000Hz on a modern mouse would
 * otherwise set React state a thousand times a second.
 *
 * ## Why the scheduler is injectable
 *
 * `requestAnimationFrame` does not exist in this repository's vitest, which is
 * node-only by choice and has no jsdom. A throttle whose only path runs through
 * a browser global is a throttle with no test, and "the last call wins" and
 * "cancel actually cancels" are exactly the properties that break silently. So
 * the scheduler is a parameter with a browser default, and the tests drive a
 * hand-cranked one.
 *
 * The default also falls back to a timer when there is no rAF at all, so a
 * component that happens to be rendered on a server does not throw on import.
 */

export interface FrameScheduler {
  request: (callback: () => void) => number;
  cancel: (handle: number) => void;
}

/** ~60Hz. Only reached where `requestAnimationFrame` is absent. */
const FRAME_MS = 16;

export const defaultScheduler: FrameScheduler = {
  request: (callback) =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(() => callback())
      : (setTimeout(callback, FRAME_MS) as unknown as number),
  cancel: (handle) => {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
    else clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  },
};

export interface Throttled<A extends unknown[]> {
  (...args: A): void;
  /** Drop the pending frame. Call it from an effect's cleanup. */
  cancel: () => void;
  /** Run the pending call now instead of next frame. */
  flush: () => void;
}

/**
 * The wrapped function runs at most once per frame, with the arguments of the
 * MOST RECENT call — not the first.
 *
 * Last-wins is the only correct choice for what this is used for. Every caller
 * here passes a position: a pointer coordinate, a scroll offset, a viewport.
 * Replaying the first of sixteen pointer positions would draw the drag one
 * frame behind the finger, permanently.
 */
export function rafThrottle<A extends unknown[]>(
  fn: (...args: A) => void,
  scheduler: FrameScheduler = defaultScheduler,
): Throttled<A> {
  let handle: number | null = null;
  let pending: A | null = null;

  const run = () => {
    handle = null;
    const args = pending;
    pending = null;
    if (args) fn(...args);
  };

  const throttled = ((...args: A) => {
    pending = args;
    /* Already scheduled: keep the frame, replace the payload. Cancelling and
       re-requesting would push the callback into the NEXT frame on every call,
       so a continuous stream of pointer events would starve it forever. */
    if (handle !== null) return;
    handle = scheduler.request(run);
  }) as Throttled<A>;

  throttled.cancel = () => {
    if (handle !== null) scheduler.cancel(handle);
    handle = null;
    pending = null;
  };

  throttled.flush = () => {
    if (handle === null) return;
    scheduler.cancel(handle);
    run();
  };

  return throttled;
}
