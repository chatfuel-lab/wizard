import { SetClearContactPropertyAttributeDocument } from '~api/generated/flow-builder/graphql';
import { useAttributeSuggestions } from '../../hooks/useAttributeSuggestions';
import { pickBlock } from '../../lib/pickBlock';
import type { BlockT, ElementOf } from '../../types';
import { AttributeInput } from '../AttributeInput';
import { useBlockMutation } from './useBlockMutation';

export interface ClearContactPropertyEditorProps {
  element: ElementOf<'ClearContactPropertyBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/** The attribute to clear (autocomplete) — the family's only setter. */
export function ClearContactPropertyEditor({ element, onBlock }: ClearContactPropertyEditorProps) {
  const { run } = useBlockMutation(onBlock);
  const suggestions = useAttributeSuggestions(element.platform);

  return (
    <AttributeInput
      label="Attribute to clear"
      value={element.attribute?.name ?? ''}
      suggestions={suggestions}
      placeholder="attribute name"
      validate={(name) => (name.trim() ? null : 'Attribute name is required')}
      onSave={(name) =>
        run(SetClearContactPropertyAttributeDocument, { elementID: element.id, name: name.trim() }, pickBlock)
      }
    />
  );
}
