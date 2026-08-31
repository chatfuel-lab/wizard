import type { MessageStatus } from '~ui';
import type { LastMessageNode } from '../types';
import { messageDirection } from './direction';
import { messageKind, type MessageShape } from './messageKinds';
import { platformStatus } from './messagePayload';

/**
 * The chat list's one-line summary of a conversation's last message.
 *
 * `LastMessagePreview` is a slimmer projection than the thread's node — the
 * one string that summarises each typename, the outbound status field, and
 * the sender's typename for direction — so this is its own reader rather
 * than `readPayload` over a narrower type. Same discipline: every field is
 * read under a check on the concrete `__typename`, because the field that
 * carries "the text" is `text` on one type, `caption` on another, `bodyText`
 * on a third and `body.text` on a fourth, and an `'text' in last` check is
 * what printed raw typenames in the list for everything else.
 *
 * `icon` is the shape's glyph, for everything that is not plain text: a
 * photo with a caption reads "▣ Nice!" and one without reads "▣ Photo", so
 * the reader can tell a caption from a sentence without opening the thread.
 */
export interface ChatPreview {
  /** The shape's glyph — omitted for plain text. */
  icon?: MessageShape;
  text: string;
}

const NO_MESSAGES: ChatPreview = { text: 'No messages yet' };

/** A trimmed non-empty string, or null: `caption` and friends are nullable. */
const words = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * The one string this typename carries that stands for the message, or null
 * when it carries none (media without a caption, the Placeholder and Unknown
 * types, the System types).
 */
function previewWords(last: LastMessageNode): string | null {
  switch (last.__typename) {
    case 'WhatsAppInTextMessage':
    case 'WhatsAppOutTextMessage':
    case 'WebWidgetTextMessage':
    case 'WebWidgetTextAndButtonsMessage':
    case 'InstagramInTextMessage':
    case 'InstagramOutTextMessage':
    case 'InstagramInFeedCommentMessage':
    case 'InstagramInReelCommentMessage':
    case 'InstagramInAdCommentMessage':
    case 'InstagramInStoryReplyMessage':
    case 'InstagramOutPublicCommentReplyMessage':
    case 'FacebookInTextMessage':
    case 'FacebookOutTextMessage':
    case 'FacebookInPostCommentMessage':
    case 'FacebookOutPublicCommentReplyMessage':
    case 'TikTokInTextMessage':
    case 'TikTokOutTextMessage':
    case 'TikTokInTextPostCommentMessage':
    case 'TikTokOutPublicCommentReplyMessage':
      return words(last.text);
    case 'WhatsAppInImageMessage':
    case 'WhatsAppInVideoMessage':
    case 'WhatsAppInDocumentMessage':
    case 'WhatsAppOutImageMessage':
    case 'WhatsAppOutVideoMessage':
    case 'WhatsAppOutDocumentMessage':
      return words(last.caption);
    case 'WhatsAppOutTextAndButtonsMessage':
    case 'WhatsAppOutTextAndURLMessage':
    case 'WhatsAppOutListMessage':
      return words(last.bodyText);
    case 'WhatsAppOutTemplateMessage':
      return words(last.body?.text);
    case 'WhatsAppInContinueFlowButtonClickMessage':
    case 'WhatsAppInTemplateQuickReplyButtonClickMessage':
      return words(last.buttonTitle);
    case 'WhatsAppInListRowClickMessage':
      return words(last.rowTitle);
    case 'WebWidgetContinueFlowButtonClickMessage':
    case 'WebWidgetOpenURLButtonClickMessage':
    case 'WebWidgetCallPhoneButtonClickMessage':
      return words(last.button.title);
    default:
      return null;
  }
}

/** The list row's second line. */
export function previewOf(last: LastMessageNode | null | undefined): ChatPreview {
  if (!last) return NO_MESSAGES;
  const kind = messageKind(last.__typename);
  const text = previewWords(last) ?? kind.label;
  return kind.shape === 'text' ? { text } : { icon: kind.shape, text };
}

/**
 * The tick beside the preview, for an OUTGOING last message whose status is
 * on the wire; nothing for the contact's own message, however its platform
 * spells status. The list has no `errors[]` to outrank it — that is the
 * thread's — so a refused message shows the last status the platform gave.
 */
export function previewStatus(last: LastMessageNode | null | undefined): MessageStatus | undefined {
  if (!last || messageDirection(last) !== 'out') return undefined;
  return platformStatus(last);
}
