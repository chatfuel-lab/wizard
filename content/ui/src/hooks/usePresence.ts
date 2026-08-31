import { useEffect, useReducer, useRef } from 'react';
import { isMounted, presenceReducer, type PresenceState } from '../lib/interaction/presence';
import { prefersReducedMotion } from '../lib/interaction/motion';

export interface UsePresenceOptions {
  /**
   * Hard ceiling on the exit phase.
   *
   * The animation events are the primary signal, but they are genuinely
   * unreliable: they never fire if the node is display:none'd, if reduced
   * motion collapsed the animation to nothing, or if a parent re-render swaps
   * the element mid-flight. Without a timer the node would stay mounted
   * forever. Belt and braces, deliberately.
   */
  fallbackMs?: number;
}

export interface UsePresenceResult {
  /** Render nothing when false. */
  mounted: boolean;
  /** Put this on the animated element as `data-state`. */
  state: PresenceState;
}

const DEFAULT_FALLBACK_MS = 400;

/**
 * Keeps a node mounted through its exit animation.
 *
 * Usage: give the returned `state` to the animated element as a data attribute
 * and let the tokens do the rest —
 *   data-[state=entering]:animate-scale-in data-[state=exiting]:animate-scale-out
 */
export function usePresence(
  open: boolean,
  nodeRef: { current: HTMLElement | null },
  options?: UsePresenceOptions,
): UsePresenceResult {
  const fallbackMs = options?.fallbackMs ?? DEFAULT_FALLBACK_MS;
  const [state, dispatch] = useReducer(presenceReducer, open ? 'entered' : 'unmounted');
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    dispatch({ type: open ? 'open' : 'close' });
  }, [open]);

  /* entering -> entered on the next frame, so the browser has painted the
   * start of the animation before we swap the data attribute. */
  useEffect(() => {
    if (state !== 'entering') return;
    if (prefersReducedMotion()) {
      dispatch({ type: 'entered' });
      return;
    }
    const frame = requestAnimationFrame(() => dispatch({ type: 'entered' }));
    return () => cancelAnimationFrame(frame);
  }, [state]);

  useEffect(() => {
    if (state !== 'exiting') return;
    if (prefersReducedMotion()) {
      dispatch({ type: 'exited' });
      return;
    }

    const node = nodeRef.current;
    const finish = (event?: Event) => {
      /* Ignore animations bubbling up from children — a menu item's own
       * transition must not unmount the whole menu. */
      if (event && event.target !== node) return;
      dispatch({ type: 'exited' });
    };

    const timer = window.setTimeout(finish, fallbackMs);
    node?.addEventListener('animationend', finish);
    node?.addEventListener('transitionend', finish);
    return () => {
      window.clearTimeout(timer);
      node?.removeEventListener('animationend', finish);
      node?.removeEventListener('transitionend', finish);
    };
  }, [state, fallbackMs, nodeRef]);

  return { mounted: isMounted(state), state };
}
