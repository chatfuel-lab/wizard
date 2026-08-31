import { Field, Switch } from '~ui';
import {
  SetWhatsAppTextDocument,
  SetWhatsAppTextSaveReplyDocument,
  SetWhatsAppTextWaitForRepliesDocument,
} from '~api/generated/flow-builder/graphql';
import { useAttributeSuggestions } from '../../hooks/useAttributeSuggestions';
import { templateStrToString } from '../../lib/templateStr';
import type { BlockT, ElementOf } from '../../types';
import { AttributeInput } from '../AttributeInput';
import { useBlockMutation } from './useBlockMutation';

export interface WhatsAppTextEditorProps {
  element: ElementOf<'WhatsAppTextBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/** Text (TemplateStr round-trip), wait-for-replies toggle, save-reply attribute. */
export function WhatsAppTextEditor({ element, onBlock }: WhatsAppTextEditorProps) {
  const { run } = useBlockMutation(onBlock);
  const suggestions = useAttributeSuggestions(element.platform);
  const savedAttribute = element.savingToAttribute?.name ?? '';

  return (
    <div className="space-y-3">
      <Field
        label="Message"
        multiline
        value={templateStrToString(element.text)}
        placeholder="Use {{attribute name}} to personalize"
        onSave={(text) => run(SetWhatsAppTextDocument, { elementID: element.id, text }, (d) => d.whatsAppTextSetText)}
      />
      <Switch
        checked={element.waitForReplies}
        label="Wait for a reply before continuing"
        onChange={(waitForReplies) =>
          run(
            SetWhatsAppTextWaitForRepliesDocument,
            { elementID: element.id, waitForReplies },
            (d) => d.whatsAppTextSetWaitForReplies,
          )
        }
      />
      <Switch
        checked={element.saveContactReply}
        label="Save the reply to an attribute"
        onChange={(saveContactReply) =>
          run(
            SetWhatsAppTextSaveReplyDocument,
            { elementID: element.id, saveContactReply, attribute: savedAttribute || null },
            (d) => d.whatsAppTextSetSaveContactReplyToAttribute,
          )
        }
      />
      {element.saveContactReply ? (
        <AttributeInput
          label="Save to attribute"
          value={savedAttribute}
          suggestions={suggestions}
          placeholder="attribute name"
          onSave={(name) =>
            run(
              SetWhatsAppTextSaveReplyDocument,
              { elementID: element.id, saveContactReply: true, attribute: name || null },
              (d) => d.whatsAppTextSetSaveContactReplyToAttribute,
            )
          }
        />
      ) : null}
    </div>
  );
}
