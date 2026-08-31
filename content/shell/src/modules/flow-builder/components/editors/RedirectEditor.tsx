import { useMemo } from 'react';
import { Button, Select, type SelectOption } from '~ui';
import { RemoveRedirectTargetFlowDocument, SetRedirectTargetFlowDocument } from '~api/generated/flow-builder/graphql';
import { useFlowsList } from '../../hooks/useFlowsList';
import { pickBlock } from '../../lib/pickBlock';
import type { BlockT, ElementOf } from '../../types';
import { useBlockMutation } from './useBlockMutation';

export interface RedirectEditorProps {
  element: ElementOf<'RedirectToFlowBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/** Target flow picker fed by FlowsList (all three buckets), with clear-target. */
export function RedirectEditor({ element, onBlock }: RedirectEditorProps) {
  const { runAction, actionError } = useBlockMutation(onBlock);
  const flows = useFlowsList();

  const options = useMemo<SelectOption[]>(() => {
    const result: SelectOption[] = [];
    for (const group of flows.groups) {
      for (const flow of group.flows) result.push({ value: flow.id, label: `${group.name} / ${flow.name}` });
    }
    for (const flow of flows.ungrouped) result.push({ value: flow.id, label: flow.name });
    for (const flow of flows.defaultReply) result.push({ value: flow.id, label: `${flow.name} (default reply)` });
    // Keep a dead target selectable-looking rather than blanking the select.
    if (element.flow && !result.some((option) => option.value === element.flow?.id)) {
      result.push({ value: element.flow.id, label: element.flow.name });
    }
    return result;
  }, [flows.groups, flows.ungrouped, flows.defaultReply, element.flow]);

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-text-muted">Target flow</span>
        <Select
          className="w-full"
          aria-label="Target flow"
          value={element.flow?.id ?? ''}
          placeholder={flows.loading ? 'Loading flows…' : 'Choose a flow…'}
          options={options}
          disabled={flows.loading}
          onChange={(flowId) =>
            void runAction(
              SetRedirectTargetFlowDocument,
              { elementID: element.id, targetFlowID: flowId },
              (d) => d.redirectToFlowSetTargetFlow,
            )
          }
        />
      </label>
      {element.flow ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void runAction(RemoveRedirectTargetFlowDocument, { elementID: element.id }, pickBlock)}
        >
          Clear target
        </Button>
      ) : null}
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
    </div>
  );
}
