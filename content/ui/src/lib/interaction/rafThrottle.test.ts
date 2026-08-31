import { describe, expect, it } from 'vitest';
import { rafThrottle, type FrameScheduler } from './rafThrottle';

/**
 * A hand-cranked scheduler. `requestAnimationFrame` does not exist in this
 * repository's vitest — node-only, no jsdom — and even where it does, a test
 * that waits for a real frame is a test that can flake.
 */
function manualScheduler() {
  const frames = new Map<number, () => void>();
  let next = 1;

  const scheduler: FrameScheduler = {
    request: (callback) => {
      const handle = next;
      next += 1;
      frames.set(handle, callback);
      return handle;
    },
    cancel: (handle) => {
      frames.delete(handle);
    },
  };

  return {
    scheduler,
    get pending() {
      return frames.size;
    },
    /** Run everything currently scheduled, as a browser would on the next tick. */
    tick() {
      const due = [...frames.values()];
      frames.clear();
      for (const callback of due) callback();
    },
  };
}

describe('rafThrottle', () => {
  it('does not call through until the frame runs', () => {
    const frame = manualScheduler();
    const calls: number[] = [];
    const throttled = rafThrottle((n: number) => calls.push(n), frame.scheduler);

    throttled(1);
    expect(calls).toEqual([]);
    frame.tick();
    expect(calls).toEqual([1]);
  });

  it('collapses a burst into one call with the LAST arguments', () => {
    const frame = manualScheduler();
    const calls: number[] = [];
    const throttled = rafThrottle((n: number) => calls.push(n), frame.scheduler);

    throttled(1);
    throttled(2);
    throttled(3);
    expect(frame.pending).toBe(1);
    frame.tick();
    /* Last, not first: every caller here passes a position, and replaying the
       first of sixteen pointer samples would draw the drag a frame behind the
       finger permanently. */
    expect(calls).toEqual([3]);
  });

  it('keeps the scheduled frame rather than re-requesting it', () => {
    const frame = manualScheduler();
    const throttled = rafThrottle(() => {}, frame.scheduler);

    throttled();
    throttled();
    throttled();
    /* Cancel-and-reschedule would push the callback into the next frame on
       every call, so a continuous pointer stream would starve it forever. */
    expect(frame.pending).toBe(1);
  });

  it('schedules again after the frame has run', () => {
    const frame = manualScheduler();
    const calls: number[] = [];
    const throttled = rafThrottle((n: number) => calls.push(n), frame.scheduler);

    throttled(1);
    frame.tick();
    throttled(2);
    frame.tick();
    expect(calls).toEqual([1, 2]);
  });

  it('does nothing on a frame with no pending call', () => {
    const frame = manualScheduler();
    const calls: number[] = [];
    const throttled = rafThrottle(() => calls.push(1), frame.scheduler);

    frame.tick();
    expect(calls).toEqual([]);
    throttled();
    frame.tick();
    frame.tick();
    expect(calls).toEqual([1]);
  });

  it('cancel drops the pending call and the frame with it', () => {
    const frame = manualScheduler();
    const calls: number[] = [];
    const throttled = rafThrottle(() => calls.push(1), frame.scheduler);

    throttled();
    throttled.cancel();
    expect(frame.pending).toBe(0);
    frame.tick();
    expect(calls).toEqual([]);
  });

  it('cancel is safe with nothing pending, and does not wedge the throttle', () => {
    const frame = manualScheduler();
    const calls: number[] = [];
    const throttled = rafThrottle(() => calls.push(1), frame.scheduler);

    throttled.cancel();
    throttled();
    frame.tick();
    expect(calls).toEqual([1]);
  });

  it('flush runs the pending call now and clears the frame', () => {
    const frame = manualScheduler();
    const calls: number[] = [];
    const throttled = rafThrottle((n: number) => calls.push(n), frame.scheduler);

    throttled(7);
    throttled.flush();
    expect(calls).toEqual([7]);
    expect(frame.pending).toBe(0);

    frame.tick();
    expect(calls).toEqual([7]);
  });

  it('flush with nothing pending is a no-op', () => {
    const frame = manualScheduler();
    const calls: number[] = [];
    const throttled = rafThrottle(() => calls.push(1), frame.scheduler);

    throttled.flush();
    expect(calls).toEqual([]);
  });

  it('passes every argument through', () => {
    const frame = manualScheduler();
    const seen: Array<[string, number]> = [];
    const throttled = rafThrottle((a: string, b: number) => seen.push([a, b]), frame.scheduler);

    throttled('a', 1);
    throttled('b', 2);
    frame.tick();
    expect(seen).toEqual([['b', 2]]);
  });
});
