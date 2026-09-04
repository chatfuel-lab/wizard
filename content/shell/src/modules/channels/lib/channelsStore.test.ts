import { describe, expect, it } from 'vitest';
import { emptyChannels } from './channels';
import { channelsReducer, initialChannelsState, type ChannelsAction, type ChannelsState } from './channelsStore';

const run = (actions: ChannelsAction[], from: ChannelsState = initialChannelsState()): ChannelsState =>
  actions.reduce(channelsReducer, from);

describe('channelsReducer', () => {
  it('drops a load answer from an earlier epoch', () => {
    const state = run([{ type: 'reset' }, { type: 'reset' }]);
    expect(state.epoch).toBe(2);
    const stale = channelsReducer(state, {
      type: 'scopesLoaded',
      epoch: 1,
      token: state.token,
      channels: emptyChannels(),
      at: 1,
    });
    expect(stale.scopes.state).toBe('loading');
    const fresh = channelsReducer(state, {
      type: 'scopesLoaded',
      epoch: 2,
      token: state.token,
      channels: emptyChannels(),
      at: 1,
    });
    expect(fresh.scopes.state).toBe('ready');
    expect(fresh.refreshing).toBe(false);
  });

  it('keeps data on screen through a refresh', () => {
    const ready = run([
      { type: 'reset' },
      { type: 'scopesLoaded', epoch: 1, token: 1, channels: emptyChannels(), at: 1 },
    ]);
    const refreshing = channelsReducer(ready, { type: 'reset' });
    expect(refreshing.scopes.state).toBe('ready');
    expect(refreshing.refreshing).toBe(true);
  });

  it('replaces the channels from a disconnect payload', () => {
    const state = run([
      { type: 'reset' },
      { type: 'scopesLoaded', epoch: 1, token: 1, channels: emptyChannels(), at: 1 },
    ]);
    const channels = { ...emptyChannels(), widget: { scopeId: 'w', label: 'Widget', detail: null } };
    const next = channelsReducer(state, { type: 'scopesReplaced', channels, at: 2 });
    expect(next.epoch).toBe(1);
    expect(next.scopes.state === 'ready' && next.scopes.channels.widget?.label).toBe('Widget');
  });

  it('does not let a read in flight undo a write that landed first', () => {
    // The read leaves under token 1; a disconnect answers while it is in the
    // air and moves the token; the read comes back with the channel it asked
    // about still connected, and must not put it back on screen.
    const reading = run([{ type: 'reset' }]);
    const connected = { ...emptyChannels(), whatsapp: { scopeId: 'wa', label: '+1 555 0100', detail: null } };
    const written = channelsReducer(reading, { type: 'scopesReplaced', channels: emptyChannels(), at: 2 });

    const late = channelsReducer(written, {
      type: 'scopesLoaded',
      epoch: written.epoch,
      token: reading.token,
      channels: connected,
      at: 3,
    });
    expect(late.scopes.state === 'ready' && late.scopes.channels.whatsapp).toBeNull();
    // The spinner that read started is still taken back.
    expect(late.refreshing).toBe(false);

    // A failure from the same overtaken read says nothing either.
    const failedLate = channelsReducer(written, {
      type: 'scopesFailed',
      epoch: written.epoch,
      token: reading.token,
      message: 'boom',
    });
    expect(failedLate.scopes.state).toBe('ready');
    expect(failedLate.refreshing).toBe(false);
  });

  it('tracks writes in flight by key', () => {
    const busy = run([
      { type: 'opStarted', key: 'connect:whatsapp' },
      { type: 'opStarted', key: 'connect:whatsapp' },
    ]);
    expect(busy.pending).toEqual(['connect:whatsapp']);
    expect(channelsReducer(busy, { type: 'opFinished', key: 'connect:whatsapp' }).pending).toEqual([]);
  });
});
