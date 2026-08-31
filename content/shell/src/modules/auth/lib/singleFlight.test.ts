import { describe, expect, it } from 'vitest';
import { createSingleFlight } from './singleFlight';

/** A task whose settlement this test decides. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createSingleFlight', () => {
  it('runs one task for overlapping callers and hands both the same answer', async () => {
    const flight = createSingleFlight<string>();
    const gate = deferred<string>();
    let runs = 0;
    const task = () => {
      runs += 1;
      return gate.promise;
    };

    const first = flight.run('u1', task);
    const second = flight.run('u1', task);
    expect(runs).toBe(1);
    expect(flight.pending('u1')).toBe(true);

    gate.resolve('workspace');
    expect(await first).toBe('workspace');
    expect(await second).toBe('workspace');
    expect(runs).toBe(1);
  });

  it('keeps different keys apart — one account never gets another’s answer', async () => {
    const flight = createSingleFlight<string>();
    let runs = 0;
    const results = await Promise.all([
      flight.run('u1', () => {
        runs += 1;
        return Promise.resolve('one');
      }),
      flight.run('u2', () => {
        runs += 1;
        return Promise.resolve('two');
      }),
    ]);
    expect(results).toEqual(['one', 'two']);
    expect(runs).toBe(2);
  });

  it('is not a cache: a settled run is never replayed', async () => {
    const flight = createSingleFlight<number>();
    let runs = 0;
    const task = () => Promise.resolve((runs += 1));

    expect(await flight.run('u1', task)).toBe(1);
    expect(flight.pending('u1')).toBe(false);
    // A bot deleted between the two calls has to be provisionable again.
    expect(await flight.run('u1', task)).toBe(2);
  });

  it('gives every joined caller the failure, and lets the next one try again', async () => {
    const flight = createSingleFlight<string>();
    const gate = deferred<string>();
    let runs = 0;
    const failing = () => {
      runs += 1;
      return gate.promise;
    };

    const first = flight.run('u1', failing);
    const second = flight.run('u1', failing);
    const boom = new Error('workspace is full');
    gate.reject(boom);

    await expect(first).rejects.toBe(boom);
    await expect(second).rejects.toBe(boom);
    expect(runs).toBe(1);
    expect(flight.pending('u1')).toBe(false);

    expect(await flight.run('u1', () => Promise.resolve('ok'))).toBe('ok');
  });
});
