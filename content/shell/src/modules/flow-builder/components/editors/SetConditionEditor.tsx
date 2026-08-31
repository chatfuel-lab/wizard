import { useMemo } from 'react';
import { SetConditionSegmentDocument } from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import { segmentErrorFilterIds } from '../../lib/segmentInput';
import type { BlockT, ElementOf } from '../../types';
import { SegmentEditor } from './shared/SegmentEditor';
import { useBlockMutation } from './useBlockMutation';

export interface SetConditionEditorProps {
  element: ElementOf<'SetConditionBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/** The condition's segment — rows the contact must match to take the branch. */
export function SetConditionEditor({ element, onBlock }: SetConditionEditorProps) {
  const { run } = useBlockMutation(onBlock);
  const errorFilterIds = useMemo(() => segmentErrorFilterIds(element.segmentErrors), [element.segmentErrors]);

  return (
    <SegmentEditor
      segment={element.segment}
      platform={element.platform}
      errorFilterIds={errorFilterIds}
      onSave={(request) => run(SetConditionSegmentDocument, { elementID: element.id, request }, pickBlock)}
    />
  );
}
