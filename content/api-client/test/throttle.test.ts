import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatfuelGraphQLError, ChatfuelHttpError, ChatfuelNetworkError } from '../src/errors';
import { createThrottle } from '../src/throttle';

describe('createThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('spaces task starts by 1000/rps ms', async () => {
    const throttle = createThrottle({ rps: 2, concurrency: 10 });
    const starts: number[] = [];
    const task = () => {
      starts.push(Date.now());
      return Promise.resolve('ok');
    };
    const all = Promise.all([throttle(task), throttle(task), throttle(task)]);
    await vi.advanceTimersByTimeAsync(2000);
    await all;
    expect(starts).toHaveLength(3);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(500);
    expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(500);
  });

  it('caps in-flight tasks at concurrency', async () => {
    const throttle = createThrottle({ rps: 1000, concurrency: 1 });
    let releaseFirst!: () => void;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let secondStarted = false;

    const first = throttle(() => firstBlocked.then(() => 'first'));
    const second = throttle(() => {
      secondStarted = true;
      return Promise.resolve('second');
    });

    await vi.advanceTimersByTimeAsync(50);
    expect(secondStarted).toBe(false);

    releaseFirst();
    await vi.advanceTimersByTimeAsync(50);
    expect(secondStarted).toBe(true);
    await expect(first).resolves.toBe('first');
    await expect(second).resolves.toBe('second');
  });

  it('retries 429 with backoff, then succeeds', async () => {
    const throttle = createThrottle({ rps: 1000, concurrency: 2, maxRetries: 3 });
    let calls = 0;
    const task = () => {
      calls += 1;
      if (calls === 1) return Promise.reject(new ChatfuelHttpError(429, 'slow down'));
      return Promise.resolve('recovered');
    };
    const result = throttle(task);
    // Backoff for attempt 0 is at most 1000 ms (baseMs 1000).
    await vi.advanceTimersByTimeAsync(1500);
    await expect(result).resolves.toBe('recovered');
    expect(calls).toBe(2);
  });

  it('retries network-ish 5xx but gives up after maxRetries', async () => {
    const throttle = createThrottle({ rps: 1000, concurrency: 2, maxRetries: 1 });
    let calls = 0;
    const task = () => {
      calls += 1;
      return Promise.reject(new ChatfuelHttpError(503, 'unavailable'));
    };
    const result = throttle(task, { idempotent: true });
    const assertion = expect(result).rejects.toBeInstanceOf(ChatfuelHttpError);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(calls).toBe(2);
  });

  it('never retries GraphQL errors (including auth)', async () => {
    const throttle = createThrottle({ rps: 1000, concurrency: 2, maxRetries: 3 });
    let calls = 0;
    const task = () => {
      calls += 1;
      return Promise.reject(
        new ChatfuelGraphQLError([{ message: 'no', extensions: { code: 'NotEnoughPermissions' } }]),
      );
    };
    const result = throttle(task);
    const assertion = expect(result).rejects.toBeInstanceOf(ChatfuelGraphQLError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(calls).toBe(1);
  });

  it('does not replay a non-idempotent task on 5xx', async () => {
    // 503 does not say the request was turned away — Chatfuel may have run it
    // and lost the answer on the way back.
    const throttle = createThrottle({ rps: 1000, concurrency: 2, maxRetries: 3 });
    let calls = 0;
    const task = () => {
      calls += 1;
      return Promise.reject(new ChatfuelHttpError(503, 'unavailable'));
    };
    const result = throttle(task);
    const assertion = expect(result).rejects.toBeInstanceOf(ChatfuelHttpError);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(calls).toBe(1);
  });

  it('does not replay a non-idempotent task on a network failure', async () => {
    const throttle = createThrottle({ rps: 1000, concurrency: 2, maxRetries: 3 });
    let calls = 0;
    const task = () => {
      calls += 1;
      return Promise.reject(new ChatfuelNetworkError('connection reset'));
    };
    const result = throttle(task);
    const assertion = expect(result).rejects.toBeInstanceOf(ChatfuelNetworkError);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(calls).toBe(1);
  });

  it('still retries a non-idempotent task on 429', async () => {
    // 429 is the one refusal that names itself: turned away before running.
    const throttle = createThrottle({ rps: 1000, concurrency: 2, maxRetries: 3 });
    let calls = 0;
    const task = () => {
      calls += 1;
      if (calls === 1) return Promise.reject(new ChatfuelHttpError(429, 'slow down'));
      return Promise.resolve('recovered');
    };
    const result = throttle(task, { idempotent: false });
    await vi.advanceTimersByTimeAsync(1500);
    await expect(result).resolves.toBe('recovered');
    expect(calls).toBe(2);
  });

  it('retries an idempotent task on a network failure', async () => {
    const throttle = createThrottle({ rps: 1000, concurrency: 2, maxRetries: 3 });
    let calls = 0;
    const task = () => {
      calls += 1;
      if (calls < 3) return Promise.reject(new ChatfuelNetworkError('connection reset'));
      return Promise.resolve('recovered');
    };
    const result = throttle(task, { idempotent: true });
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toBe('recovered');
    expect(calls).toBe(3);
  });
});

describe('createThrottle refuses options with a quiet failure mode', () => {
  it('rejects an rps that would make the interval Infinity or negative', () => {
    for (const rps of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => createThrottle({ rps, concurrency: 1 })).toThrow(/rps/);
    }
  });

  it('rejects a concurrency no task could ever acquire', () => {
    for (const concurrency of [0, -1, 1.5]) {
      expect(() => createThrottle({ rps: 1, concurrency })).toThrow(/concurrency/);
    }
  });

  it('rejects a negative or fractional maxRetries', () => {
    for (const maxRetries of [-1, 0.5]) {
      expect(() => createThrottle({ rps: 1, concurrency: 1, maxRetries })).toThrow(/maxRetries/);
    }
    expect(() => createThrottle({ rps: 1, concurrency: 1, maxRetries: 0 })).not.toThrow();
  });
});
