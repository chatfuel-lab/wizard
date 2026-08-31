import { useState } from 'react';
import { errorMessageFor } from '~api';
import { findNewBlockId, pickCreatedFlow } from '../lib/blockPlugins';
import type { FlowT } from '../types';
import { useSelection } from '../components/selectionContext';
import { useErrorFlash } from './useErrorFlash';

export interface CreateBlockApi {
  pending: boolean;
  actionError: string | null;
  /**
   * Run a Create*Block mutation and land on the result: diff the new block id
   * out of the slim response (`flow` is the pre-mutation snapshot), await a
   * full FlowStructure refetch (slim responses carry no elements/connections,
   * and the store refuses a selection pointing at a block it does not hold
   * yet), then select the fresh block. Transport failures flash into
   * actionError.
   */
  create: (mutate: () => Promise<Record<string, unknown>>) => Promise<void>;
}

/**
 * The create → slim-diff → refetch → select recipe shared by the block
 * palette and the drag-to-empty-canvas create-and-connect picker.
 */
export function useCreateBlock(flow: FlowT, refetch: () => Promise<void>): CreateBlockApi {
  const { select } = useSelection();
  const [pending, setPending] = useState(false);
  const { error: actionError, flash, clear } = useErrorFlash();

  const create = async (mutate: () => Promise<Record<string, unknown>>) => {
    if (pending) return;
    setPending(true);
    clear();
    try {
      const created = pickCreatedFlow(await mutate());
      if (!created) return; // a response the picker cannot read is not a flow
      const createdId = findNewBlockId(flow, created);
      await refetch();
      if (createdId) select({ blockId: createdId, elementId: null });
    } catch (err) {
      flash(errorMessageFor(err, {}));
    } finally {
      setPending(false);
    }
  };

  return { pending, actionError, create };
}
