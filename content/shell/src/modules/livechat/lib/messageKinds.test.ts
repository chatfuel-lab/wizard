import { describe, expect, it } from 'vitest';
import { MESSAGE_KINDS, messageKind, type MessagePlatform } from './messageKinds';

/**
 * The full-coverage checklist for the thread.
 *
 * `MESSAGE_KINDS` is typed against the generated union, so a typename the
 * schema grows is already a compile error. This is the other half: the compiler
 * checks that every typename has AN entry, and the lists below check that a
 * person looked at it — which platform it belongs to, whether it is a bubble or
 * a system line, and whether it is the one type that is not a row at all.
 *
 * A new typename therefore fails twice: `tsc` because the table is a total
 * record, and here because it is in no list.
 */

const WHATSAPP = [
  'WhatsAppInTextMessage',
  'WhatsAppInImageMessage',
  'WhatsAppInVideoMessage',
  'WhatsAppInAudioMessage',
  'WhatsAppInDocumentMessage',
  'WhatsAppInContinueFlowButtonClickMessage',
  'WhatsAppInTemplateQuickReplyButtonClickMessage',
  'WhatsAppInListRowClickMessage',
  'WhatsAppInMediaPlaceholderMessage',
  'WhatsAppInUnknownMessage',
  'WhatsAppOutTextMessage',
  'WhatsAppOutImageMessage',
  'WhatsAppOutVideoMessage',
  'WhatsAppOutAudioMessage',
  'WhatsAppOutDocumentMessage',
  'WhatsAppOutTextAndButtonsMessage',
  'WhatsAppOutTextAndURLMessage',
  'WhatsAppOutListMessage',
  'WhatsAppOutTemplateMessage',
  'WhatsAppOutMediaPlaceholderMessage',
  'WhatsAppOutUnknownMessage',
];

const WIDGET = [
  'WebWidgetTextMessage',
  'WebWidgetAttachmentMessage',
  'WebWidgetTextAndButtonsMessage',
  'WebWidgetContinueFlowButtonClickMessage',
  'WebWidgetOpenURLButtonClickMessage',
  'WebWidgetCallPhoneButtonClickMessage',
];

const INSTAGRAM = [
  'InstagramInTextMessage',
  'InstagramInImageMessage',
  'InstagramInVideoMessage',
  'InstagramInAudioMessage',
  'InstagramInFeedCommentMessage',
  'InstagramInReelCommentMessage',
  'InstagramInAdCommentMessage',
  'InstagramInStoryReplyMessage',
  'InstagramInUnknownMessage',
  'InstagramOutTextMessage',
  'InstagramOutImageMessage',
  'InstagramOutVideoMessage',
  'InstagramOutAudioMessage',
  'InstagramOutPublicCommentReplyMessage',
  'InstagramOutUnknownMessage',
];

const FACEBOOK = [
  'FacebookInTextMessage',
  'FacebookInImageMessage',
  'FacebookInVideoMessage',
  'FacebookInAudioMessage',
  'FacebookInFileMessage',
  'FacebookInPostCommentMessage',
  'FacebookInUnknownMessage',
  'FacebookOutTextMessage',
  'FacebookOutImageMessage',
  'FacebookOutVideoMessage',
  'FacebookOutAudioMessage',
  'FacebookOutPublicCommentReplyMessage',
  'FacebookOutUnknownMessage',
];

const TIKTOK = [
  'TikTokInTextMessage',
  'TikTokInImageMessage',
  'TikTokInTextPostCommentMessage',
  'TikTokInUnknownMessage',
  'TikTokOutTextMessage',
  'TikTokOutImageMessage',
  'TikTokOutPublicCommentReplyMessage',
  'TikTokOutUnknownMessage',
];

/** Centred lines about the conversation, not messages in it. */
const SYSTEM_LINES = [
  'SystemLivechatOpenedManuallyMessage',
  'SystemLivechatOpenedByComponentMessage',
  'SystemLivechatOpenedByBooking',
  'SystemLivechatOpenedByCoexMessage',
  'SystemLivechatOpenedByInstagramAppMessage',
  'SystemLivechatOpenedByFacebookAppMessage',
  'SystemLivechatOpenedByTikTokAppMessage',
  'SystemLivechatClosedByAutoClosingMessage',
  'SystemConversationSummaryMessage',
  'SystemMetaConversionEventSentMessage',
];

/** Not a row. See the note on MESSAGE_KINDS, and threadStore's mergeNodes. */
const NEVER_A_ROW = ['SystemTypingMessage'];

const BY_PLATFORM: Record<MessagePlatform, string[]> = {
  whatsapp: WHATSAPP,
  widget: WIDGET,
  instagram: INSTAGRAM,
  facebook: FACEBOOK,
  tiktok: TIKTOK,
  system: [...SYSTEM_LINES, ...NEVER_A_ROW],
};

describe('message kind coverage', () => {
  it('accounts for every concrete Message typename exactly once', () => {
    const listed = Object.values(BY_PLATFORM).flat();
    expect(new Set(listed).size).toBe(listed.length); // nothing listed twice
    expect(Object.keys(MESSAGE_KINDS).sort()).toEqual([...listed].sort());
  });

  it('covers all 74 of them', () => {
    expect(Object.keys(MESSAGE_KINDS)).toHaveLength(74);
  });

  it('files each typename under the platform it arrived on', () => {
    for (const [platform, typenames] of Object.entries(BY_PLATFORM)) {
      for (const typename of typenames) {
        expect(MESSAGE_KINDS[typename as keyof typeof MESSAGE_KINDS]?.platform).toBe(platform);
      }
    }
  });

  it('makes SystemTypingMessage the only typename that is never a row', () => {
    const skipped = Object.entries(MESSAGE_KINDS)
      .filter(([, kind]) => kind.row === 'skip')
      .map(([typename]) => typename);
    expect(skipped).toEqual(NEVER_A_ROW);
  });

  it('renders every System* typename as a system line and nothing else as one', () => {
    const lines = Object.entries(MESSAGE_KINDS)
      .filter(([, kind]) => kind.row === 'system')
      .map(([typename]) => typename);
    expect(lines.sort()).toEqual([...SYSTEM_LINES].sort());
  });

  it('gives every entry a label a person could read', () => {
    for (const [typename, kind] of Object.entries(MESSAGE_KINDS)) {
      expect(kind.label, typename).toMatch(/^[A-Z]/);
      /* The old fallback printed the de-camel-cased typename. A label that
         still contains one means an entry was filled in mechanically. */
      expect(kind.label, typename).not.toMatch(/Message$/);
    }
  });
});

describe('messageKind', () => {
  it('answers from the table for a known typename', () => {
    expect(messageKind('WhatsAppOutListMessage')).toEqual({
      platform: 'whatsapp',
      row: 'bubble',
      shape: 'list',
      label: 'List message',
    });
  });

  /* A server ahead of the build is the ordinary case for a client shipped as a
     template, and an unknown typename must never blank or crash a thread. */
  it('prettifies a typename the build has never heard of', () => {
    expect(messageKind('WhatsAppInLocationMessage')).toEqual({
      platform: 'whatsapp',
      row: 'bubble',
      shape: 'unknown',
      label: 'Location',
    });
  });

  it('keeps an unknown System* typename off the bubble track', () => {
    const kind = messageKind('SystemLivechatOpenedByTelepathyMessage');
    expect(kind.row).toBe('system');
    expect(kind.platform).toBe('system');
  });

  it('falls back to the raw typename when there is nothing left after stripping', () => {
    expect(messageKind('WhatsAppInMessage').label).toBe('WhatsAppInMessage');
  });
});
