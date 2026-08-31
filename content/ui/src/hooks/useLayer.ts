import { useCallback, useEffect, useId } from 'react';
import { isBottomLayer, isTopLayer, popLayer, pushLayer } from '../lib/interaction/layers';

export interface UseLayerResult {
  id: string;
  /** Only the top layer should react to Escape. */
  isTop: () => boolean;
  /** Only the bottom layer should own the background (inert, scroll lock). */
  isBottom: () => boolean;
}

/**
 * Registers an open dismissible surface in the global layer stack.
 *
 * The predicates are functions, not values, on purpose: they are read inside
 * event handlers at the moment the key is pressed, so they must reflect the
 * stack as it is then — not as it was on the render that installed the handler.
 */
export function useLayer(open: boolean): UseLayerResult {
  const id = useId();

  useEffect(() => {
    if (!open) return;
    pushLayer(id);
    return () => popLayer(id);
  }, [open, id]);

  /* Stable per id, so a hook that lists them as a dependency — `useDismiss`
     does — is not torn down and re-subscribed on every render of the surface,
     which would reorder its document listeners under the other open layers. */
  const isTop = useCallback(() => isTopLayer(id), [id]);
  const isBottom = useCallback(() => isBottomLayer(id), [id]);
  return { id, isTop, isBottom };
}
