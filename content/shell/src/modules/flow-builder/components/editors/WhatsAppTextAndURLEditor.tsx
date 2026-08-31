import { Field } from '~ui';
import {
  SetWhatsAppTextAndUrlBodyTextDocument,
  SetWhatsAppTextAndUrlButtonTitleDocument,
  SetWhatsAppTextAndUrlButtonUrlDocument,
  SetWhatsAppTextAndUrlFooterTextDocument,
  SetWhatsAppTextAndUrlHeaderTextDocument,
  SetWhatsAppTextAndUrlSaveReplyDocument,
  SetWhatsAppTextAndUrlWaitForRepliesDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import { templateStrToString } from '../../lib/templateStr';
import type { BlockT, ElementOf } from '../../types';
import { ReplySettings } from './shared/ReplySettings';
import { useBlockMutation } from './useBlockMutation';

export interface WhatsAppTextAndURLEditorProps {
  element: ElementOf<'WhatsAppTextAndURLBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/**
 * Header/body/footer + the FIXED URL button (title + url editable; the
 * button set itself cannot change — this family has no add/delete button
 * mutations, guide.md) + reply settings.
 */
export function WhatsAppTextAndURLEditor({ element, onBlock }: WhatsAppTextAndURLEditorProps) {
  const { run } = useBlockMutation(onBlock);

  return (
    <div className="space-y-3">
      <Field
        label="Header"
        value={templateStrToString(element.headerText)}
        onSave={(text) => run(SetWhatsAppTextAndUrlHeaderTextDocument, { elementID: element.id, text }, pickBlock)}
      />
      <Field
        label="Body"
        multiline
        value={templateStrToString(element.bodyText)}
        placeholder="Use {{attribute name}} to personalize"
        onSave={(text) => run(SetWhatsAppTextAndUrlBodyTextDocument, { elementID: element.id, text }, pickBlock)}
      />
      <Field
        label="Footer"
        value={templateStrToString(element.footerText)}
        onSave={(text) => run(SetWhatsAppTextAndUrlFooterTextDocument, { elementID: element.id, text }, pickBlock)}
      />
      {element.buttons.map((button, index) => (
        <div key={button.id} className="space-y-2 rounded-lg border border-border p-2.5">
          <Field
            label={`Button ${index + 1} title`}
            value={templateStrToString(button.title)}
            onSave={(title) =>
              run(
                SetWhatsAppTextAndUrlButtonTitleDocument,
                { elementID: element.id, buttonID: button.id, title },
                pickBlock,
              )
            }
          />
          {button.__typename === 'WhatsAppOpenURLButton' ? (
            <Field
              label="URL"
              value={templateStrToString(button.url)}
              placeholder="https://…"
              onSave={(url) =>
                run(
                  SetWhatsAppTextAndUrlButtonUrlDocument,
                  { elementID: element.id, buttonID: button.id, url },
                  pickBlock,
                )
              }
            />
          ) : null}
        </div>
      ))}
      <ReplySettings
        element={element}
        waitDocument={SetWhatsAppTextAndUrlWaitForRepliesDocument}
        saveDocument={SetWhatsAppTextAndUrlSaveReplyDocument}
        onBlock={onBlock}
      />
    </div>
  );
}
