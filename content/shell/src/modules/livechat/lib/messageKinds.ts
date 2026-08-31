import type { MessageNode } from '../types';

/**
 * Every concrete `Message` typename the schema can put in a thread, and what
 * the thread is supposed to do with it.
 *
 * `Message` is an interface with 73 implementers across five platforms plus a
 * System pseudo-platform. Until now four bubble types covered thirteen of them
 * and the other sixty fell through to a component that printed a de-camel-cased
 * `__typename` followed by "(not rendered yet)" — so an operator reading a
 * WhatsApp thread saw the literal words "Out list (not rendered yet)" where the
 * message should be, and had no way to tell a document from a template from a
 * media failure.
 *
 * This table is the whole vocabulary. It is typed
 * `Record<MessageNode['__typename'], MessageKind>`, which is the point: the
 * union comes from codegen, so the day the schema grows a typename the compiler
 * names the missing entry instead of the UI quietly falling back. `tsc` cannot
 * be talked out of it and neither can the coverage test beside it.
 *
 * What it deliberately does NOT do is read fields. Payload field names are
 * disambiguated by PLATFORM PREFIX — the WhatsApp types spell delivery state
 * `whatsappStatus`, the widget types spell it `status`, Instagram/Facebook/
 * TikTok spell it `instagramStatus`/`facebookStatus`/`tiktokStatus` — so no
 * field may be read except through a check on the concrete typename. That work
 * is `messagePayload.ts`; this file is the labels it leans on.
 */

/** The channel a message arrived on. `system` is Chatfuel's own bookkeeping. */
export type MessagePlatform = 'whatsapp' | 'widget' | 'instagram' | 'facebook' | 'tiktok' | 'system';

/**
 * What sort of thing the message is, independent of platform.
 *
 * Coarser than the typename on purpose: `WhatsAppInImageMessage`,
 * `InstagramOutImageMessage` and `TikTokInImageMessage` are one thing to a
 * reader, and the only reason the schema spells them three ways is that their
 * payload fields differ.
 */
export type MessageShape =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  /** Text carrying buttons — reply buttons, a URL button. */
  | 'buttons'
  | 'list'
  | 'template'
  /** Arrived on a public surface: a post, a reel, an ad, or a reply to one. */
  | 'comment'
  | 'story'
  /** The contact tapped something rather than writing. */
  | 'tap'
  /** The platform said media exists but never delivered it. */
  | 'placeholder'
  /** The platform sent something this schema does not model. */
  | 'unknown'
  /** Not a bubble at all — a centred line about the conversation itself. */
  | 'system';

/** How the message occupies the thread. */
export type MessageRow =
  /** A bubble on the contact's side or the operator's. */
  | 'bubble'
  /** A centred `SystemLine`. */
  | 'system'
  /** Not a row. `SystemTypingMessage` only — see the note on MESSAGE_KINDS. */
  | 'skip';

export interface MessageKind {
  platform: MessagePlatform;
  row: MessageRow;
  shape: MessageShape;
  /**
   * For a `system` row: the sentence itself. For a bubble: what the reader is
   * told when the payload is not in this module's operations document.
   */
  label: string;
}

const bubble = (platform: MessagePlatform, shape: MessageShape, label: string): MessageKind => ({
  platform,
  row: 'bubble',
  shape,
  label,
});

const system = (label: string): MessageKind => ({
  platform: 'system',
  row: 'system',
  shape: 'system',
  label,
});

/* Written once and reused: five platforms each have an "the platform sent us
   something we have no model for" type, and the five sentences differing only
   by a proper noun is exactly the kind of drift a table invites. */
const unsupported = (platform: MessagePlatform, name: string): MessageKind =>
  bubble(platform, 'unknown', `Unsupported ${name} message`);

/**
 * The table.
 *
 * `SystemTypingMessage` is the one entry whose row is `'skip'`, and it is not a
 * rendering choice: a typing hint is transient state carrying an `until`
 * timestamp, not a message. `threadStore` already refuses to let it into the
 * message map (see `mergeNodes`), so a reader that also honours `'skip'` is
 * belt and braces — but the belt is what makes the rule visible to a test, and
 * the coverage test asserts this is the ONLY skipped typename so that a future
 * hand cannot quietly hide a second one behind it.
 */
export const MESSAGE_KINDS: Record<MessageNode['__typename'], MessageKind> = {
  // ── WhatsApp, inbound ─────────────────────────────────────────────────
  WhatsAppInTextMessage: bubble('whatsapp', 'text', 'Text'),
  WhatsAppInImageMessage: bubble('whatsapp', 'image', 'Photo'),
  WhatsAppInVideoMessage: bubble('whatsapp', 'video', 'Video'),
  WhatsAppInAudioMessage: bubble('whatsapp', 'audio', 'Voice message'),
  WhatsAppInDocumentMessage: bubble('whatsapp', 'document', 'Document'),
  WhatsAppInContinueFlowButtonClickMessage: bubble('whatsapp', 'tap', 'Tapped a button'),
  WhatsAppInTemplateQuickReplyButtonClickMessage: bubble('whatsapp', 'tap', 'Tapped a template button'),
  WhatsAppInListRowClickMessage: bubble('whatsapp', 'tap', 'Chose a list option'),
  WhatsAppInMediaPlaceholderMessage: bubble('whatsapp', 'placeholder', 'Media WhatsApp withheld'),
  WhatsAppInUnknownMessage: unsupported('whatsapp', 'WhatsApp'),

  // ── WhatsApp, outbound ────────────────────────────────────────────────
  WhatsAppOutTextMessage: bubble('whatsapp', 'text', 'Text'),
  WhatsAppOutImageMessage: bubble('whatsapp', 'image', 'Photo'),
  WhatsAppOutVideoMessage: bubble('whatsapp', 'video', 'Video'),
  WhatsAppOutAudioMessage: bubble('whatsapp', 'audio', 'Voice message'),
  WhatsAppOutDocumentMessage: bubble('whatsapp', 'document', 'Document'),
  WhatsAppOutTextAndButtonsMessage: bubble('whatsapp', 'buttons', 'Text with reply buttons'),
  WhatsAppOutTextAndURLMessage: bubble('whatsapp', 'buttons', 'Text with a link button'),
  WhatsAppOutListMessage: bubble('whatsapp', 'list', 'List message'),
  WhatsAppOutTemplateMessage: bubble('whatsapp', 'template', 'Template message'),
  WhatsAppOutMediaPlaceholderMessage: bubble('whatsapp', 'placeholder', 'Media WhatsApp withheld'),
  WhatsAppOutUnknownMessage: unsupported('whatsapp', 'WhatsApp'),

  // ── Web widget ────────────────────────────────────────────────────────
  /* No In/Out prefix anywhere on this platform: a widget message's direction
     lives on `sender.__typename` and nowhere else, which is why
     `lib/direction.ts` reads the sender for every platform rather than parsing
     the typename for the four that happen to spell it out. */
  WebWidgetTextMessage: bubble('widget', 'text', 'Text'),
  WebWidgetAttachmentMessage: bubble('widget', 'image', 'Attachment'),
  WebWidgetTextAndButtonsMessage: bubble('widget', 'buttons', 'Text with buttons'),
  WebWidgetContinueFlowButtonClickMessage: bubble('widget', 'tap', 'Tapped a button'),
  WebWidgetOpenURLButtonClickMessage: bubble('widget', 'tap', 'Tapped a link button'),
  WebWidgetCallPhoneButtonClickMessage: bubble('widget', 'tap', 'Tapped the call button'),

  // ── Instagram ─────────────────────────────────────────────────────────
  InstagramInTextMessage: bubble('instagram', 'text', 'Text'),
  InstagramInImageMessage: bubble('instagram', 'image', 'Photo'),
  InstagramInVideoMessage: bubble('instagram', 'video', 'Video'),
  InstagramInAudioMessage: bubble('instagram', 'audio', 'Voice message'),
  InstagramInFeedCommentMessage: bubble('instagram', 'comment', 'Comment on a post'),
  InstagramInReelCommentMessage: bubble('instagram', 'comment', 'Comment on a reel'),
  InstagramInAdCommentMessage: bubble('instagram', 'comment', 'Comment on an ad'),
  InstagramInStoryReplyMessage: bubble('instagram', 'story', 'Reply to a story'),
  InstagramInUnknownMessage: unsupported('instagram', 'Instagram'),
  InstagramOutTextMessage: bubble('instagram', 'text', 'Text'),
  InstagramOutImageMessage: bubble('instagram', 'image', 'Photo'),
  InstagramOutVideoMessage: bubble('instagram', 'video', 'Video'),
  InstagramOutAudioMessage: bubble('instagram', 'audio', 'Voice message'),
  InstagramOutPublicCommentReplyMessage: bubble('instagram', 'comment', 'Public reply to a comment'),
  InstagramOutUnknownMessage: unsupported('instagram', 'Instagram'),

  // ── Facebook ──────────────────────────────────────────────────────────
  FacebookInTextMessage: bubble('facebook', 'text', 'Text'),
  FacebookInImageMessage: bubble('facebook', 'image', 'Photo'),
  FacebookInVideoMessage: bubble('facebook', 'video', 'Video'),
  FacebookInAudioMessage: bubble('facebook', 'audio', 'Voice message'),
  FacebookInFileMessage: bubble('facebook', 'document', 'File'),
  FacebookInPostCommentMessage: bubble('facebook', 'comment', 'Comment on a post'),
  FacebookInUnknownMessage: unsupported('facebook', 'Facebook'),
  FacebookOutTextMessage: bubble('facebook', 'text', 'Text'),
  FacebookOutImageMessage: bubble('facebook', 'image', 'Photo'),
  FacebookOutVideoMessage: bubble('facebook', 'video', 'Video'),
  FacebookOutAudioMessage: bubble('facebook', 'audio', 'Voice message'),
  FacebookOutPublicCommentReplyMessage: bubble('facebook', 'comment', 'Public reply to a comment'),
  FacebookOutUnknownMessage: unsupported('facebook', 'Facebook'),

  // ── TikTok ────────────────────────────────────────────────────────────
  TikTokInTextMessage: bubble('tiktok', 'text', 'Text'),
  TikTokInImageMessage: bubble('tiktok', 'image', 'Photo'),
  TikTokInTextPostCommentMessage: bubble('tiktok', 'comment', 'Comment on a post'),
  TikTokInUnknownMessage: unsupported('tiktok', 'TikTok'),
  TikTokOutTextMessage: bubble('tiktok', 'text', 'Text'),
  TikTokOutImageMessage: bubble('tiktok', 'image', 'Photo'),
  TikTokOutPublicCommentReplyMessage: bubble('tiktok', 'comment', 'Public reply to a comment'),
  TikTokOutUnknownMessage: unsupported('tiktok', 'TikTok'),

  // ── System ────────────────────────────────────────────────────────────
  SystemLivechatOpenedManuallyMessage: system('An operator opened the live chat'),
  SystemLivechatOpenedByComponentMessage: system('The automation handed this chat to an operator'),
  SystemLivechatOpenedByBooking: system('A booking opened the live chat'),
  SystemLivechatOpenedByCoexMessage: system('Opened from the WhatsApp Business app'),
  SystemLivechatOpenedByInstagramAppMessage: system('Opened from the Instagram app'),
  SystemLivechatOpenedByFacebookAppMessage: system('Opened from the Facebook app'),
  SystemLivechatOpenedByTikTokAppMessage: system('Opened from the TikTok app'),
  SystemLivechatClosedByAutoClosingMessage: system('The live chat closed automatically'),
  SystemConversationSummaryMessage: system('Conversation summary'),
  SystemMetaConversionEventSentMessage: system('A conversion event was reported to Meta'),
  SystemTypingMessage: { platform: 'system', row: 'skip', shape: 'system', label: 'Typing' },
};

/**
 * `WhatsAppInSomeNewThingMessage` → `Some new thing`.
 *
 * Last resort only. Everything in the schema is in the table above; this covers
 * a server that is ahead of the build, which is the ordinary state of affairs
 * for a client shipped as a template. Losing the platform prefix is deliberate
 * — the platform is already established by the conversation.
 */
function prettify(typename: string): string {
  const stripped = typename
    .replace(/^(WhatsApp|WebWidget|Instagram|Facebook|TikTok|System)(In|Out)?/, '')
    .replace(/Message$/, '');
  const spaced = stripped.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  if (!spaced) return typename;
  return spaced[0]!.toUpperCase() + spaced.slice(1).toLowerCase();
}

/** The platform a typename names, for the fallback path only. */
function guessPlatform(typename: string): MessagePlatform {
  if (typename.startsWith('WhatsApp')) return 'whatsapp';
  if (typename.startsWith('WebWidget')) return 'widget';
  if (typename.startsWith('Instagram')) return 'instagram';
  if (typename.startsWith('Facebook')) return 'facebook';
  if (typename.startsWith('TikTok')) return 'tiktok';
  return 'system';
}

/**
 * The table, with a survivable answer for a typename that is not in it.
 *
 * An unknown `__typename` must never crash or blank a thread: a real inbox can
 * carry types this build has never heard of, and the reader still needs the
 * timestamp, the sender and the delivery state around whatever it was. A
 * `System*` prefix falls to a system line rather than a bubble because that is
 * what every System type in the schema has ever been.
 */
export function messageKind(typename: string): MessageKind {
  const known = MESSAGE_KINDS[typename as MessageNode['__typename']];
  if (known) return known;
  if (typename.startsWith('System')) return system(prettify(typename));
  return bubble(guessPlatform(typename), 'unknown', prettify(typename));
}
