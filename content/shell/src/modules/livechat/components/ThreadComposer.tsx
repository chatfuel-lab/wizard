import { useCallback, useRef, useState } from 'react';
import { AttachmentTile, Button, Composer, IconLayoutList, formatFileSize, useBand, type ComposerApi } from '~ui';
import { Platform } from '~api/generated/livechat/graphql';
import { useUploadStore } from '../hooks/useUploadStore';
import type { SendAttachmentInput, SendTemplateInput } from '../hooks/useConversationSend';
import { acceptFor } from '../lib/attachments';
import type { SendWindow } from '../lib/sendWindow';
import { uploadFailureText } from '../lib/uploadStore';
import { CannedResponsesMenu } from './CannedResponsesMenu';
import { EmojiPicker } from './EmojiPicker';
import { TemplateDialog } from './TemplateDialog';

export interface ThreadComposerProps {
  conversationId: string;
  platform: Platform;
  /** Inbox: Edit. */
  canEdit: boolean;
  /** Whether this channel will take a message at all right now. */
  gate: SendWindow;
  /** Who the thread is with — the template dialog names them. */
  contactName: string;
  onSendText: (text: string) => void;
  onSendAttachment: (input: SendAttachmentInput) => void;
  onSendTemplate: (input: SendTemplateInput) => void;
}

/**
 * The composer, its tray and the two pickers beside it.
 *
 * A message is a file OR text on every one of these platforms — the attachment
 * mutations take one `FileID` and no text at all — so "send a picture with a
 * caption" is two messages, each with its own `clientId`, and this is the
 * component that knows it. The files go first: a caption that arrives before
 * what it captions reads as a non sequitur.
 */
export function ThreadComposer({
  conversationId,
  platform,
  canEdit,
  gate,
  contactName,
  onSendText,
  onSendAttachment,
  onSendTemplate,
}: ThreadComposerProps) {
  /* The pickers write into the draft through the composer's own door: it
     puts the text at the caret and leaves the caret after it, and it reads the
     caret off the textarea itself — which keeps its selection while the
     picker's button has focus. */
  const composer = useRef<ComposerApi>(null);
  /* Four controls in the left slot leave a 360px thread no room to type. The
     module reads the band and tells the composer; `~ui` measures nothing. */
  const band = useBand();
  const { staged, sendable, uploading, supported, attach, retry, remove, take } = useUploadStore(
    conversationId,
    platform,
  );

  const disabled = !canEdit || !gate.open;
  /* Two different silences. No permission gets the sentence under the box —
     there is nothing else on screen that explains it. A shut window gets only
     the box's own placeholder: the template icon beside it is the way back and
     is lit to say so, and a paragraph repeating that was noise. */
  const disabledHint = !canEdit ? 'You need the Inbox: Edit permission to reply.' : undefined;
  const placeholder = canEdit && !gate.open ? gate.reason : undefined;

  /* Templates are WhatsApp's, and they are offered whenever the operator may
     write at all — not only once the window has shut. A template is also how a
     conversation is STARTED with someone who has not written in, and hiding
     the button until the window closes would teach that it is a fallback. */
  const templates = platform === Platform.Whatsapp && canEdit;
  const [templateOpen, setTemplateOpen] = useState(false);

  const send = useCallback(
    (text: string) => {
      for (const attachment of take()) {
        if (attachment.fileId === null) continue;
        onSendAttachment({
          fileId: attachment.fileId,
          type: attachment.type,
          name: attachment.name,
          kind: attachment.kind,
          previewUrl: attachment.previewUrl,
        });
      }
      if (text !== '') onSendText(text);
    },
    [take, onSendAttachment, onSendText],
  );

  const insert = (text: string) => composer.current?.insert(text);

  return (
    <div className="shrink-0">
      <Composer
        ref={composer}
        compact={band === 'compact'}
        onSend={send}
        disabled={disabled}
        disabledHint={disabledHint}
        placeholder={placeholder}
        /* No handler at all when the host wired no upload path, which is what
           removes the paperclip entirely. Being unable to send RIGHT NOW is a
           different thing and keeps the button: the composer greys it along
           with everything else and the hint underneath says why. */
        onAttach={supported ? attach : undefined}
        accept={acceptFor(platform)}
        attachmentCount={sendable.length}
        /* An upload in flight greys the BUTTON, not the composer. Letting the
           text go now and the picture in a moment would reorder them in the
           thread, which is the one thing the operator did not ask for. */
        sending={uploading}
        attachments={
          staged.length === 0
            ? null
            : staged.map((attachment) => (
                <AttachmentTile
                  key={attachment.id}
                  kind={attachment.kind}
                  name={attachment.name}
                  meta={formatFileSize(attachment.size)}
                  previewUrl={attachment.previewUrl}
                  state={attachment.status}
                  progress={attachment.progress ?? undefined}
                  error={attachment.refusal ?? (attachment.failure ? uploadFailureText(attachment.failure) : undefined)}
                  /* Only where retrying could change the answer. A file this
                     channel does not carry will not carry any better the second
                     time, and a retry button on it is an invitation to keep
                     pressing. */
                  onRetry={attachment.failure ? () => retry(attachment.id) : undefined}
                  onRemove={() => remove(attachment.id)}
                />
              ))
        }
        leftSlot={
          <>
            <CannedResponsesMenu disabled={disabled} onPick={insert} />
            <EmojiPicker disabled={disabled} onPick={insert} />
            {templates ? (
              /* Never disabled with the rest of the slot: when the window shut
                 the box, this is the one control that still does something,
                 and it says so by colour rather than by a sentence — the hint
                 under the composer already gives the reason, and a second row
                 of prose beside a button was two ways of saying one thing. */
              <Button
                iconOnly
                variant="ghost"
                onClick={() => setTemplateOpen(true)}
                aria-label="Send a WhatsApp template"
                aria-haspopup="dialog"
                aria-expanded={templateOpen}
                className={gate.open ? '' : 'bg-accent-soft text-accent hover:text-accent'}
              >
                <IconLayoutList />
              </Button>
            ) : null}
          </>
        }
      />

      {templates ? (
        <TemplateDialog
          open={templateOpen}
          onClose={() => setTemplateOpen(false)}
          contactName={contactName}
          onSend={onSendTemplate}
        />
      ) : null}
    </div>
  );
}
