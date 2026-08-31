import { useCallback, type Dispatch } from 'react';
import { newClientId, type UploadFileType } from '~api';
import type { AttachmentKind } from '~ui';
import { SendWhatsAppTemplateDocument } from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { attachmentMessage } from '../lib/attachments';
import { sendFailureText } from '../lib/messageErrors';
import type { TemplateContent } from '../lib/messagePayload';
import { SEND_ATTACHMENT_BY_PLATFORM, SEND_TEXT_BY_PLATFORM } from '../lib/sendDocByPlatform';
import type { ThreadAction } from '../lib/threadStore';
import type { ConversationInfo } from '../types';

/** One filled template, ready to become one message. */
export interface SendTemplateInput {
  /** The temporary `FilledWhatsAppTemplateID` the form built. */
  filledTemplateId: string;
  /** For the optimistic row's merge story only — the bubble never shows it. */
  name: string;
  /**
   * For the optimistic bubble: the filled copy as the echo will render it,
   * built by `templateContentOf` from the form's own preview.
   */
  content: TemplateContent;
}

/** One uploaded file, ready to become one message. */
export interface SendAttachmentInput {
  /** The `FileID` the REST upload answered with. */
  fileId: string;
  type: UploadFileType;
  name: string;
  /** For the optimistic bubble only — the glyph the tile draws. */
  kind: AttachmentKind;
  previewUrl: string | null;
}

export interface ConversationSend {
  send: (text: string) => void;
  sendAttachment: (input: SendAttachmentInput) => void;
  sendTemplate: (input: SendTemplateInput) => void;
}

/**
 * The three ways a message leaves the open thread — text, an uploaded file, a
 * filled WhatsApp template — each an optimistic `sendStarted` dispatch and the
 * platform's own mutation.
 *
 * Callbacks only, deliberately no effects: `useConversation` composes this
 * over its own reducer, and its `opened` sync effect must stay the first
 * effect to run on a conversation switch.
 */
export function useConversationSend(
  openId: string | null,
  conversation: ConversationInfo | null,
  dispatch: Dispatch<ThreadAction>,
): ConversationSend {
  const { client, botId } = useLivechat();

  const send = useCallback(
    (text: string) => {
      if (!openId || !conversation) return;
      const clientId = newClientId();
      dispatch({ type: 'sendStarted', clientId, text, sentTime: new Date().toISOString() });
      client
        .mutate(SEND_TEXT_BY_PLATFORM[conversation.platform], {
          botID: botId,
          conversationID: openId,
          message: { text, clientId },
        })
        .catch((err: unknown) => dispatch({ type: 'sendFailed', clientId, failure: sendFailureText(err) }));
    },
    [client, botId, openId, conversation, dispatch],
  );

  /**
   * The second half of an attachment send: the file is already up, and this is
   * the mutation that references it.
   *
   * A fresh `clientId` per file, on exactly the path text takes, because the
   * merge in `threadStore` is keyed on it and the Chatfuel dashboard writes its
   * own UUIDs into the same thread. Reusing the tray's local id here would put
   * a non-UUID into a namespace two clients share.
   *
   * The optimistic row carries the tile rather than a filename in a text
   * bubble: an operator who has just sent a photo is looking for the photo.
   */
  const sendAttachment = useCallback(
    (input: SendAttachmentInput) => {
      if (!openId || !conversation) return;
      const clientId = newClientId();
      const message = attachmentMessage(conversation.platform, {
        fileId: input.fileId,
        type: input.type,
        name: input.name,
        clientId,
      });
      /* Null means this channel cannot carry this file — already answered when
         it was picked, so reaching here at all would be a bug. Sending anyway
         would fail on an enum value and leave a bubble with no explanation. */
      if (!message) return;
      dispatch({
        type: 'sendStarted',
        clientId,
        text: '',
        sentTime: new Date().toISOString(),
        attachment: { kind: input.kind, name: input.name, previewUrl: input.previewUrl },
      });
      client
        .mutate(SEND_ATTACHMENT_BY_PLATFORM[conversation.platform], {
          botID: botId,
          conversationID: openId,
          message,
        })
        .catch((err: unknown) => dispatch({ type: 'sendFailed', clientId, failure: sendFailureText(err) }));
    },
    [client, botId, openId, conversation, dispatch],
  );

  /**
   * The only way to write outside the 24-hour window, on exactly the path text
   * takes: a fresh `clientId`, an optimistic row keyed on it, and the echo —
   * a `WhatsAppOutTemplateMessage` — retiring the row by the same merge. Two
   * tabs sending the same filled copy therefore land on one row, not two.
   *
   * WhatsApp only, and not gated on the platform here: the button that leads
   * to this exists only on WhatsApp conversations, and a second check would be
   * a second place for the rule to live.
   */
  const sendTemplate = useCallback(
    (input: SendTemplateInput) => {
      if (!openId || !conversation) return;
      const clientId = newClientId();
      dispatch({
        type: 'sendStarted',
        clientId,
        text: '',
        sentTime: new Date().toISOString(),
        template: { name: input.name, content: input.content },
      });
      client
        .mutate(SendWhatsAppTemplateDocument, {
          botID: botId,
          conversationID: openId,
          template: { filledTemplateID: input.filledTemplateId, clientId },
        })
        /* The answer is a record of the message and merges like the echo
           does — `fresher` decides between them by `updatedAt`, so whichever
           lands second changes nothing. Applied here, unlike the text path,
           because a template is sent from a dialog that closes on send: the
           operator is looking at the thread for the row, and an echo that has
           not arrived yet cannot bring it. */
        .then((data) => {
          if (data.whatsAppTemplateSend) {
            dispatch({ type: 'live', node: data.whatsAppTemplateSend, now: Date.now() });
          }
        })
        .catch((err: unknown) => dispatch({ type: 'sendFailed', clientId, failure: sendFailureText(err) }));
    },
    [client, botId, openId, conversation, dispatch],
  );

  return { send, sendAttachment, sendTemplate };
}
