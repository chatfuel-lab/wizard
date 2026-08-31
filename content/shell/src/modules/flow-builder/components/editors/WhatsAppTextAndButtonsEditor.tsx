import { Button, Field, IconPlus, IconTrash, Tag } from '~ui';
import {
  AddWhatsAppContinueFlowButtonDocument,
  DeleteWhatsAppButtonDocument,
  MoveWhatsAppButtonsDocument,
  SetWhatsAppButtonTitleDocument,
  SetWhatsAppTextAndButtonsBodyTextDocument,
  SetWhatsAppTextAndButtonsFooterTextDocument,
  SetWhatsAppTextAndButtonsHeaderTextDocument,
  SetWhatsAppTextAndButtonsSaveReplyDocument,
  SetWhatsAppTextAndButtonsWaitForRepliesDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import { templateStrToString } from '../../lib/templateStr';
import type { BlockT, ElementOf } from '../../types';
import { ReadOnly } from './shared/ReadOnly';
import { ReplySettings } from './shared/ReplySettings';
import { useBlockMutation } from './useBlockMutation';

export interface WhatsAppTextAndButtonsEditorProps {
  element: ElementOf<'WhatsAppTextAndButtonsBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/**
 * Header/body/footer + full button management (title edit, add ContinueFlow —
 * the only addable kind in this WA family (guide.md) — delete, reorder) +
 * reply settings. URL buttons keep their URL read-only: the schema has no
 * whatsAppTextAndButtons URL setter.
 */
export function WhatsAppTextAndButtonsEditor({ element, onBlock }: WhatsAppTextAndButtonsEditorProps) {
  const { run, runAction, actionError } = useBlockMutation(onBlock);
  const buttons = element.buttons;

  const reorder = (from: number, to: number) => {
    const ordered = buttons.map((button) => button.id);
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved!);
    // MoveWhatsAppButtons wants the FULL ordered id list, not a delta.
    void runAction(MoveWhatsAppButtonsDocument, { elementID: element.id, orderedButtonIDs: ordered }, pickBlock);
  };

  return (
    <div className="space-y-3">
      <Field
        label="Header"
        value={templateStrToString(element.headerText)}
        onSave={(text) => run(SetWhatsAppTextAndButtonsHeaderTextDocument, { elementID: element.id, text }, pickBlock)}
      />
      <Field
        label="Body"
        multiline
        value={templateStrToString(element.bodyText)}
        placeholder="Use {{attribute name}} to personalize"
        onSave={(text) => run(SetWhatsAppTextAndButtonsBodyTextDocument, { elementID: element.id, text }, pickBlock)}
      />
      <Field
        label="Footer"
        value={templateStrToString(element.footerText)}
        onSave={(text) => run(SetWhatsAppTextAndButtonsFooterTextDocument, { elementID: element.id, text }, pickBlock)}
      />
      <div className="space-y-2">
        <div className="text-xs font-medium text-text-muted">Buttons</div>
        {buttons.map((button, index) => (
          <div key={button.id} className="space-y-2 rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <Tag>{button.__typename === 'WhatsAppOpenURLButton' ? 'Open URL' : 'Continue flow'}</Tag>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  aria-label="Move button up"
                  onClick={() => reorder(index, index - 1)}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={index === buttons.length - 1}
                  aria-label="Move button down"
                  onClick={() => reorder(index, index + 1)}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete button"
                  onClick={() =>
                    void runAction(
                      DeleteWhatsAppButtonDocument,
                      { elementID: element.id, buttonID: button.id },
                      pickBlock,
                    )
                  }
                >
                  <IconTrash size={13} />
                </Button>
              </div>
            </div>
            <Field
              label={`Button ${index + 1} title`}
              value={templateStrToString(button.title)}
              onSave={(title) =>
                run(
                  SetWhatsAppButtonTitleDocument,
                  { elementID: element.id, buttonID: button.id, title },
                  (d) => d.whatsAppTextAndButtonsSetButtonTitle,
                )
              }
            />
            {button.__typename === 'WhatsAppOpenURLButton' ? (
              <ReadOnly label="URL (no setter in the API)" value={templateStrToString(button.url)} />
            ) : null}
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            void runAction(
              AddWhatsAppContinueFlowButtonDocument,
              { elementID: element.id },
              (d) => d.whatsAppTextAndButtonsAddNewContinueFlowButton,
            )
          }
        >
          <IconPlus size={13} /> Continue flow button
        </Button>
        {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
      </div>
      <ReplySettings
        element={element}
        waitDocument={SetWhatsAppTextAndButtonsWaitForRepliesDocument}
        saveDocument={SetWhatsAppTextAndButtonsSaveReplyDocument}
        onBlock={onBlock}
      />
    </div>
  );
}
