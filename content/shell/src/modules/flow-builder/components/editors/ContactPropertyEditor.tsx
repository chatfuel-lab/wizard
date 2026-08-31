import { Field } from '~ui';
import {
  SetContactPropertyAttributeDocument,
  SetContactPropertyValueDocument,
} from '~api/generated/flow-builder/graphql';
import { useAttributeSuggestions } from '../../hooks/useAttributeSuggestions';
import type { BlockT, ElementOf } from '../../types';
import { AttributeInput } from '../AttributeInput';
import { useBlockMutation } from './useBlockMutation';

export interface ContactPropertyEditorProps {
  element: ElementOf<'SetContactPropertyBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/** Attribute (with autocomplete) + value. Errors clear as the server revalidates. */
export function ContactPropertyEditor({ element, onBlock }: ContactPropertyEditorProps) {
  const { run } = useBlockMutation(onBlock);
  const suggestions = useAttributeSuggestions(element.platform);

  return (
    <div className="space-y-3">
      <AttributeInput
        label="Attribute"
        value={element.attribute?.name ?? ''}
        suggestions={suggestions}
        placeholder="attribute name"
        validate={(name) => (name.trim() ? null : 'Attribute name is required')}
        onSave={(name) =>
          run(
            SetContactPropertyAttributeDocument,
            { elementID: element.id, name: name.trim() },
            (d) => d.setContactPropertySetAttribute,
          )
        }
      />
      <Field
        label="Value"
        value={element.value}
        placeholder="value to store"
        onSave={(value) =>
          run(SetContactPropertyValueDocument, { elementID: element.id, value }, (d) => d.setContactPropertySetValue)
        }
      />
    </div>
  );
}
