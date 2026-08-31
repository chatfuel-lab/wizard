import { describe, expect, it } from 'vitest';
import {
  FacebookMessageStatus,
  InstagramMessageStatus,
  TikTokMessageStatus,
  WebWidgetMessageStatus,
  WhatsAppMessageStatus,
} from '~api/generated/livechat/graphql';
import type { LastMessageNode } from '../types';
import { MESSAGE_KINDS } from './messageKinds';
import { previewOf, previewStatus } from './preview';

const SENTINEL = 'SENTINEL';

/**
 * Every field the `LastMessagePreview` projection can carry, all set to a
 * sentinel, so the sweep below can tell a typename that reads its own field
 * from one that reads nothing — and so a typename that reads a field it does
 * not select cannot pass by accident.
 */
const lastOf = (typename: string, over: Record<string, unknown> = {}): LastMessageNode =>
  ({
    __typename: typename,
    id: 'm1',
    sentTime: '2026-08-13T12:00:00.000Z',
    sender: { __typename: typename.includes('Out') ? 'AdminMessageSender' : 'ContactMessageSender' },
    text: `${SENTINEL}-text`,
    caption: `${SENTINEL}-caption`,
    bodyText: `${SENTINEL}-body`,
    buttonTitle: `${SENTINEL}-button`,
    rowTitle: `${SENTINEL}-row`,
    button: { __typename: 'WebWidgetContinueFlowButton', title: `${SENTINEL}-tapped` },
    body: { __typename: 'WhatsAppOutTemplateMessageComponentText', text: `${SENTINEL}-tpl-body` },
    whatsappStatus: WhatsAppMessageStatus.Delivered,
    status: WebWidgetMessageStatus.Seen,
    instagramStatus: InstagramMessageStatus.Read,
    facebookStatus: FacebookMessageStatus.Sent,
    tiktokStatus: TikTokMessageStatus.Sending,
    ...over,
  }) as unknown as LastMessageNode;

const KINDS = Object.keys(MESSAGE_KINDS) as (keyof typeof MESSAGE_KINDS)[];

describe('previewOf', () => {
  it('says so when there is no message', () => {
    expect(previewOf(null)).toEqual({ text: 'No messages yet' });
    expect(previewOf(undefined)).toEqual({ text: 'No messages yet' });
  });

  /* The bug this replaces: `'text' in last ? last.text : typename with spaces`
     — so a list whose last message was a photo read "Whats App In Image
     Message". Nothing here may print a typename. */
  it('never prints a typename', () => {
    for (const typename of KINDS) {
      const preview = previewOf(lastOf(typename));
      expect(preview.text, typename).not.toContain(typename);
      expect(preview.text, typename).not.toMatch(/Message$/);
      expect(preview.text.length, typename).toBeGreaterThan(0);
    }
  });

  it('reads the words through the field each typename carries them in', () => {
    expect(previewOf(lastOf('WhatsAppInTextMessage'))).toEqual({ text: `${SENTINEL}-text` });
    expect(previewOf(lastOf('WhatsAppInImageMessage'))).toEqual({ icon: 'image', text: `${SENTINEL}-caption` });
    expect(previewOf(lastOf('WhatsAppOutDocumentMessage'))).toEqual({ icon: 'document', text: `${SENTINEL}-caption` });
    expect(previewOf(lastOf('WhatsAppOutTextAndButtonsMessage'))).toEqual({
      icon: 'buttons',
      text: `${SENTINEL}-body`,
    });
    expect(previewOf(lastOf('WhatsAppOutListMessage'))).toEqual({ icon: 'list', text: `${SENTINEL}-body` });
    expect(previewOf(lastOf('WhatsAppOutTemplateMessage'))).toEqual({ icon: 'template', text: `${SENTINEL}-tpl-body` });
    expect(previewOf(lastOf('WhatsAppInListRowClickMessage'))).toEqual({ icon: 'tap', text: `${SENTINEL}-row` });
    expect(previewOf(lastOf('WhatsAppInContinueFlowButtonClickMessage'))).toEqual({
      icon: 'tap',
      text: `${SENTINEL}-button`,
    });
    expect(previewOf(lastOf('WebWidgetOpenURLButtonClickMessage'))).toEqual({
      icon: 'tap',
      text: `${SENTINEL}-tapped`,
    });
    expect(previewOf(lastOf('WebWidgetTextAndButtonsMessage'))).toEqual({ icon: 'buttons', text: `${SENTINEL}-text` });
    expect(previewOf(lastOf('InstagramInReelCommentMessage'))).toEqual({ icon: 'comment', text: `${SENTINEL}-text` });
    expect(previewOf(lastOf('InstagramInStoryReplyMessage'))).toEqual({ icon: 'story', text: `${SENTINEL}-text` });
    expect(previewOf(lastOf('TikTokOutPublicCommentReplyMessage'))).toEqual({
      icon: 'comment',
      text: `${SENTINEL}-text`,
    });
  });

  it('falls back to the kind label with the shape glyph for media without a caption', () => {
    expect(previewOf(lastOf('WhatsAppInImageMessage', { caption: null }))).toEqual({ icon: 'image', text: 'Photo' });
    expect(previewOf(lastOf('WhatsAppInVideoMessage', { caption: '  ' }))).toEqual({ icon: 'video', text: 'Video' });
    /* These select no words at all in the projection. */
    expect(previewOf(lastOf('InstagramInImageMessage'))).toEqual({ icon: 'image', text: 'Photo' });
    expect(previewOf(lastOf('FacebookInAudioMessage'))).toEqual({ icon: 'audio', text: 'Voice message' });
    expect(previewOf(lastOf('WebWidgetAttachmentMessage'))).toEqual({ icon: 'image', text: 'Attachment' });
    expect(previewOf(lastOf('WhatsAppOutTemplateMessage', { body: null }))).toEqual({
      icon: 'template',
      text: 'Template message',
    });
    expect(previewOf(lastOf('WhatsAppInMediaPlaceholderMessage'))).toEqual({
      icon: 'placeholder',
      text: 'Media WhatsApp withheld',
    });
    expect(previewOf(lastOf('SystemLivechatOpenedManuallyMessage'))).toEqual({
      icon: 'system',
      text: 'An operator opened the live chat',
    });
  });

  it('survives a typename the build has never seen', () => {
    expect(previewOf(lastOf('WhatsAppInLocationMessage'))).toEqual({ icon: 'unknown', text: 'Location' });
  });
});

describe('previewStatus', () => {
  it('reads the outbound status through each platform prefix', () => {
    expect(previewStatus(lastOf('WhatsAppOutTextMessage'))).toBe('delivered');
    expect(previewStatus(lastOf('WhatsAppOutTemplateMessage'))).toBe('delivered');
    expect(previewStatus(lastOf('InstagramOutImageMessage'))).toBe('read');
    expect(previewStatus(lastOf('FacebookOutPublicCommentReplyMessage'))).toBe('sent');
    expect(previewStatus(lastOf('TikTokOutTextMessage'))).toBe('sending');
  });

  /* Widget typenames carry `status` in both directions and no In/Out prefix;
     the sender is what says whose message it is, and the contact's own
     message must not carry a tick. */
  it('shows nothing for the contact, whatever the platform calls its status field', () => {
    expect(previewStatus(lastOf('WebWidgetTextMessage', { sender: { __typename: 'AdminMessageSender' } }))).toBe(
      'read',
    );
    expect(
      previewStatus(lastOf('WebWidgetTextMessage', { sender: { __typename: 'ContactMessageSender' } })),
    ).toBeUndefined();
    expect(previewStatus(lastOf('WhatsAppInTextMessage'))).toBeUndefined();
    expect(previewStatus(null)).toBeUndefined();
  });

  it('shows nothing for an outbound type with no status field', () => {
    expect(previewStatus(lastOf('WhatsAppOutUnknownMessage'))).toBeUndefined();
    expect(
      previewStatus(lastOf('SystemConversationSummaryMessage', { sender: { __typename: 'AutomationMessageSender' } })),
    ).toBeUndefined();
  });
});
