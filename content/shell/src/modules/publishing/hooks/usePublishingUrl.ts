import { useCallback, useMemo } from 'react';
import { parseAddress, viewSegment, writeAddress, type PublishingAddress } from '../lib/publishingParams';

export interface PublishingUrlArgs {
  /** The view segment of the address ('' at the module's root). */
  view: string;
  /** The shell's writer: view segment and params in one move. */
  setView: (view: string, params?: URLSearchParams, options?: { replace?: boolean }) => void;
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
}

export interface PublishingUrlApi {
  address: PublishingAddress;
  /** Merge into the address. A view change pushes, anything else replaces. */
  patch: (next: Partial<PublishingAddress>) => void;
  /** Open the composer. `at` seeds a new post's time from the slot that was clicked. */
  onCompose: (target: string, at?: string | null) => void;
  closeCompose: () => void;
}

/**
 * The address bar as one seam: everything the module knows about where it is
 * comes out of `address`, and every write goes back through one of the three
 * writers here. `patch` is the general one and can change the path segment;
 * the composer's two ride on `setParams`, because opening and closing a dialog
 * never moves between views.
 */
export function usePublishingUrl({ view, setView, params, setParams }: PublishingUrlArgs): PublishingUrlApi {
  // Keyed on the string, not the object: `params` is a fresh URLSearchParams on
  // every shell render, and re-parsing would hand every view a new filter.
  const query = params.toString();
  const address = useMemo(() => parseAddress(view, new URLSearchParams(query)), [query, view]);

  /**
   * A view change is a place and pushes; anything else replaces, so Back is not
   * a list of keystrokes.
   */
  const patch = useCallback(
    (next: Partial<PublishingAddress>) => {
      const merged = { ...address, ...next };
      setView(viewSegment(merged.view), writeAddress(params, merged), {
        replace: merged.view === address.view,
      });
    },
    [address, params, setView],
  );

  const onCompose = useCallback(
    (target: string, at?: string | null) => {
      const next = new URLSearchParams(params);
      next.set('compose', target);
      if (at) next.set('at', at);
      else next.delete('at');
      setParams(next);
    },
    [params, setParams],
  );

  /**
   * Closing the composer takes its seeds with it. `at` and `from` only ever mean
   * "the slot this was opened from" and "the media it was started from"; left in
   * the address, they would seed the next post from a slot nobody clicked and a
   * tile nobody picked.
   */
  const closeCompose = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('compose');
    next.delete('at');
    next.delete('from');
    setParams(next);
  }, [params, setParams]);

  return { address, patch, onCompose, closeCompose };
}
