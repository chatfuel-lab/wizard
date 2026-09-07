import { useCallback, useMemo } from 'react';
import type { ModuleAppProps } from '../../types';
import {
  parseAddress,
  viewSegment,
  writeAddress,
  type BroadcastsAddress,
  type ComposerStep,
} from '../lib/broadcastsParams';

export interface BroadcastsUrl {
  address: BroadcastsAddress;
  /** Rewrite part of the address. A view change is a place and pushes; anything else replaces. */
  patch(next: Partial<BroadcastsAddress>): void;
  /** Open the composer on a draft. */
  compose(flowId: string, step?: ComposerStep | null): void;
  /** Leave the composer for the list, with the campaign's panel open. */
  closeComposer(flowId: string | null): void;
}

type Props = Pick<ModuleAppProps, 'view' | 'setView' | 'params' | 'setParams'>;

/** The address as the module reads and writes it — the only place `setView`/`setParams` are called. */
export function useBroadcastsUrl({ view, setView, params, setParams }: Props): BroadcastsUrl {
  const address = useMemo(() => parseAddress(view, params), [view, params]);

  const patch = useCallback(
    (next: Partial<BroadcastsAddress>) => {
      const merged = { ...address, ...next };
      const written = writeAddress(params, merged);
      if (merged.view !== address.view) setView(viewSegment(merged.view), written);
      else setParams(written);
    },
    [address, params, setView, setParams],
  );

  const compose = useCallback(
    (flowId: string, step: ComposerStep | null = null) =>
      patch({ view: 'compose', campaign: flowId, step, template: null }),
    [patch],
  );

  const closeComposer = useCallback(
    (flowId: string | null) => patch({ view: 'campaigns', campaign: flowId, step: null }),
    [patch],
  );

  return useMemo(() => ({ address, patch, compose, closeComposer }), [address, patch, compose, closeComposer]);
}
