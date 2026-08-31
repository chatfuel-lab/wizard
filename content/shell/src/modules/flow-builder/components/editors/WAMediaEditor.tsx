import type { ReactNode } from 'react';
import type { TypedDoc } from '~api';
import { Field } from '~ui';
import {
  SetWhatsAppAudioFileDocument,
  SetWhatsAppAudioSaveReplyDocument,
  SetWhatsAppAudioWaitForRepliesDocument,
  SetWhatsAppDocumentCaptionDocument,
  SetWhatsAppDocumentFileDocument,
  SetWhatsAppDocumentSaveReplyDocument,
  SetWhatsAppDocumentWaitForRepliesDocument,
  SetWhatsAppImageCaptionDocument,
  SetWhatsAppImageFileDocument,
  SetWhatsAppImageSaveReplyDocument,
  SetWhatsAppImageWaitForRepliesDocument,
  SetWhatsAppVideoCaptionDocument,
  SetWhatsAppVideoFileDocument,
  SetWhatsAppVideoSaveReplyDocument,
  SetWhatsAppVideoWaitForRepliesDocument,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import { templateStrToString } from '../../lib/templateStr';
import type { BlockT, ElementOf } from '../../types';
import { MediaField } from './shared/MediaField';
import { ReplySettings, type SaveReplyDocument, type WaitDocument } from './shared/ReplySettings';
import { useBlockMutation } from './useBlockMutation';

type CaptionDocument = TypedDoc<Record<string, unknown>, { elementID: string; caption: string }>;

type WAMediaElement =
  | ElementOf<'WhatsAppImageBlockElement'>
  | ElementOf<'WhatsAppVideoBlockElement'>
  | ElementOf<'WhatsAppAudioBlockElement'>
  | ElementOf<'WhatsAppDocumentBlockElement'>;

export interface WAMediaEditorProps {
  element: WAMediaElement;
  onBlock: (block: BlockT) => void;
}

/**
 * The WhatsApp media quartet in one editor: upload-then-attach file, caption
 * where the family has one (image/video/document — audio does not), and the
 * shared reply settings. Attach signatures differ per family (image takes no
 * fileName), hence the per-branch wiring.
 */
export function WAMediaEditor({ element, onBlock }: WAMediaEditorProps) {
  const { run, actionError } = useBlockMutation(onBlock);

  const caption = (doc: CaptionDocument, value: string) => (
    <Field
      label="Caption"
      multiline
      value={value}
      placeholder="Use {{attribute name}} to personalize"
      onSave={(text) => run(doc, { elementID: element.id, caption: text }, pickBlock)}
    />
  );

  let media: ReactNode;
  let captionField: ReactNode = null;
  let replyDocs: { wait: WaitDocument; save: SaveReplyDocument };

  switch (element.__typename) {
    case 'WhatsAppImageBlockElement':
      media = (
        <MediaField
          elementId={element.id}
          label="Image"
          fileType="Image"
          accept="image/*"
          current={element.image}
          onAttach={(fileID) => run(SetWhatsAppImageFileDocument, { elementID: element.id, fileID }, pickBlock)}
        />
      );
      captionField = caption(SetWhatsAppImageCaptionDocument, templateStrToString(element.caption));
      replyDocs = { wait: SetWhatsAppImageWaitForRepliesDocument, save: SetWhatsAppImageSaveReplyDocument };
      break;
    case 'WhatsAppVideoBlockElement':
      media = (
        <MediaField
          elementId={element.id}
          label="Video"
          fileType="Video"
          accept="video/*"
          current={element.video}
          currentName={element.fileName}
          onAttach={(fileID, fileName) =>
            run(SetWhatsAppVideoFileDocument, { elementID: element.id, fileID, fileName }, pickBlock)
          }
        />
      );
      captionField = caption(SetWhatsAppVideoCaptionDocument, templateStrToString(element.caption));
      replyDocs = { wait: SetWhatsAppVideoWaitForRepliesDocument, save: SetWhatsAppVideoSaveReplyDocument };
      break;
    case 'WhatsAppAudioBlockElement':
      media = (
        <MediaField
          elementId={element.id}
          label="Audio"
          fileType="Audio"
          accept="audio/*"
          current={element.audio}
          currentName={element.fileName}
          onAttach={(fileID, fileName) =>
            run(SetWhatsAppAudioFileDocument, { elementID: element.id, fileID, fileName }, pickBlock)
          }
        />
      );
      replyDocs = { wait: SetWhatsAppAudioWaitForRepliesDocument, save: SetWhatsAppAudioSaveReplyDocument };
      break;
    case 'WhatsAppDocumentBlockElement':
      media = (
        <MediaField
          elementId={element.id}
          label="Document"
          fileType="Document"
          accept="*/*"
          current={element.document}
          currentName={element.fileName}
          onAttach={(fileID, fileName) =>
            run(SetWhatsAppDocumentFileDocument, { elementID: element.id, fileID, fileName }, pickBlock)
          }
        />
      );
      captionField = caption(SetWhatsAppDocumentCaptionDocument, templateStrToString(element.caption));
      replyDocs = { wait: SetWhatsAppDocumentWaitForRepliesDocument, save: SetWhatsAppDocumentSaveReplyDocument };
      break;
  }

  return (
    <div className="space-y-3">
      {media}
      {captionField}
      <ReplySettings element={element} waitDocument={replyDocs.wait} saveDocument={replyDocs.save} onBlock={onBlock} />
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
    </div>
  );
}
