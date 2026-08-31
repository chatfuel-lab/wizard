import { useState } from 'react';
import { Select } from '~ui';
import { findNewElementId, pickCreatedBlock, pluginsForBlock } from '../lib/plugins';
import type { BlockT } from '../types';
import { useBlockMutation } from './editors/useBlockMutation';
import { useSelection } from './selectionContext';

export interface AddElementMenuProps {
  block: BlockT;
  /** applyBlock: Add*ToBlock returns the enclosing block — authoritative. */
  onBlock: (block: BlockT) => void;
}

/**
 * "Add element": a placeholder Select (the module's zero-dependency menu
 * idiom) over the plugin families this block's platform can stack. Picking
 * one fires Add<Family>ToBlock, reconciles via applyBlock and jumps the
 * inspector to the fresh element — which usually STARTS with validation
 * errors (empty text, no attribute). That is state, not a failure; the
 * editor + error list open right on it. Transport failures surface inline.
 */
export function AddElementMenu({ block, onBlock }: AddElementMenuProps) {
  const { select } = useSelection();
  const { runAction, actionError } = useBlockMutation(onBlock);
  const [pending, setPending] = useState(false);
  const plugins = pluginsForBlock(block);
  if (plugins.length === 0) return null;

  const add = async (key: string) => {
    const plugin = plugins.find((p) => p.key === key);
    if (!plugin || pending) return;
    setPending(true);
    let createdId: string | null = null;
    try {
      await runAction(plugin.document, { blockID: block.id }, (data) => {
        const next = pickCreatedBlock(data);
        // `block` is the pre-mutation snapshot — the new element is the id
        // the block did not carry before.
        if (next) createdId = findNewElementId(block, next);
        return next;
      });
    } finally {
      setPending(false);
    }
    if (createdId) select({ blockId: block.id, elementId: createdId });
  };

  return (
    <div className="space-y-1.5">
      <Select
        value=""
        placeholder={pending ? 'Adding element…' : '+ Add element'}
        aria-label="Add element"
        disabled={pending}
        options={plugins.map((p) => ({ value: p.key, label: p.label }))}
        onChange={(key) => void add(key)}
        className="w-full"
      />
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
    </div>
  );
}
