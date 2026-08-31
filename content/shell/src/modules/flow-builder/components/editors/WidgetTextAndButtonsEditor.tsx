import { Button, Field, IconPlus, IconTrash, Tag } from '~ui';
import {
  AddWidgetContinueFlowButtonDocument,
  AddWidgetOpenUrlButtonDocument,
  AddWidgetPhoneButtonDocument,
  DeleteWidgetButtonDocument,
  MoveWidgetButtonsDocument,
  SetWidgetButtonPhoneDocument,
  SetWidgetButtonTitleDocument,
  SetWidgetButtonUrlDocument,
  SetWidgetTextAndButtonsSaveReplyDocument,
  SetWidgetTextAndButtonsTextDocument,
  SetWidgetTextAndButtonsWaitForRepliesDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import { templateStrToString } from '../../lib/templateStr';
import type { BlockT, ElementOf } from '../../types';
import { ReplySettings } from './shared/ReplySettings';
import { useBlockMutation } from './useBlockMutation';

export interface WidgetTextAndButtonsEditorProps {
  element: ElementOf<'WidgetTextAndButtonBlockElement'>;
  onBlock: (block: BlockT) => void;
}

const BUTTON_KIND_LABELS: Record<string, string> = {
  WidgetContinueFlowButton: 'Continue flow',
  WidgetOpenURLButton: 'Open URL',
  WidgetCallPhoneButton: 'Call phone',
};

/** Text + full widget button management (title/url/phone edit, add all three kinds, delete, reorder) + reply settings. */
export function WidgetTextAndButtonsEditor({ element, onBlock }: WidgetTextAndButtonsEditorProps) {
  const { run, runAction, actionError } = useBlockMutation(onBlock);
  const buttons = element.buttons;

  const reorder = (from: number, to: number) => {
    const ordered = buttons.map((button) => button.id);
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved!);
    // MoveWidgetButtons wants the FULL ordered id list, not a delta.
    void runAction(
      MoveWidgetButtonsDocument,
      { elementID: element.id, orderedButtonIDs: ordered },
      (d) => d.widgetTextAndButtonsMoveButton,
    );
  };

  return (
    <div className="space-y-3">
      <Field
        label="Message"
        multiline
        value={templateStrToString(element.text)}
        placeholder="Use {{attribute name}} to personalize"
        onSave={(text) =>
          run(
            SetWidgetTextAndButtonsTextDocument,
            { elementID: element.id, text },
            (d) => d.widgetTextAndButtonsSetText,
          )
        }
      />
      <div className="space-y-2">
        <div className="text-xs font-medium text-text-muted">Buttons</div>
        {buttons.map((button, index) => (
          <div key={button.id} className="space-y-2 rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <Tag>{BUTTON_KIND_LABELS[button.__typename] ?? button.__typename}</Tag>
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
                      DeleteWidgetButtonDocument,
                      { elementID: element.id, buttonID: button.id },
                      (d) => d.widgetTextAndButtonsDeleteButton,
                    )
                  }
                >
                  <IconTrash size={13} />
                </Button>
              </div>
            </div>
            <Field
              label="Title"
              value={templateStrToString(button.title)}
              onSave={(title) =>
                run(
                  SetWidgetButtonTitleDocument,
                  { elementID: element.id, buttonID: button.id, title },
                  (d) => d.widgetTextAndButtonsSetButtonTitle,
                )
              }
            />
            {button.__typename === 'WidgetOpenURLButton' ? (
              <Field
                label="URL"
                value={templateStrToString(button.url)}
                placeholder="https://…"
                onSave={(url) =>
                  run(
                    SetWidgetButtonUrlDocument,
                    { elementID: element.id, buttonID: button.id, url },
                    (d) => d.widgetTextAndButtonsSetButtonURL,
                  )
                }
              />
            ) : null}
            {button.__typename === 'WidgetCallPhoneButton' ? (
              <Field
                label="Phone"
                value={button.phone ?? ''}
                placeholder="+15551234567"
                onSave={(phone) =>
                  run(SetWidgetButtonPhoneDocument, { elementID: element.id, buttonID: button.id, phone }, pickBlock)
                }
              />
            ) : null}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              void runAction(
                AddWidgetContinueFlowButtonDocument,
                { elementID: element.id },
                (d) => d.widgetTextAndButtonsAddNewContinueFlowButton,
              )
            }
          >
            <IconPlus size={13} /> Continue flow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              void runAction(
                AddWidgetOpenUrlButtonDocument,
                { elementID: element.id },
                (d) => d.widgetTextAndButtonsAddNewOpenURLButton,
              )
            }
          >
            <IconPlus size={13} /> Open URL
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void runAction(AddWidgetPhoneButtonDocument, { elementID: element.id }, pickBlock)}
          >
            <IconPlus size={13} /> Call phone
          </Button>
        </div>
        {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
      </div>
      <ReplySettings
        element={element}
        waitDocument={SetWidgetTextAndButtonsWaitForRepliesDocument}
        saveDocument={SetWidgetTextAndButtonsSaveReplyDocument}
        onBlock={onBlock}
      />
    </div>
  );
}
