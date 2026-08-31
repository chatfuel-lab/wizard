import { describe, expect, it } from 'vitest';
import {
  AudioTranscriptionStatus,
  FacebookMessageStatus,
  FileStatus,
  InstagramMessageStatus,
  MessageErrorCode,
  TikTokMessageStatus,
  WebWidgetMessageStatus,
  WhatsAppMessageStatus,
} from '~api/generated/livechat/graphql';
import type { LastMessageNode, MessageNode } from '../types';
import { MESSAGE_KINDS } from './messageKinds';
import { NO_PAYLOAD_SHAPES, PAYLOAD_ON_WIRE, deliveryStatus, platformStatus, readPayload } from './messagePayload';

const SENTINEL = 'SENTINEL';

/**
 * A node carrying EVERY payload field any concrete Message type has, all set to
 * a value that cannot occur by accident.
 *
 * That is the point of the sweep below: a typename whose payload this module's
 * operations document does not select must not surface one of these, however
 * the field happens to be spelled. The generated type would reject reading
 * `node.bodyText` — but only while the reader goes through the typename. An
 * `in` check, a cast, or an interface-level access all compile, and all of them
 * quietly pick up a field that does not exist on the wire.
 */
const file = {
  __typename: 'File',
  id: 'f1',
  url: `${SENTINEL}-url`,
  type: 'image',
  status: FileStatus.Downloaded,
  size: 1_234_567,
};

const media = {
  __typename: 'InstagramReel',
  isUnknown: false,
  caption: `${SENTINEL}-media-caption`,
  ownerUsername: `${SENTINEL}-owner`,
  url: `${SENTINEL}-media-url`,
  thumbnailPreview: { ...file, url: `${SENTINEL}-thumb` },
};

const nodeOf = (typename: string, over: Record<string, unknown> = {}): MessageNode =>
  ({
    __typename: typename,
    id: 'm1',
    clientId: 'c1',
    sentTime: '2026-08-13T12:00:00.000Z',
    updatedAt: '2026-08-13T12:00:00.000Z',
    sender: { __typename: 'ContactMessageSender', id: 's1', name: 'Maria', profilePicture: null },
    errors: [],
    // Strings
    text: `${SENTINEL}-text`,
    summary: `${SENTINEL}-summary`,
    caption: `${SENTINEL}-caption`,
    bodyText: `${SENTINEL}-body`,
    headerText: `${SENTINEL}-header`,
    footerText: `${SENTINEL}-footer`,
    buttonTitle: `${SENTINEL}-button`,
    rowTitle: `${SENTINEL}-row`,
    rowDescription: `${SENTINEL}-row-description`,
    fileName: `${SENTINEL}-filename`,
    delay: `${SENTINEL}-delay`,
    commentID: `${SENTINEL}-comment-id`,
    until: '2026-08-13T12:01:00.000Z',
    // Files and media
    file,
    attachment: { __typename: 'WebWidgetAttachment', type: 'image', file },
    transcriptionStatus: AudioTranscriptionStatus.Finished,
    transcribedText: `${SENTINEL}-transcript`,
    mediaContainer: { __typename: 'InstagramMediaContainer', id: 'mc1', media },
    post: { __typename: 'TikTokPost', id: 'p1', isUnknown: false, url: `${SENTINEL}-post-url` },
    // Buttons, rows, template parts
    whatsappButtons: [
      { __typename: 'WhatsAppContinueFlowMessageButton', title: `${SENTINEL}-wa-reply` },
      { __typename: 'WhatsAppOpenURLMessageButton', title: `${SENTINEL}-wa-link`, url: `${SENTINEL}-wa-url` },
    ],
    buttons: [
      { __typename: 'WebWidgetContinueFlowButton', title: `${SENTINEL}-w-reply` },
      { __typename: 'WebWidgetOpenURLButton', title: `${SENTINEL}-w-link`, url: `${SENTINEL}-w-url` },
      { __typename: 'WebWidgetCallPhoneButton', title: `${SENTINEL}-w-call`, phone: `${SENTINEL}-w-phone` },
    ],
    button: {
      __typename: 'WebWidgetOpenURLButton',
      title: `${SENTINEL}-tapped`,
      url: `${SENTINEL}-tapped-url`,
      phone: `${SENTINEL}-tapped-phone`,
    },
    listRows: [
      { __typename: 'WhatsAppMessageListRow', title: `${SENTINEL}-row-1`, description: `${SENTINEL}-row-1-d` },
      { __typename: 'WhatsAppMessageListRow', title: `${SENTINEL}-row-2`, description: null },
    ],
    header: { __typename: 'WhatsAppOutTemplateMessageComponentText', text: `${SENTINEL}-tpl-header` },
    body: { __typename: 'WhatsAppOutTemplateMessageComponentText', text: `${SENTINEL}-tpl-body` },
    footer: { __typename: 'WhatsAppOutTemplateMessageComponentText', text: `${SENTINEL}-tpl-footer` },
    waTemplateButtons: [
      { __typename: 'WhatsAppOutTemplateMessageURLButton', text: `${SENTINEL}-tpl-url`, url: `${SENTINEL}-tpl-href` },
      { __typename: 'WhatsAppOutTemplateMessageQuickReplyButton', text: `${SENTINEL}-tpl-reply` },
      {
        __typename: 'WhatsAppOutTemplateMessageCallPhoneButton',
        text: `${SENTINEL}-tpl-call`,
        phoneNumber: `${SENTINEL}-tpl-phone`,
      },
      { __typename: 'WhatsAppOutTemplateMessageWhatsAppCallButton', text: `${SENTINEL}-tpl-wacall` },
      {
        __typename: 'WhatsAppOutTemplateMessageCopyCodeButton',
        text: `${SENTINEL}-tpl-copy`,
        code: `${SENTINEL}-tpl-code`,
      },
    ],
    // System
    byUser: { __typename: 'PublicUserAccount', id: 'u1', name: `${SENTINEL}-operator`, isUnknown: false },
    originallyDecidedByAI: true,
    // Delivery, one valid member per platform
    whatsappStatus: WhatsAppMessageStatus.Sent,
    status: WebWidgetMessageStatus.Unseen,
    instagramStatus: InstagramMessageStatus.Sent,
    facebookStatus: FacebookMessageStatus.Sent,
    tiktokStatus: TikTokMessageStatus.Sent,
    ...over,
  }) as unknown as MessageNode;

const surfacesPayload = (typename: string): boolean => JSON.stringify(readPayload(nodeOf(typename))).includes(SENTINEL);

const KINDS = Object.keys(MESSAGE_KINDS) as (keyof typeof MESSAGE_KINDS)[];

/**
 * The one typename that reads a field and cannot surface a string: its
 * payload is a Boolean. It is in PAYLOAD_ON_WIRE, and it is checked on its
 * own below by flipping the flag.
 */
const READS_ONLY_A_FLAG = new Set<string>(['SystemLivechatOpenedByComponentMessage']);

describe('readPayload coverage', () => {
  /* Everything in PAYLOAD_ON_WIRE reads a field, and NOTHING outside it reads a
     field — the two halves of the same claim, checked against the real
     function rather than against a second hand-written list. */
  it('surfaces content for exactly the typenames whose payload is on the wire', () => {
    const surfacing = KINDS.filter(surfacesPayload);
    const expected = PAYLOAD_ON_WIRE.filter((typename) => !READS_ONLY_A_FLAG.has(typename));
    expect(surfacing.sort()).toEqual([...expected].sort());
  });

  /* The matrix. Every bubble typename in the kinds table renders as something
     other than a chip, except the five Placeholder / Unknown types whose
     payload the schema does not model. A new typename lands here first: the
     kinds table names it, and this test says its bubble is missing. */
  it('renders every bubble typename except placeholder and unknown', () => {
    for (const typename of KINDS) {
      const kind = MESSAGE_KINDS[typename];
      if (kind.row !== 'bubble') continue;
      const payload = readPayload(nodeOf(typename));
      if (NO_PAYLOAD_SHAPES.has(kind.shape)) {
        expect(payload, typename).toEqual({ kind: 'described', shape: kind.shape, label: kind.label });
      } else {
        expect(payload.kind, typename).not.toBe('described');
        expect(payload.kind, typename).not.toBe('skip');
        expect(payload.kind, typename).not.toBe('system');
      }
    }
  });

  it('describes every other typename instead of showing its typename', () => {
    for (const typename of KINDS) {
      if (PAYLOAD_ON_WIRE.includes(typename)) continue;
      const payload = readPayload(nodeOf(typename));
      expect(payload.kind, typename).not.toBe('text');
      if (payload.kind === 'described') {
        expect(payload.label, typename).toBe(MESSAGE_KINDS[typename].label);
        expect(payload.label, typename).not.toContain(typename);
      }
    }
  });

  it('keeps SystemTypingMessage out of the thread entirely', () => {
    expect(readPayload(nodeOf('SystemTypingMessage'))).toEqual({ kind: 'skip' });
  });

  it('turns the other System types into a line, not a bubble', () => {
    expect(readPayload(nodeOf('SystemLivechatOpenedByBooking'))).toEqual({
      kind: 'system',
      text: 'A booking opened the live chat',
    });
  });

  it('reads the AI summary itself rather than a label', () => {
    expect(readPayload(nodeOf('SystemConversationSummaryMessage'))).toEqual({
      kind: 'system',
      text: `${SENTINEL}-summary`,
    });
  });

  it('survives a typename the build has never seen', () => {
    const payload = readPayload(nodeOf('WhatsAppInLocationMessage'));
    expect(payload).toEqual({ kind: 'described', shape: 'unknown', label: 'Location' });
  });
});

describe('readPayload system lines', () => {
  it('names the operator who opened the chat, unless the account is gone', () => {
    expect(readPayload(nodeOf('SystemLivechatOpenedManuallyMessage'))).toEqual({
      kind: 'system',
      text: `${SENTINEL}-operator opened the live chat`,
    });
    const gone = nodeOf('SystemLivechatOpenedManuallyMessage', {
      byUser: { __typename: 'PublicUserAccount', id: 'u1', name: '', isUnknown: true },
    });
    expect(readPayload(gone)).toEqual({ kind: 'system', text: 'An operator opened the live chat' });
  });

  it('says how long the auto-close took, in words', () => {
    expect(readPayload(nodeOf('SystemLivechatClosedByAutoClosingMessage', { delay: '24h:00m:00s' }))).toEqual({
      kind: 'system',
      text: 'The live chat closed automatically after 24 hours',
    });
    expect(readPayload(nodeOf('SystemLivechatClosedByAutoClosingMessage', { delay: '1h23m' }))).toEqual({
      kind: 'system',
      text: 'The live chat closed automatically after 1 hour 23 minutes',
    });
    expect(readPayload(nodeOf('SystemLivechatClosedByAutoClosingMessage', { delay: '' }))).toEqual({
      kind: 'system',
      text: 'The live chat closed automatically',
    });
  });

  it('credits the AI with the hand-over when the flag says so', () => {
    expect(readPayload(nodeOf('SystemLivechatOpenedByComponentMessage'))).toEqual({
      kind: 'system',
      text: 'The AI handed this chat to an operator',
    });
    expect(readPayload(nodeOf('SystemLivechatOpenedByComponentMessage', { originallyDecidedByAI: false }))).toEqual({
      kind: 'system',
      text: 'The automation handed this chat to an operator',
    });
  });
});

describe('readPayload media', () => {
  it('carries the caption on an inbound WhatsApp image', () => {
    expect(readPayload(nodeOf('WhatsAppInImageMessage'))).toEqual({
      kind: 'image',
      url: `${SENTINEL}-url`,
      caption: `${SENTINEL}-caption`,
      label: 'Photo',
    });
  });

  /* The document now selects `caption` on the outbound image too. */
  it('carries the caption on the outbound one as well', () => {
    expect(readPayload(nodeOf('WhatsAppOutImageMessage'))).toEqual({
      kind: 'image',
      url: `${SENTINEL}-url`,
      caption: `${SENTINEL}-caption`,
      label: 'Photo',
    });
  });

  /* Instagram, Facebook and TikTok images carry no caption in the schema, and
     the widget's attachment is one level down under `attachment.file`. */
  it('reads an image on every platform', () => {
    for (const typename of [
      'InstagramInImageMessage',
      'InstagramOutImageMessage',
      'FacebookInImageMessage',
      'FacebookOutImageMessage',
      'TikTokInImageMessage',
      'TikTokOutImageMessage',
      'WebWidgetAttachmentMessage',
    ] as const) {
      expect(readPayload(nodeOf(typename)), typename).toEqual({
        kind: 'image',
        url: `${SENTINEL}-url`,
        caption: null,
        label: MESSAGE_KINDS[typename].label,
      });
    }
  });

  it('reads a video with its caption where WhatsApp sends one', () => {
    expect(readPayload(nodeOf('WhatsAppInVideoMessage'))).toEqual({
      kind: 'video',
      url: `${SENTINEL}-url`,
      caption: `${SENTINEL}-caption`,
      label: 'Video',
    });
    for (const typename of [
      'WhatsAppOutVideoMessage',
      'InstagramInVideoMessage',
      'InstagramOutVideoMessage',
      'FacebookInVideoMessage',
      'FacebookOutVideoMessage',
    ] as const) {
      expect(readPayload(nodeOf(typename)), typename).toMatchObject({ kind: 'video', url: `${SENTINEL}-url` });
    }
  });

  /* The tile that stands in for an expired file says "Photo" / "Voice message",
     and those words come from the kinds table rather than from a second copy
     inside a component no node-only test can render. */
  it('takes the media label from the kinds table', () => {
    for (const typename of [
      'WhatsAppInImageMessage',
      'WhatsAppOutVideoMessage',
      'WhatsAppInAudioMessage',
      'FacebookInFileMessage',
    ] as const) {
      const payload = readPayload(nodeOf(typename));
      expect(payload, typename).toMatchObject({ label: MESSAGE_KINDS[typename].label });
    }
  });

  /* "deleted because it expired, or never existed" — and the URL is still a
     non-null string, so an <img> pointed at it draws a broken-image glyph. */
  it('treats an expired file as no file at all, on every media kind', () => {
    const expired = { file: { ...file, status: FileStatus.Expired } };
    expect(readPayload(nodeOf('WhatsAppInImageMessage', expired))).toMatchObject({ kind: 'image', url: null });
    expect(readPayload(nodeOf('InstagramInVideoMessage', expired))).toMatchObject({ kind: 'video', url: null });
    expect(readPayload(nodeOf('FacebookOutAudioMessage', expired))).toMatchObject({ kind: 'audio', url: null });
    expect(readPayload(nodeOf('WhatsAppOutDocumentMessage', expired))).toMatchObject({
      kind: 'document',
      url: null,
      size: null,
    });
    const widget = nodeOf('WebWidgetAttachmentMessage', {
      attachment: { __typename: 'WebWidgetAttachment', type: 'image', file: expired.file },
    });
    expect(readPayload(widget)).toMatchObject({ kind: 'image', url: null });
  });

  it('shows a transcript only once transcription finished, on every platform that transcribes', () => {
    for (const typename of ['WhatsAppInAudioMessage', 'InstagramInAudioMessage', 'FacebookInAudioMessage'] as const) {
      expect(readPayload(nodeOf(typename)), typename).toMatchObject({
        kind: 'audio',
        transcript: `${SENTINEL}-transcript`,
      });
      for (const status of [
        AudioTranscriptionStatus.None,
        AudioTranscriptionStatus.Failed,
        AudioTranscriptionStatus.Skipped,
      ]) {
        const node = nodeOf(typename, { transcriptionStatus: status });
        expect(readPayload(node), `${typename} ${status}`).toMatchObject({ transcript: null });
      }
    }
  });

  /* Outbound voice notes have no transcription fields in the schema. */
  it('never invents a transcript on an outbound voice note', () => {
    for (const typename of [
      'WhatsAppOutAudioMessage',
      'InstagramOutAudioMessage',
      'FacebookOutAudioMessage',
    ] as const) {
      expect(readPayload(nodeOf(typename)), typename).toEqual({
        kind: 'audio',
        url: `${SENTINEL}-url`,
        transcript: null,
        label: 'Voice message',
      });
    }
  });

  /* `transcribedText` is String!, so "not transcribed" is the empty string and
     an unfinished transcription is indistinguishable from a silent recording
     without the status field. */
  it('treats a blank finished transcript as none', () => {
    const node = nodeOf('WhatsAppInAudioMessage', { transcribedText: '   ' });
    expect(readPayload(node)).toMatchObject({ transcript: null });
  });

  it('names a document by its file name and sizes it from the bytes', () => {
    expect(readPayload(nodeOf('WhatsAppInDocumentMessage'))).toEqual({
      kind: 'document',
      url: `${SENTINEL}-url`,
      name: `${SENTINEL}-filename`,
      size: '1.2 MB',
      caption: `${SENTINEL}-caption`,
      label: 'Document',
    });
  });

  /* `fileName` is nullable on WhatsApp and absent from Facebook's schema;
     `File.size` is nullable everywhere. */
  it('falls back to the label for a nameless document and prints no size for a sizeless one', () => {
    expect(readPayload(nodeOf('WhatsAppOutDocumentMessage', { fileName: null }))).toMatchObject({
      name: 'Document',
    });
    expect(readPayload(nodeOf('WhatsAppOutDocumentMessage', { fileName: '  ' }))).toMatchObject({
      name: 'Document',
    });
    expect(readPayload(nodeOf('FacebookInFileMessage'))).toEqual({
      kind: 'document',
      url: `${SENTINEL}-url`,
      name: 'File',
      size: '1.2 MB',
      caption: null,
      label: 'File',
    });
    expect(readPayload(nodeOf('WhatsAppInDocumentMessage', { file: { ...file, size: null } }))).toMatchObject({
      size: null,
    });
    expect(readPayload(nodeOf('WhatsAppInDocumentMessage', { file: { ...file, size: 0 } }))).toMatchObject({
      size: '0 B',
    });
  });
});

describe('readPayload buttons, lists and templates', () => {
  it('reads WhatsApp header/body/footer and turns the buttons into actions', () => {
    for (const typename of ['WhatsAppOutTextAndButtonsMessage', 'WhatsAppOutTextAndURLMessage'] as const) {
      expect(readPayload(nodeOf(typename)), typename).toEqual({
        kind: 'buttons',
        header: `${SENTINEL}-header`,
        body: `${SENTINEL}-body`,
        footer: `${SENTINEL}-footer`,
        actions: [{ title: `${SENTINEL}-wa-reply` }, { title: `${SENTINEL}-wa-link`, href: `${SENTINEL}-wa-url` }],
      });
    }
    /* Header and footer are nullable, and an empty string is no header. */
    expect(readPayload(nodeOf('WhatsAppOutTextAndButtonsMessage', { headerText: null, footerText: '' }))).toMatchObject(
      { header: null, footer: null },
    );
  });

  it('reads widget buttons, links and phone buttons', () => {
    expect(readPayload(nodeOf('WebWidgetTextAndButtonsMessage'))).toEqual({
      kind: 'buttons',
      header: null,
      body: `${SENTINEL}-text`,
      footer: null,
      actions: [
        { title: `${SENTINEL}-w-reply` },
        { title: `${SENTINEL}-w-link`, href: `${SENTINEL}-w-url` },
        { title: `${SENTINEL}-w-call`, phone: `${SENTINEL}-w-phone` },
      ],
    });
  });

  it('reads a list as body, the opener button and rows', () => {
    expect(readPayload(nodeOf('WhatsAppOutListMessage'))).toEqual({
      kind: 'list',
      body: `${SENTINEL}-body`,
      buttonTitle: `${SENTINEL}-button`,
      actions: [
        { kind: 'row', title: `${SENTINEL}-row-1`, description: `${SENTINEL}-row-1-d` },
        { kind: 'row', title: `${SENTINEL}-row-2`, description: undefined },
      ],
    });
  });

  it('reads a rendered template — header, body, footer and every button kind', () => {
    expect(readPayload(nodeOf('WhatsAppOutTemplateMessage'))).toEqual({
      kind: 'template',
      header: { kind: 'text', text: `${SENTINEL}-tpl-header` },
      body: `${SENTINEL}-tpl-body`,
      footer: `${SENTINEL}-tpl-footer`,
      actions: [
        { title: `${SENTINEL}-tpl-url`, href: `${SENTINEL}-tpl-href` },
        { title: `${SENTINEL}-tpl-reply` },
        { title: `${SENTINEL}-tpl-call`, phone: `${SENTINEL}-tpl-phone` },
        { title: `${SENTINEL}-tpl-wacall` },
        { title: `${SENTINEL}-tpl-copy · ${SENTINEL}-tpl-code` },
      ],
    });
  });

  it('reads a media template header through its typename, and an expired file as none', () => {
    const doc = nodeOf('WhatsAppOutTemplateMessage', {
      header: { __typename: 'WhatsAppOutTemplateMessageComponentDocument', file, fileName: 'receipt.pdf' },
      footer: null,
      waTemplateButtons: [],
    });
    expect(readPayload(doc)).toMatchObject({
      header: { kind: 'document', url: `${SENTINEL}-url`, name: 'receipt.pdf' },
      footer: null,
      actions: [],
    });
    const image = nodeOf('WhatsAppOutTemplateMessage', {
      header: { __typename: 'WhatsAppOutTemplateMessageComponentImage', file: { ...file, status: FileStatus.Expired } },
    });
    expect(readPayload(image)).toMatchObject({ header: { kind: 'image', url: null, name: null } });
    const video = nodeOf('WhatsAppOutTemplateMessage', {
      header: { __typename: 'WhatsAppOutTemplateMessageComponentVideo', file: null },
    });
    expect(readPayload(video)).toMatchObject({ header: { kind: 'video', url: null, name: null } });
    expect(readPayload(nodeOf('WhatsAppOutTemplateMessage', { header: null, body: null }))).toMatchObject({
      header: null,
      body: null,
    });
  });
});

describe('readPayload comments and taps', () => {
  it('reads an Instagram comment with the media it was left on', () => {
    for (const typename of [
      'InstagramInFeedCommentMessage',
      'InstagramInReelCommentMessage',
      'InstagramInAdCommentMessage',
      'InstagramInStoryReplyMessage',
    ] as const) {
      expect(readPayload(nodeOf(typename)), typename).toEqual({
        kind: 'comment',
        text: `${SENTINEL}-text`,
        source: {
          kind: 'reel',
          owner: `${SENTINEL}-owner`,
          caption: `${SENTINEL}-media-caption`,
          url: `${SENTINEL}-media-url`,
          thumbnailUrl: `${SENTINEL}-thumb`,
        },
        label: MESSAGE_KINDS[typename].label,
      });
    }
  });

  /* The kind comes from the media's typename, not the message's: a "feed
     comment" whose container holds a story is a story. */
  it('takes the source kind from the media typename', () => {
    for (const [typename, kind] of [
      ['InstagramPost', 'post'],
      ['InstagramReel', 'reel'],
      ['InstagramAd', 'ad'],
      ['InstagramStory', 'story'],
    ] as const) {
      const node = nodeOf('InstagramInFeedCommentMessage', {
        mediaContainer: { __typename: 'InstagramMediaContainer', id: 'mc1', media: { ...media, __typename: typename } },
      });
      expect(readPayload(node), typename).toMatchObject({ source: { kind } });
    }
  });

  /* "treat this post as unknown, render a placeholder and ignore all the other
     fields" — the schema's own instruction. */
  it('reads nothing past isUnknown', () => {
    const node = nodeOf('InstagramInReelCommentMessage', {
      mediaContainer: { __typename: 'InstagramMediaContainer', id: 'mc1', media: { ...media, isUnknown: true } },
    });
    expect(readPayload(node)).toMatchObject({
      source: { kind: 'unknown', owner: null, caption: null, url: null, thumbnailUrl: null },
    });
    const tiktok = nodeOf('TikTokInTextPostCommentMessage', {
      post: { __typename: 'TikTokPost', id: 'p1', isUnknown: true, url: `${SENTINEL}-post-url` },
    });
    expect(readPayload(tiktok)).toMatchObject({ source: { kind: 'unknown', url: null } });
  });

  it('reads a Facebook comment as a bare post and a TikTok one with its URL', () => {
    expect(readPayload(nodeOf('FacebookInPostCommentMessage'))).toEqual({
      kind: 'comment',
      text: `${SENTINEL}-text`,
      source: { kind: 'post', owner: null, caption: null, url: null, thumbnailUrl: null },
      label: 'Comment on a post',
    });
    expect(readPayload(nodeOf('TikTokInTextPostCommentMessage'))).toMatchObject({
      kind: 'comment',
      source: { kind: 'post', url: `${SENTINEL}-post-url` },
    });
  });

  it('reads an outgoing public reply as a comment with no source', () => {
    for (const typename of [
      'InstagramOutPublicCommentReplyMessage',
      'FacebookOutPublicCommentReplyMessage',
      'TikTokOutPublicCommentReplyMessage',
    ] as const) {
      expect(readPayload(nodeOf(typename)), typename).toEqual({
        kind: 'comment',
        text: `${SENTINEL}-text`,
        source: null,
        label: 'Public reply to a comment',
      });
    }
  });

  it('reads what the contact tapped', () => {
    expect(readPayload(nodeOf('WhatsAppInContinueFlowButtonClickMessage'))).toEqual({
      kind: 'tap',
      title: `${SENTINEL}-button`,
      description: null,
    });
    expect(readPayload(nodeOf('WhatsAppInTemplateQuickReplyButtonClickMessage'))).toMatchObject({
      kind: 'tap',
      title: `${SENTINEL}-button`,
    });
    expect(readPayload(nodeOf('WhatsAppInListRowClickMessage'))).toEqual({
      kind: 'tap',
      title: `${SENTINEL}-row`,
      description: `${SENTINEL}-row-description`,
    });
    expect(readPayload(nodeOf('WebWidgetContinueFlowButtonClickMessage'))).toEqual({
      kind: 'tap',
      title: `${SENTINEL}-tapped`,
      description: null,
    });
    expect(readPayload(nodeOf('WebWidgetOpenURLButtonClickMessage'))).toEqual({
      kind: 'tap',
      title: `${SENTINEL}-tapped`,
      description: `${SENTINEL}-tapped-url`,
    });
    expect(readPayload(nodeOf('WebWidgetCallPhoneButtonClickMessage'))).toEqual({
      kind: 'tap',
      title: `${SENTINEL}-tapped`,
      description: `${SENTINEL}-tapped-phone`,
    });
  });
});

/** Every outbound bubble typename that carries a status field. */
const OUT_WITH_STATUS = KINDS.filter((typename) => {
  const kind = MESSAGE_KINDS[typename];
  if (kind.row !== 'bubble' || NO_PAYLOAD_SHAPES.has(kind.shape)) return false;
  return kind.platform === 'widget' || typename.includes('Out');
});

describe('deliveryStatus', () => {
  it('maps every WhatsApp status onto a glyph', () => {
    const seen = Object.values(WhatsAppMessageStatus).map((whatsappStatus) =>
      deliveryStatus(nodeOf('WhatsAppOutTextMessage', { whatsappStatus })),
    );
    expect(seen).toEqual(['delivered', 'failed', 'read', 'sending', 'sent']);
  });

  /* The regression this replaces. `WebWidgetMessageStatus` is Seen | Unseen |
     Sending, and the old reading lower-cased it and asked whether the string
     CONTAINED "seen" — so `Unseen` matched, and every undelivered widget
     message in the product rendered with the accent-coloured read receipt. */
  it('does not read Unseen as read', () => {
    expect(deliveryStatus(nodeOf('WebWidgetTextMessage', { status: WebWidgetMessageStatus.Unseen }))).toBe('sent');
    expect(deliveryStatus(nodeOf('WebWidgetTextMessage', { status: WebWidgetMessageStatus.Seen }))).toBe('read');
  });

  /* And `Sending` matched none of the substrings, so it fell through to the
     default 'sent' and an in-flight message showed a completed tick. */
  it('shows a message still on its way as sending, on every platform', () => {
    for (const [typename, status] of [
      ['WebWidgetTextMessage', { status: WebWidgetMessageStatus.Sending }],
      ['WhatsAppOutTextMessage', { whatsappStatus: WhatsAppMessageStatus.Sending }],
      ['InstagramOutTextMessage', { instagramStatus: InstagramMessageStatus.Sending }],
      ['FacebookOutTextMessage', { facebookStatus: FacebookMessageStatus.Sending }],
      ['TikTokOutTextMessage', { tiktokStatus: TikTokMessageStatus.Sending }],
    ] as const) {
      expect(deliveryStatus(nodeOf(typename, status)), typename).toBe('sending');
    }
  });

  /* Platform limits arrive on the message through messageUpdated, and several
     of them leave the status field sitting at Sent while doing it. */
  it('lets an error outrank the status', () => {
    const node = nodeOf('WhatsAppOutTextMessage', {
      whatsappStatus: WhatsAppMessageStatus.Sent,
      errors: [{ code: MessageErrorCode.WhatsAppOutMoreThan24hPassed, date: '', originalErrMessage: null }],
    });
    expect(deliveryStatus(node)).toBe('failed');
  });

  /* Instagram, Facebook and TikTok have no Delivered: one tick, then read. */
  it('maps the four-member enums of the other three platforms totally', () => {
    const ig = Object.values(InstagramMessageStatus).map((instagramStatus) =>
      deliveryStatus(nodeOf('InstagramOutImageMessage', { instagramStatus })),
    );
    expect(ig).toEqual(['failed', 'read', 'sending', 'sent']);
    const fb = Object.values(FacebookMessageStatus).map((facebookStatus) =>
      deliveryStatus(nodeOf('FacebookOutPublicCommentReplyMessage', { facebookStatus })),
    );
    expect(fb).toEqual(['failed', 'read', 'sending', 'sent']);
    const tt = Object.values(TikTokMessageStatus).map((tiktokStatus) =>
      deliveryStatus(nodeOf('TikTokOutTextMessage', { tiktokStatus })),
    );
    expect(tt).toEqual(['failed', 'read', 'sending', 'sent']);
  });

  /* The inversion of the old "says nothing for a typename whose status field
     is not selected": every outbound type on every platform now selects it,
     so every one answers. The list is derived from the kinds table so a new
     outbound typename shows up here the moment it is added. */
  it('reads a status for every outbound bubble type of every platform', () => {
    /* 9 WhatsApp Out + 6 widget + 5 Instagram + 5 Facebook + 3 TikTok. */
    expect(OUT_WITH_STATUS.length).toBe(28);
    for (const typename of OUT_WITH_STATUS) {
      expect(deliveryStatus(nodeOf(typename)), typename).toBeDefined();
    }
  });

  /* The five types with no payload at all have no status field either. */
  it('says nothing for the placeholder and unknown outbound types', () => {
    for (const typename of [
      'WhatsAppOutMediaPlaceholderMessage',
      'WhatsAppOutUnknownMessage',
      'InstagramOutUnknownMessage',
      'FacebookOutUnknownMessage',
      'TikTokOutUnknownMessage',
    ]) {
      expect(deliveryStatus(nodeOf(typename)), typename).toBeUndefined();
    }
  });

  it('reads the widget attachment status through its own field name', () => {
    const node = nodeOf('WebWidgetAttachmentMessage', { status: WebWidgetMessageStatus.Seen });
    expect(deliveryStatus(node)).toBe('read');
  });

  /* The list row's `lastMessage` is a slimmer projection of the same
     typenames — no errors, no sender — and reads through the same switch. */
  it('reads the same status off the chat list preview projection', () => {
    const preview = {
      __typename: 'InstagramOutTextMessage',
      id: 'm1',
      sentTime: '2026-08-13T12:00:00.000Z',
      text: 'hi',
      instagramStatus: InstagramMessageStatus.Read,
    } as unknown as LastMessageNode;
    expect(platformStatus(preview)).toBe('read');
    const inbound = {
      __typename: 'WhatsAppInTextMessage',
      id: 'm2',
      sentTime: '',
      text: 'x',
    } as unknown as LastMessageNode;
    expect(platformStatus(inbound)).toBeUndefined();
  });
});
