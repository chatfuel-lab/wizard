import type { TypedDoc } from '~api';
import {
  Platform,
  SendFacebookAttachmentDocument,
  SendFacebookTextDocument,
  SendInstagramAttachmentDocument,
  SendInstagramTextDocument,
  SendTikTokAttachmentDocument,
  SendTikTokTextDocument,
  SendWhatsAppAttachmentDocument,
  SendWhatsAppTextDocument,
  SendWidgetAttachmentDocument,
  SendWidgetTextDocument,
} from '~api/generated/livechat/graphql';

export interface SendTextVars {
  botID: string;
  conversationID: string;
  message: { text: string; clientId?: string | null };
  [key: string]: unknown;
}

/**
 * Sending branches on Conversation.platform (guide.md). All five *TextMessageSendInput
 * shapes are structurally {text, clientId}, so one variables shape serves them all.
 */
export const SEND_TEXT_BY_PLATFORM: Record<Platform, TypedDoc<unknown, SendTextVars>> = {
  [Platform.Widget]: SendWidgetTextDocument as TypedDoc<unknown, SendTextVars>,
  [Platform.Whatsapp]: SendWhatsAppTextDocument as TypedDoc<unknown, SendTextVars>,
  [Platform.Instagram]: SendInstagramTextDocument as TypedDoc<unknown, SendTextVars>,
  [Platform.Facebook]: SendFacebookTextDocument as TypedDoc<unknown, SendTextVars>,
  [Platform.Tiktok]: SendTikTokTextDocument as TypedDoc<unknown, SendTextVars>,
};

export interface SendAttachmentVars {
  botID: string;
  conversationID: string;
  message: {
    /** The `FileID` the REST upload returned. GraphQL never takes the bytes. */
    attachment: string;
    /** The platform's own enum value — `attachments.ts` picks it. */
    attachmentType: string;
    clientId?: string | null;
    /** WhatsApp documents only; every other input rejects the field. */
    attachmentName?: string;
  };
  [key: string]: unknown;
}

/**
 * The same trick again, for the second half of sending.
 *
 * The five *AttachmentMessageSendInput shapes agree on {attachment,
 * attachmentType, clientId} — WhatsApp's alone adds an optional attachmentName
 * for documents, which is why the variables type carries it as optional and
 * `attachmentMessage()` is the one place that decides whether to set it. Where
 * they do NOT agree is the attachmentType enum: five different subsets of the
 * same four words, which is `attachments.ts`'s business rather than this map's.
 */
export const SEND_ATTACHMENT_BY_PLATFORM: Record<Platform, TypedDoc<unknown, SendAttachmentVars>> = {
  [Platform.Widget]: SendWidgetAttachmentDocument as TypedDoc<unknown, SendAttachmentVars>,
  [Platform.Whatsapp]: SendWhatsAppAttachmentDocument as TypedDoc<unknown, SendAttachmentVars>,
  [Platform.Instagram]: SendInstagramAttachmentDocument as TypedDoc<unknown, SendAttachmentVars>,
  [Platform.Facebook]: SendFacebookAttachmentDocument as TypedDoc<unknown, SendAttachmentVars>,
  [Platform.Tiktok]: SendTikTokAttachmentDocument as TypedDoc<unknown, SendAttachmentVars>,
};
