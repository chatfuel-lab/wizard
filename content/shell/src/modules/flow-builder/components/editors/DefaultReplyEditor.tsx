import { Select, type SelectOption } from '~ui';
import { DefaultReplyFrequency, SetDefaultReplyFrequencyDocument } from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import type { BlockT, ElementOf } from '../../types';
import { useBlockMutation } from './useBlockMutation';

export interface DefaultReplyEditorProps {
  element: ElementOf<'DefaultReplyBlockElement'>;
  onBlock: (block: BlockT) => void;
}

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: DefaultReplyFrequency.Always, label: 'Every unrecognized message' },
  { value: DefaultReplyFrequency.OnceIn24Hours, label: 'At most once in 24 hours' },
];

/** The default reply's one knob: how often it fires. */
export function DefaultReplyEditor({ element, onBlock }: DefaultReplyEditorProps) {
  const { runAction, actionError } = useBlockMutation(onBlock);

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-text-muted">Reply frequency</span>
        <Select
          className="w-full"
          aria-label="Reply frequency"
          value={element.replyFrequency}
          options={FREQUENCY_OPTIONS}
          onChange={(frequency) =>
            void runAction(
              SetDefaultReplyFrequencyDocument,
              { elementID: element.id, frequency: frequency as DefaultReplyFrequency },
              pickBlock,
            )
          }
        />
      </label>
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
    </div>
  );
}
