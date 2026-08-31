import { Button, Field, IconPlus, IconTrash } from '~ui';
import {
  AddWaListRowDocument,
  DeleteWaListRowDocument,
  ReorderWaListRowsDocument,
  SetWaListBodyTextDocument,
  SetWaListButtonTitleDocument,
  SetWaListRowDescriptionDocument,
  SetWaListRowTitleDocument,
  SetWaListSaveReplyDocument,
  SetWaListWaitForRepliesDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import { templateStrToString } from '../../lib/templateStr';
import type { BlockT, ElementOf } from '../../types';
import { ReplySettings } from './shared/ReplySettings';
import { useBlockMutation } from './useBlockMutation';

export interface WAListEditorProps {
  element: ElementOf<'WhatsAppListBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/**
 * Full list editing: body, list-button title, rows (title + description +
 * add/delete/reorder) and reply settings. DefinedErrorCodes to expect:
 * WAListTooManyRows, WAListInvalidRowsOrdering, WAListCannotDeleteLastRow.
 */
export function WAListEditor({ element, onBlock }: WAListEditorProps) {
  const { run, runAction, actionError } = useBlockMutation(onBlock);
  const rows = element.rows;

  const reorder = (from: number, to: number) => {
    const ordered = rows.map((row) => row.id);
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved!);
    void runAction(
      ReorderWaListRowsDocument,
      { elementID: element.id, orderedRowIDs: ordered },
      (d) => d.whatsAppListReorderRows,
    );
  };

  return (
    <div className="space-y-3">
      <Field
        label="Body"
        multiline
        value={templateStrToString(element.bodyText)}
        placeholder="Use {{attribute name}} to personalize"
        onSave={(text) => run(SetWaListBodyTextDocument, { elementID: element.id, text }, pickBlock)}
      />
      <Field
        label="List button"
        value={templateStrToString(element.buttonTitle)}
        onSave={(text) => run(SetWaListButtonTitleDocument, { elementID: element.id, text }, pickBlock)}
      />
      <div className="space-y-2">
        <div className="text-xs font-medium text-text-muted">Rows</div>
        {rows.map((row, index) => (
          <div key={row.id} className="space-y-2 rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={index === 0}
                aria-label="Move row up"
                onClick={() => reorder(index, index - 1)}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={index === rows.length - 1}
                aria-label="Move row down"
                onClick={() => reorder(index, index + 1)}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete row"
                onClick={() =>
                  void runAction(DeleteWaListRowDocument, { elementID: element.id, rowID: row.id }, pickBlock)
                }
              >
                <IconTrash size={13} />
              </Button>
            </div>
            <Field
              label={`Row ${index + 1} title`}
              value={templateStrToString(row.title)}
              onSave={(title) =>
                run(
                  SetWaListRowTitleDocument,
                  { elementID: element.id, rowID: row.id, title },
                  (d) => d.whatsAppListSetRowTitle,
                )
              }
            />
            <Field
              label="Description"
              value={templateStrToString(row.description)}
              onSave={(description) =>
                run(SetWaListRowDescriptionDocument, { elementID: element.id, rowID: row.id, description }, pickBlock)
              }
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void runAction(AddWaListRowDocument, { elementID: element.id }, (d) => d.whatsAppListAddRow)}
        >
          <IconPlus size={13} /> Add row
        </Button>
        {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
      </div>
      <ReplySettings
        element={element}
        waitDocument={SetWaListWaitForRepliesDocument}
        saveDocument={SetWaListSaveReplyDocument}
        onBlock={onBlock}
      />
    </div>
  );
}
