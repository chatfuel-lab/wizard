import { useCallback } from 'react';
import { errorMessageFor, type TypedDoc } from '~api';
import { useFlowBuilder } from '../../FlowBuilderContext';
import { useErrorFlash } from '../../hooks/useErrorFlash';
import type { BlockT } from '../../types';

export interface BlockMutationApi {
  /**
   * Run an element setter and reconcile: setters return the enclosing block
   * (BlockParts, errors recomputed) → applyBlock upstream. Throws on failure —
   * for ~ui Field/Switch flows that surface errors inline themselves.
   */
  run<TData, TVars>(
    doc: TypedDoc<TData, TVars>,
    variables: TVars,
    pick: (data: TData) => BlockT | undefined,
  ): Promise<void>;
  /** Like run, but for bare button clicks: catches into `actionError`. */
  runAction<TData, TVars>(
    doc: TypedDoc<TData, TVars>,
    variables: TVars,
    pick: (data: TData) => BlockT | undefined,
  ): Promise<void>;
  actionError: string | null;
}

/** The one mutation path every element editor shares: mutate → pick block → applyBlock. */
export function useBlockMutation(onBlock: (block: BlockT) => void): BlockMutationApi {
  const { client } = useFlowBuilder();
  const { error: actionError, flash, clear } = useErrorFlash();

  const run = useCallback(
    async <TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars, pick: (data: TData) => BlockT | undefined) => {
      const data = await client.mutate(doc, variables);
      const block = pick(data);
      if (block) onBlock(block); // a response the picker cannot read is not a block
    },
    [client, onBlock],
  );

  const runAction = useCallback(
    async <TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars, pick: (data: TData) => BlockT | undefined) => {
      clear();
      try {
        await run(doc, variables, pick);
      } catch (err) {
        flash(errorMessageFor(err, {}));
      }
    },
    [clear, flash, run],
  );

  return { run, runAction, actionError };
}
