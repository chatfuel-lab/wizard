import {
  SetWidgetImageFileDocument,
  SetWidgetImageSaveReplyDocument,
  SetWidgetImageWaitForRepliesDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import type { BlockT, ElementOf } from '../../types';
import { MediaField } from './shared/MediaField';
import { ReplySettings } from './shared/ReplySettings';
import { useBlockMutation } from './useBlockMutation';

export interface WidgetImageEditorProps {
  element: ElementOf<'WidgetImageBlockElement'>;
  onBlock: (block: BlockT) => void;
}

/** Widget image: upload-then-attach + reply settings (no caption in schema). */
export function WidgetImageEditor({ element, onBlock }: WidgetImageEditorProps) {
  const { run, actionError } = useBlockMutation(onBlock);

  return (
    <div className="space-y-3">
      <MediaField
        elementId={element.id}
        label="Image"
        fileType="Image"
        accept="image/*"
        current={element.image}
        onAttach={(fileID) => run(SetWidgetImageFileDocument, { elementID: element.id, fileID }, pickBlock)}
      />
      <ReplySettings
        element={element}
        waitDocument={SetWidgetImageWaitForRepliesDocument}
        saveDocument={SetWidgetImageSaveReplyDocument}
        onBlock={onBlock}
      />
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
    </div>
  );
}
