/**
 * Mount/unmount state machine for anything that animates out.
 *
 * React removes a node the moment `open` flips false, which is why the old
 * Overlay could never have an exit animation. This reducer keeps the node
 * mounted through an 'exiting' phase so CSS has something to animate, and the
 * DOM shell (hooks/usePresence.ts) decides when 'exited' fires.
 */

export type PresenceState = 'unmounted' | 'entering' | 'entered' | 'exiting';

export type PresenceEvent = { type: 'open' } | { type: 'close' } | { type: 'entered' } | { type: 'exited' };

export function presenceReducer(state: PresenceState, event: PresenceEvent): PresenceState {
  switch (event.type) {
    case 'open':
      /* Reopening mid-exit must go straight back to 'entering' — the node is
       * still mounted, so waiting for the exit to finish would strand it. */
      return state === 'entered' ? 'entered' : 'entering';

    case 'close':
      /* Closing before the enter finished still needs an exit animation, so
       * 'entering' -> 'exiting' is legal. Closing something already unmounted
       * is a no-op rather than a spurious exit. */
      return state === 'unmounted' ? 'unmounted' : 'exiting';

    case 'entered':
      /* Ignore a late 'entered' that lands after a close already started. */
      return state === 'entering' ? 'entered' : state;

    case 'exited':
      return state === 'exiting' ? 'unmounted' : state;

    default:
      return state;
  }
}

export function isMounted(state: PresenceState): boolean {
  return state !== 'unmounted';
}
