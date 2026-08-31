import { describe, expect, it } from 'vitest';
import { initialUnseenState, unseenReducer, type UnseenState } from './unseenStore';

describe('the unseen badge', () => {
  it('refetches on reconnect, and a live push beats a stale response', () => {
    // The badge's own version of the list's defect: with no epoch, the response
    // to a pre-reconnect query lands after the live channel has pushed the
    // true count and quietly puts the old number back.
    const counted = unseenReducer(initialUnseenState, { type: 'counted', epoch: 0, count: 7 });
    expect(counted.count).toBe(7);
    const reconnected = unseenReducer(counted, { type: 'refetch' });
    const pushed = unseenReducer(reconnected, { type: 'pushed', count: 2 });
    expect(pushed.count).toBe(2);
    const stale: UnseenState = unseenReducer(pushed, {
      type: 'counted',
      epoch: reconnected.epoch,
      count: 7,
    });
    expect(stale.count).toBe(2);
  });

  it('a live push is not a request — it must not re-key the query effect', () => {
    // The epoch is what the query effect depends on. If a push bumped it, every
    // counter tick the server sent would cost a round trip that answers with
    // the number just pushed.
    const pushed = unseenReducer(initialUnseenState, { type: 'pushed', count: 4 });
    expect(pushed.epoch).toBe(initialUnseenState.epoch);
    expect(unseenReducer(pushed, { type: 'refetch' }).epoch).toBe(1);
  });

  it('accepts the response to the request that is actually out', () => {
    const requested = unseenReducer(initialUnseenState, { type: 'refetch' });
    expect(unseenReducer(requested, { type: 'counted', epoch: requested.epoch, count: 3 }).count).toBe(3);
    expect(unseenReducer(requested, { type: 'counted', epoch: 0, count: 9 }).count).toBe(0);
  });
});
