import { describe, expect, it } from 'vitest';
import { PREFETCH_MAX_ENTRIES, PREFETCH_TTL_MS, createPrefetchCache } from './flowPrefetch';

/** A promise whose fate the test decides. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let every settled promise's `.then` run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('flowPrefetch', () => {
  it('issues one request per key however many times it is hovered', async () => {
    const cache = createPrefetchCache<string>();
    let loads = 0;
    const load = () => {
      loads += 1;
      return Promise.resolve('flow');
    };
    const first = cache.prefetch('a', load);
    const second = cache.prefetch('a', load);
    cache.prefetch('a', load);
    expect(loads).toBe(1);
    expect(second).toBe(first);
    expect(cache.size).toBe(1);
    await flush();
    // Settled and inside the TTL: still one request.
    cache.prefetch('a', load);
    expect(loads).toBe(1);
  });

  it('hands the in-flight request to the click, once', async () => {
    const cache = createPrefetchCache<string>();
    const pending = deferred<string>();
    const promise = cache.prefetch('a', () => pending.promise);
    expect(cache.has('a')).toBe(true);
    expect(cache.take('a')).toBe(promise);
    // One-shot: the editor owns it now.
    expect(cache.take('a')).toBeNull();
    expect(cache.has('a')).toBe(false);
    pending.resolve('flow');
    await expect(promise).resolves.toBe('flow');
  });

  it('never hands the click a request that failed', async () => {
    const cache = createPrefetchCache<string>();
    const pending = deferred<string>();
    cache.prefetch('a', () => pending.promise);
    pending.reject(new Error('blip'));
    await flush();
    expect(cache.has('a')).toBe(false);
    expect(cache.take('a')).toBeNull();
    // And the next hover issues a fresh one.
    let loads = 0;
    cache.prefetch('a', () => {
      loads += 1;
      return Promise.resolve('flow');
    });
    expect(loads).toBe(1);
  });

  it('a failure that lands after a take does not evict a newer request under the same key', async () => {
    const cache = createPrefetchCache<string>();
    const first = deferred<string>();
    cache.prefetch('a', () => first.promise);
    cache.take('a');
    const second = cache.prefetch('a', () => Promise.resolve('fresh'));
    first.reject(new Error('late'));
    await flush();
    expect(cache.take('a')).toBe(second);
  });

  it('a settled result is takeable inside the TTL and not after it', async () => {
    let clock = 1_000;
    const cache = createPrefetchCache<string>({ now: () => clock, ttlMs: 100 });
    cache.prefetch('a', () => Promise.resolve('flow'));
    await flush(); // settledAt = 1_000
    clock = 1_100;
    expect(cache.has('a')).toBe(true);
    clock = 1_101;
    expect(cache.has('a')).toBe(false);
    expect(cache.take('a')).toBeNull();
    expect(cache.size).toBe(0);
  });

  it('an in-flight request is takeable however old it is', () => {
    let clock = 0;
    const cache = createPrefetchCache<string>({ now: () => clock, ttlMs: 10 });
    const pending = deferred<string>();
    const promise = cache.prefetch('a', () => pending.promise);
    clock = 10_000;
    expect(cache.take('a')).toBe(promise);
  });

  it('bounds memory by dropping the oldest', () => {
    const cache = createPrefetchCache<string>({ maxEntries: 2 });
    const load = () => new Promise<string>(() => undefined);
    cache.prefetch('a', load);
    cache.prefetch('b', load);
    cache.prefetch('c', load);
    expect(cache.size).toBe(2);
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
    // A cache of one still holds the request just made.
    const one = createPrefetchCache<string>({ maxEntries: 1 });
    const promise = one.prefetch('x', load);
    expect(one.take('x')).toBe(promise);
  });

  it('ships with a TTL that covers a hesitation and a bound that is not a leak', () => {
    expect(PREFETCH_TTL_MS).toBeGreaterThanOrEqual(10_000);
    expect(PREFETCH_TTL_MS).toBeLessThanOrEqual(60_000);
    expect(PREFETCH_MAX_ENTRIES).toBeLessThanOrEqual(16);
  });
});
