import { describe, expect, it } from 'vitest';
import { createScreenSink } from './screenContext';

describe('createScreenSink', () => {
  it('merges every live entry, later mounts winning a key clash', () => {
    const sink = createScreenSink();
    sink.publish('workspace', { view: 'board', rows: 10 });
    sink.publish('view', { rows: 34, selected: 'Anna Weber' });
    expect(sink.read()).toEqual({ view: 'board', rows: 34, selected: 'Anna Weber' });
  });

  it('drops an entry on null, which is what unmount publishes', () => {
    const sink = createScreenSink();
    sink.publish('a', { x: 1 });
    sink.publish('b', { y: 2 });
    sink.publish('a', null);
    expect(sink.read()).toEqual({ y: 2 });
    expect(sink.size()).toBe(1);
  });

  it('keeps nested values intact — the API round-trips them verbatim', () => {
    const sink = createScreenSink();
    sink.publish('v', { filter: { stage: ['New', 'Sorting'], amount: null }, count: 3, live: true });
    expect(sink.read()).toEqual({
      filter: { stage: ['New', 'Sorting'], amount: null },
      count: 3,
      live: true,
    });
  });

  it('reads empty before anything is published', () => {
    expect(createScreenSink().read()).toEqual({});
  });
});
