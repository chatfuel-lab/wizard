import { describe, expect, it } from 'vitest';
import { isMounted, presenceReducer, type PresenceEvent, type PresenceState } from './presence';

function run(from: PresenceState, ...events: PresenceEvent['type'][]): PresenceState {
  return events.reduce<PresenceState>((state, type) => presenceReducer(state, { type }), from);
}

describe('presenceReducer — happy path', () => {
  it('opens, settles, closes, unmounts', () => {
    expect(run('unmounted', 'open')).toBe('entering');
    expect(run('unmounted', 'open', 'entered')).toBe('entered');
    expect(run('unmounted', 'open', 'entered', 'close')).toBe('exiting');
    expect(run('unmounted', 'open', 'entered', 'close', 'exited')).toBe('unmounted');
  });
});

describe('presenceReducer — interruptions', () => {
  it('closing during the enter still animates out', () => {
    expect(run('entering', 'close')).toBe('exiting');
  });

  it('reopening during the exit goes back to entering, not entered', () => {
    expect(run('exiting', 'open')).toBe('entering');
  });

  it('reopening something already entered is a no-op', () => {
    expect(run('entered', 'open')).toBe('entered');
  });
});

describe('presenceReducer — stale events', () => {
  it('ignores an entered that lands after the close', () => {
    expect(run('entering', 'close', 'entered')).toBe('exiting');
  });

  it('ignores an exited that lands after a reopen', () => {
    expect(run('exiting', 'open', 'exited')).toBe('entering');
  });

  it('ignores a close on an unmounted node', () => {
    expect(run('unmounted', 'close')).toBe('unmounted');
  });

  it('ignores an exited while entered', () => {
    expect(run('entered', 'exited')).toBe('entered');
  });
});

describe('isMounted', () => {
  it('keeps the node alive for every state but unmounted', () => {
    expect(isMounted('unmounted')).toBe(false);
    expect(isMounted('entering')).toBe(true);
    expect(isMounted('entered')).toBe(true);
    expect(isMounted('exiting')).toBe(true);
  });
});
