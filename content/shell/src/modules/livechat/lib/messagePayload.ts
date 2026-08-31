import { formatFileSize, type MessageAction, type MessageStatus } from '~ui';
import {
  AudioTranscriptionStatus,
  FacebookMessageStatus,
  FileStatus,
  InstagramMessageStatus,
  TikTokMessageStatus,
  WebWidgetMessageStatus,
  WhatsAppMessageStatus,
} from '~api/generated/livechat/graphql';
import type { LastMessageNode, MessageNode } from '../types';
import { messageErrorText } from './messageErrors';
import { messageKind, type MessageShape } from './messageKinds';
import { humanDuration } from './time';

/**
 * Everything the thread reads off a message node, as data.
 *
 * Two rules govern this file and they are the same rule twice:
 *
 * 1. **Nothing is read except under a check on the concrete `__typename`.**
 *    `Message` is an interface, and the fields that matter are NOT on it.
 *    Delivery state is `whatsappStatus` on the WhatsApp types, `status` on the
 *    widget types, and `instagramStatus` / `facebookStatus` / `tiktokStatus` on
 *    the other three — five names for one idea. The version this replaces asked
 *    `'whatsappStatus' in node ? … : 'status' in node ? …`, which is the same
 *    mistake written in TypeScript: it works for the two prefixes someone
 *    thought of and silently returns nothing for the other three.
 * 2. **The answer is a value, not JSX.** vitest here is node-only with no
 *    jsdom, so anything left inside a component is untestable by construction —
 *    and a dispatch over seventy typenames is exactly the thing that needs a
 *    test. `MessageView` renders what this returns and decides nothing.
 */

/**
 * A template's header: words, or one file. `name` is a document's file name
 * — an image or video header has none on the wire.
 */
export type TemplateHeader =
  { kind: 'text'; text: string } | { kind: 'image' | 'video' | 'document'; url: string | null; name: string | null };

/**
 * The rendered template — what an outgoing `WhatsAppOutTemplateMessage`
 * carries, and also what an optimistic row is drawn from before the echo.
 * There is NO template name on the wire, so it is not here either.
 */
export interface TemplateContent {
  header: TemplateHeader | null;
  body: string | null;
  footer: string | null;
  actions: MessageAction[];
}

/**
 * What a comment was left on. Instagram says a great deal about the media
 * (and `isUnknown` when it says nothing); Facebook's `FacebookPost` has only
 * an id, so its source is a bare `post`; TikTok gives a URL.
 */
export interface CommentSource {
  kind: 'post' | 'reel' | 'ad' | 'story' | 'unknown';
  owner: string | null;
  caption: string | null;
  url: string | null;
  thumbnailUrl: string | null;
}

export type MessagePayload =
  /** Not a row. `SystemTypingMessage`, and only that. */
  | { kind: 'skip' }
  /** A centred line about the conversation rather than a message in it. */
  | { kind: 'system'; text: string }
  | { kind: 'text'; text: string }
  /* `label` on the media variants is not decoration: it is what the tile says
     when the file has expired, and taking it from the kinds table is what stops
     "Photo" being written a second time in a component where no test can see
     it disagree. */
  | { kind: 'image'; url: string | null; caption: string | null; label: string }
  | { kind: 'video'; url: string | null; caption: string | null; label: string }
  | { kind: 'audio'; url: string | null; transcript: string | null; label: string }
  /** `name` is the file name, or the label when the platform sends none. */
  | {
      kind: 'document';
      url: string | null;
      name: string;
      /** "1.2 MB", or null when `File.size` is not on the wire. */
      size: string | null;
      caption: string | null;
      label: string;
    }
  /** Text with reply / URL buttons. The buttons render UNDER the bubble. */
  | {
      kind: 'buttons';
      header: string | null;
      body: string;
      footer: string | null;
      actions: MessageAction[];
    }
  /** A WhatsApp list: the body, the button that opens the list, its rows. */
  | { kind: 'list'; body: string; buttonTitle: string; actions: MessageAction[] }
  | ({ kind: 'template' } & TemplateContent)
  /**
   * Arrived on a public surface, or was answered on one. `source` is what it
   * was a comment on — null for an outgoing public reply, which the schema
   * ties to no post. `label` is the kinds-table sentence ("Comment on a reel").
   */
  | { kind: 'comment'; text: string; source: CommentSource | null; label: string }
  /** The contact tapped something rather than writing. */
  | { kind: 'tap'; title: string; description: string | null }
  /**
   * The type is known, its payload is not on the wire — the Placeholder and
   * Unknown types, which have no payload fields at all. `label` says what
   * arrived; `shape` picks the glyph.
   */
  | { kind: 'described'; shape: MessageShape; label: string };

/**
 * The typenames whose payload this module's operations document selects,
 * i.e. every typename `readPayload` reads a field of.
 *
 * This is a boundary, not a design decision: a field that is not in
 * `modules/livechat/skill/examples/operations.graphql` does not exist in the
 * generated type. Every bubble type is here now except the five Placeholder /
 * Unknown types, which have no payload fields in the schema, and the System
 * types that carry nothing beyond the common fields.
 *
 * Exported so the test asserts it against `readPayload` itself rather than
 * against a second hand-written list that could disagree with it.
 */
export const PAYLOAD_ON_WIRE: readonly MessageNode['__typename'][] = [
  // WhatsApp
  'WhatsAppInTextMessage',
  'WhatsAppInImageMessage',
  'WhatsAppInVideoMessage',
  'WhatsAppInAudioMessage',
  'WhatsAppInDocumentMessage',
  'WhatsAppInContinueFlowButtonClickMessage',
  'WhatsAppInTemplateQuickReplyButtonClickMessage',
  'WhatsAppInListRowClickMessage',
  'WhatsAppOutTextMessage',
  'WhatsAppOutImageMessage',
  'WhatsAppOutVideoMessage',
  'WhatsAppOutAudioMessage',
  'WhatsAppOutDocumentMessage',
  'WhatsAppOutTextAndButtonsMessage',
  'WhatsAppOutTextAndURLMessage',
  'WhatsAppOutListMessage',
  'WhatsAppOutTemplateMessage',
  // Web widget
  'WebWidgetTextMessage',
  'WebWidgetAttachmentMessage',
  'WebWidgetTextAndButtonsMessage',
  'WebWidgetContinueFlowButtonClickMessage',
  'WebWidgetOpenURLButtonClickMessage',
  'WebWidgetCallPhoneButtonClickMessage',
  // Instagram
  'InstagramInTextMessage',
  'InstagramInImageMessage',
  'InstagramInVideoMessage',
  'InstagramInAudioMessage',
  'InstagramInFeedCommentMessage',
  'InstagramInReelCommentMessage',
  'InstagramInAdCommentMessage',
  'InstagramInStoryReplyMessage',
  'InstagramOutTextMessage',
  'InstagramOutImageMessage',
  'InstagramOutVideoMessage',
  'InstagramOutAudioMessage',
  'InstagramOutPublicCommentReplyMessage',
  // Facebook
  'FacebookInTextMessage',
  'FacebookInImageMessage',
  'FacebookInVideoMessage',
  'FacebookInAudioMessage',
  'FacebookInFileMessage',
  'FacebookInPostCommentMessage',
  'FacebookOutTextMessage',
  'FacebookOutImageMessage',
  'FacebookOutVideoMessage',
  'FacebookOutAudioMessage',
  'FacebookOutPublicCommentReplyMessage',
  // TikTok
  'TikTokInTextMessage',
  'TikTokInImageMessage',
  'TikTokInTextPostCommentMessage',
  'TikTokOutTextMessage',
  'TikTokOutImageMessage',
  'TikTokOutPublicCommentReplyMessage',
  // System
  'SystemConversationSummaryMessage',
  'SystemLivechatOpenedManuallyMessage',
  'SystemLivechatClosedByAutoClosingMessage',
  'SystemLivechatOpenedByComponentMessage',
];

/** The two shapes that legitimately have nothing to show. */
export const NO_PAYLOAD_SHAPES: ReadonlySet<MessageShape> = new Set<MessageShape>(['placeholder', 'unknown']);

/** The subset of `File` every media reader needs. `size` only for documents. */
type WireFile = { url: string; status: FileStatus; size?: number | null };

/**
 * A file the server has told us is gone is not a file.
 *
 * `FileStatus.Expired` means "deleted because it expired, or never existed" and
 * the schema explicitly says not to read the other fields of such a file. Its
 * `url` is still a non-null string, so an `<img>` pointed at it renders a
 * broken-image glyph and an `<audio>` renders a dead player. `FileInfo` has
 * always selected `status` and nothing has ever looked at it.
 */
function usableUrl(file: WireFile | null | undefined): string | null {
  if (!file || file.status === FileStatus.Expired) return null;
  return file.url || null;
}

/**
 * The transcript, only once there is one.
 *
 * `transcribedText` is `String!`, so a voice note that has not been transcribed
 * — or that was skipped as too large — carries the empty string rather than
 * null, and `transcriptionStatus` is the only field that separates "no words"
 * from "not finished". Also always selected and also never read: the old
 * bubble tested the text for truthiness and so silently showed nothing for a
 * failed transcription and nothing for a successful empty one.
 */
function transcriptOf(node: { transcriptionStatus: AudioTranscriptionStatus; transcribedText: string }): string | null {
  if (node.transcriptionStatus !== AudioTranscriptionStatus.Finished) return null;
  const text = node.transcribedText.trim();
  return text || null;
}

/* The five media readers. Each takes the typename for its label, so the label
   is looked up once, in one place, and cannot drift from the kinds table. */

const image = (
  typename: MessageNode['__typename'],
  file: WireFile | null | undefined,
  caption: string | null | undefined,
): MessagePayload => ({
  kind: 'image',
  url: usableUrl(file),
  caption: caption ?? null,
  label: messageKind(typename).label,
});

const video = (
  typename: MessageNode['__typename'],
  file: WireFile | null | undefined,
  caption: string | null | undefined,
): MessagePayload => ({
  kind: 'video',
  url: usableUrl(file),
  caption: caption ?? null,
  label: messageKind(typename).label,
});

const audio = (
  typename: MessageNode['__typename'],
  file: WireFile | null | undefined,
  transcript: string | null,
): MessagePayload => ({
  kind: 'audio',
  url: usableUrl(file),
  transcript,
  label: messageKind(typename).label,
});

/**
 * `size` is `Int` (nullable) on `File`, so a document may arrive without one;
 * a size of zero is a real answer and is printed, a missing one is not.
 */
const document = (
  typename: MessageNode['__typename'],
  file: WireFile | null | undefined,
  fileName: string | null | undefined,
  caption: string | null | undefined,
): MessagePayload => {
  const label = messageKind(typename).label;
  const usable = usableUrl(file);
  const size = usable && typeof file?.size === 'number' ? formatFileSize(file.size) : null;
  return {
    kind: 'document',
    url: usable,
    name: fileName?.trim() || label,
    size: size || null,
    caption: caption ?? null,
    label,
  };
};

/**
 * WhatsApp's message-side buttons: a reply button is a title, a URL button a
 * title and a link. These are NOT the flow-builder button types.
 */
type WhatsAppButton =
  | { __typename: 'WhatsAppContinueFlowMessageButton'; title: string }
  | { __typename: 'WhatsAppOpenURLMessageButton'; title: string; url: string };

const whatsAppActions = (buttons: readonly WhatsAppButton[]): MessageAction[] =>
  buttons.map((button) =>
    button.__typename === 'WhatsAppOpenURLMessageButton'
      ? { title: button.title, href: button.url }
      : { title: button.title },
  );

type WidgetButton =
  | { __typename: 'WebWidgetContinueFlowButton'; title: string }
  | { __typename: 'WebWidgetOpenURLButton'; title: string; url: string }
  | { __typename: 'WebWidgetCallPhoneButton'; title: string; phone: string };

const widgetActions = (buttons: readonly WidgetButton[]): MessageAction[] =>
  buttons.map((button) => {
    switch (button.__typename) {
      case 'WebWidgetOpenURLButton':
        return { title: button.title, href: button.url };
      case 'WebWidgetCallPhoneButton':
        return { title: button.title, phone: button.phone };
      case 'WebWidgetContinueFlowButton':
        return { title: button.title };
    }
  });

/**
 * A rendered template's buttons as actions. A URL button is a link, a call
 * button a phone; a quick reply and a WhatsApp-call button are the contact's
 * to press and render as a transcript; a copy-code button shows its code
 * beside its text because the code IS the content of that button.
 */
type TemplateButton = NonNullable<
  Extract<MessageNode, { __typename: 'WhatsAppOutTemplateMessage' }>['waTemplateButtons']
>[number];

const templateActions = (buttons: readonly TemplateButton[]): MessageAction[] =>
  buttons.map((button) => {
    switch (button.__typename) {
      case 'WhatsAppOutTemplateMessageURLButton':
        return { title: button.text, href: button.url };
      case 'WhatsAppOutTemplateMessageCallPhoneButton':
        return { title: button.text, phone: button.phoneNumber };
      case 'WhatsAppOutTemplateMessageCopyCodeButton':
        return { title: `${button.text} · ${button.code}` };
      case 'WhatsAppOutTemplateMessageQuickReplyButton':
      case 'WhatsAppOutTemplateMessageWhatsAppCallButton':
        return { title: button.text };
    }
  });

type TemplateNode = Extract<MessageNode, { __typename: 'WhatsAppOutTemplateMessage' }>;

/**
 * A rendered template's header. `__typename` is selected on the header union
 * and is the only way to tell an image from a video from a document: the
 * three media components carry the same `file` field.
 */
function templateHeader(header: TemplateNode['header']): TemplateHeader | null {
  if (!header) return null;
  switch (header.__typename) {
    case 'WhatsAppOutTemplateMessageComponentText':
      return { kind: 'text', text: header.text };
    case 'WhatsAppOutTemplateMessageComponentImage':
      return { kind: 'image', url: usableUrl(header.file), name: null };
    case 'WhatsAppOutTemplateMessageComponentVideo':
      return { kind: 'video', url: usableUrl(header.file), name: null };
    case 'WhatsAppOutTemplateMessageComponentDocument':
      return { kind: 'document', url: usableUrl(header.file), name: header.fileName ?? null };
  }
}

const template = (node: TemplateNode): MessagePayload => ({
  kind: 'template',
  header: templateHeader(node.header),
  body: node.body?.text ?? null,
  footer: node.footer?.text ?? null,
  actions: templateActions(node.waTemplateButtons),
});

/**
 * Instagram's media union, flattened. `isUnknown` means "treat this as
 * unknown, render a placeholder and ignore all the other fields" — the
 * schema's own words — so the other fields are not read past it.
 */
type InstagramMedia = Extract<MessageNode, { __typename: 'InstagramInFeedCommentMessage' }>['mediaContainer']['media'];

const INSTAGRAM_MEDIA_KIND: Record<InstagramMedia['__typename'], CommentSource['kind']> = {
  InstagramPost: 'post',
  InstagramReel: 'reel',
  InstagramAd: 'ad',
  InstagramStory: 'story',
};

function instagramSource(media: InstagramMedia): CommentSource {
  if (media.isUnknown) {
    return { kind: 'unknown', owner: null, caption: null, url: null, thumbnailUrl: null };
  }
  return {
    kind: INSTAGRAM_MEDIA_KIND[media.__typename],
    owner: media.ownerUsername || null,
    caption: media.caption?.trim() || null,
    url: media.url || null,
    thumbnailUrl: usableUrl(media.thumbnailPreview),
  };
}

const comment = (typename: MessageNode['__typename'], text: string, source: CommentSource | null): MessagePayload => ({
  kind: 'comment',
  text,
  source,
  label: messageKind(typename).label,
});

const tap = (title: string, description: string | null | undefined): MessagePayload => ({
  kind: 'tap',
  title,
  description: description?.trim() || null,
});

/**
 * What to draw inside the bubble.
 *
 * The switch lists concrete typenames and nothing else — no `in` checks, no
 * interface-level field access, no optional chaining standing in for a
 * narrowing. Every case here is a typename in `PAYLOAD_ON_WIRE`; everything
 * else takes its label from the kinds table.
 */
export function readPayload(node: MessageNode): MessagePayload {
  switch (node.__typename) {
    // ── Text, every platform ─────────────────────────────────────────────
    case 'WhatsAppInTextMessage':
    case 'WhatsAppOutTextMessage':
    case 'WebWidgetTextMessage':
    case 'InstagramInTextMessage':
    case 'InstagramOutTextMessage':
    case 'FacebookInTextMessage':
    case 'FacebookOutTextMessage':
    case 'TikTokInTextMessage':
    case 'TikTokOutTextMessage':
      return { kind: 'text', text: node.text };

    // ── Images ───────────────────────────────────────────────────────────
    case 'WhatsAppInImageMessage':
    case 'WhatsAppOutImageMessage':
      return image(node.__typename, node.file, node.caption);
    case 'InstagramInImageMessage':
    case 'InstagramOutImageMessage':
    case 'FacebookInImageMessage':
    case 'FacebookOutImageMessage':
    case 'TikTokInImageMessage':
    case 'TikTokOutImageMessage':
      return image(node.__typename, node.file, null);
    /* `WebWidgetAttachmentType` has one member, `image`, so the attachment IS
       a picture; `type` is selected so that the day it grows a second member
       the compiler is what says so. */
    case 'WebWidgetAttachmentMessage':
      return image(node.__typename, node.attachment.file, null);

    // ── Video ────────────────────────────────────────────────────────────
    case 'WhatsAppInVideoMessage':
    case 'WhatsAppOutVideoMessage':
      return video(node.__typename, node.file, node.caption);
    case 'InstagramInVideoMessage':
    case 'InstagramOutVideoMessage':
    case 'FacebookInVideoMessage':
    case 'FacebookOutVideoMessage':
      return video(node.__typename, node.file, null);

    // ── Audio ────────────────────────────────────────────────────────────
    case 'WhatsAppInAudioMessage':
    case 'InstagramInAudioMessage':
    case 'FacebookInAudioMessage':
      return audio(node.__typename, node.file, transcriptOf(node));
    /* Outbound voice notes are never transcribed — the schema has no
       transcription fields on them. */
    case 'WhatsAppOutAudioMessage':
    case 'InstagramOutAudioMessage':
    case 'FacebookOutAudioMessage':
      return audio(node.__typename, node.file, null);

    // ── Documents ────────────────────────────────────────────────────────
    case 'WhatsAppInDocumentMessage':
    case 'WhatsAppOutDocumentMessage':
      return document(node.__typename, node.file, node.fileName, node.caption);
    /* Facebook's file message has no fileName in the schema at all. */
    case 'FacebookInFileMessage':
      return document(node.__typename, node.file, null, null);

    // ── Buttons and lists ────────────────────────────────────────────────
    case 'WhatsAppOutTextAndButtonsMessage':
    case 'WhatsAppOutTextAndURLMessage':
      return {
        kind: 'buttons',
        header: node.headerText?.trim() || null,
        body: node.bodyText,
        footer: node.footerText?.trim() || null,
        actions: whatsAppActions(node.whatsappButtons),
      };
    case 'WebWidgetTextAndButtonsMessage':
      return {
        kind: 'buttons',
        header: null,
        body: node.text,
        footer: null,
        actions: widgetActions(node.buttons),
      };
    case 'WhatsAppOutListMessage':
      return {
        kind: 'list',
        body: node.bodyText,
        buttonTitle: node.buttonTitle,
        actions: node.listRows.map((row) => ({
          kind: 'row',
          title: row.title,
          description: row.description?.trim() || undefined,
        })),
      };

    // ── Template ─────────────────────────────────────────────────────────
    case 'WhatsAppOutTemplateMessage':
      return template(node);

    // ── Comments and story replies ───────────────────────────────────────
    case 'InstagramInFeedCommentMessage':
    case 'InstagramInReelCommentMessage':
    case 'InstagramInAdCommentMessage':
    case 'InstagramInStoryReplyMessage':
      return comment(node.__typename, node.text, instagramSource(node.mediaContainer.media));
    /* `FacebookPost` is an id and nothing else: the source exists, and there
       is nothing to say about it. */
    case 'FacebookInPostCommentMessage':
      return comment(node.__typename, node.text, {
        kind: 'post',
        owner: null,
        caption: null,
        url: null,
        thumbnailUrl: null,
      });
    case 'TikTokInTextPostCommentMessage':
      return comment(
        node.__typename,
        node.text,
        node.post.isUnknown
          ? { kind: 'unknown', owner: null, caption: null, url: null, thumbnailUrl: null }
          : { kind: 'post', owner: null, caption: null, url: node.post.url || null, thumbnailUrl: null },
      );
    /* An outgoing public reply is tied to no post on the wire. */
    case 'InstagramOutPublicCommentReplyMessage':
    case 'FacebookOutPublicCommentReplyMessage':
    case 'TikTokOutPublicCommentReplyMessage':
      return comment(node.__typename, node.text, null);

    // ── Taps ─────────────────────────────────────────────────────────────
    case 'WhatsAppInContinueFlowButtonClickMessage':
    case 'WhatsAppInTemplateQuickReplyButtonClickMessage':
      return tap(node.buttonTitle, null);
    case 'WhatsAppInListRowClickMessage':
      return tap(node.rowTitle, node.rowDescription);
    case 'WebWidgetContinueFlowButtonClickMessage':
      return tap(node.button.title, null);
    case 'WebWidgetOpenURLButtonClickMessage':
      return tap(node.button.title, node.button.url);
    case 'WebWidgetCallPhoneButtonClickMessage':
      return tap(node.button.title, node.button.phone);

    // ── System ───────────────────────────────────────────────────────────
    case 'SystemConversationSummaryMessage':
      return { kind: 'system', text: node.summary };
    /* `isUnknown` on the account means "not found or deleted; the other
       fields are empty" — so the sentence falls back to the nameless one. */
    case 'SystemLivechatOpenedManuallyMessage':
      return {
        kind: 'system',
        text:
          node.byUser.isUnknown || !node.byUser.name.trim()
            ? messageKind(node.__typename).label
            : `${node.byUser.name} opened the live chat`,
      };
    case 'SystemLivechatClosedByAutoClosingMessage': {
      const delay = humanDuration(node.delay);
      return {
        kind: 'system',
        text: delay ? `The live chat closed automatically after ${delay}` : messageKind(node.__typename).label,
      };
    }
    case 'SystemLivechatOpenedByComponentMessage':
      return {
        kind: 'system',
        text: node.originallyDecidedByAI
          ? 'The AI handed this chat to an operator'
          : messageKind(node.__typename).label,
      };

    default: {
      const kind = messageKind(node.__typename);
      if (kind.row === 'skip') return { kind: 'skip' };
      if (kind.row === 'system') return { kind: 'system', text: kind.label };
      return { kind: 'described', shape: kind.shape, label: kind.label };
    }
  }
}

/* Five enums, five mappings, and the interesting one is the widget's.

   `WebWidgetMessageStatus` is `Seen | Unseen | Sending` — no `Sent`, no
   `Delivered`, no `Failed`. The version this replaces lower-cased the enum and
   asked whether the string CONTAINED "read" or "seen", so `Unseen` contains
   "seen" and every undelivered widget message in the product rendered as read,
   with the accent-coloured double tick. `Sending` matched none of the
   substrings and fell through to the default `'sent'`, so an in-flight message
   showed a completed tick as well. Both of those are gone for the same reason:
   an enum is a closed set and a total map over it is the only honest reading.

   Instagram, Facebook and TikTok are `Sending | Sent | Read | Failed` — no
   `Delivered` — so a message on those platforms goes from one tick straight
   to the read receipt. */
const WHATSAPP_STATUS: Record<WhatsAppMessageStatus, MessageStatus> = {
  [WhatsAppMessageStatus.Sending]: 'sending',
  [WhatsAppMessageStatus.Sent]: 'sent',
  [WhatsAppMessageStatus.Delivered]: 'delivered',
  [WhatsAppMessageStatus.Read]: 'read',
  [WhatsAppMessageStatus.Failed]: 'failed',
};

const WIDGET_STATUS: Record<WebWidgetMessageStatus, MessageStatus> = {
  [WebWidgetMessageStatus.Sending]: 'sending',
  /* The widget reports reception, not delivery: a message it holds is 'sent'
     and there is no state between that and being read. */
  [WebWidgetMessageStatus.Unseen]: 'sent',
  [WebWidgetMessageStatus.Seen]: 'read',
};

const INSTAGRAM_STATUS: Record<InstagramMessageStatus, MessageStatus> = {
  [InstagramMessageStatus.Sending]: 'sending',
  [InstagramMessageStatus.Sent]: 'sent',
  [InstagramMessageStatus.Read]: 'read',
  [InstagramMessageStatus.Failed]: 'failed',
};

const FACEBOOK_STATUS: Record<FacebookMessageStatus, MessageStatus> = {
  [FacebookMessageStatus.Sending]: 'sending',
  [FacebookMessageStatus.Sent]: 'sent',
  [FacebookMessageStatus.Read]: 'read',
  [FacebookMessageStatus.Failed]: 'failed',
};

const TIKTOK_STATUS: Record<TikTokMessageStatus, MessageStatus> = {
  [TikTokMessageStatus.Sending]: 'sending',
  [TikTokMessageStatus.Sent]: 'sent',
  [TikTokMessageStatus.Read]: 'read',
  [TikTokMessageStatus.Failed]: 'failed',
};

/**
 * The platform's own word on delivery, read through the typename.
 *
 * Takes the thread's node OR the chat list's `LastMessagePreview`: both are
 * discriminated on `__typename`, and every case below names a field both
 * projections select for that typename, so one switch serves the bubble's
 * ticks and the list row's. `undefined` is the honest answer for the
 * Placeholder and Unknown outbound types, which carry no status field in the
 * schema, and for anything inbound.
 */
export function platformStatus(node: MessageNode | LastMessageNode): MessageStatus | undefined {
  switch (node.__typename) {
    case 'WhatsAppOutTextMessage':
    case 'WhatsAppOutImageMessage':
    case 'WhatsAppOutVideoMessage':
    case 'WhatsAppOutAudioMessage':
    case 'WhatsAppOutDocumentMessage':
    case 'WhatsAppOutTextAndButtonsMessage':
    case 'WhatsAppOutTextAndURLMessage':
    case 'WhatsAppOutListMessage':
    case 'WhatsAppOutTemplateMessage':
      /* A sent template's bubble showed a time and no ticks: the type was in
         the document for its typename alone. It is the one message an operator
         sends outside the 24-hour window, so its delivery is the one they most
         want to watch. */
      return WHATSAPP_STATUS[node.whatsappStatus];
    /* Every widget type carries `status`, inbound ones included — direction
       on that platform is on the sender, and the caller decides whether ticks
       are wanted at all. */
    case 'WebWidgetTextMessage':
    case 'WebWidgetAttachmentMessage':
    case 'WebWidgetTextAndButtonsMessage':
    case 'WebWidgetContinueFlowButtonClickMessage':
    case 'WebWidgetOpenURLButtonClickMessage':
    case 'WebWidgetCallPhoneButtonClickMessage':
      return WIDGET_STATUS[node.status];
    case 'InstagramOutTextMessage':
    case 'InstagramOutImageMessage':
    case 'InstagramOutVideoMessage':
    case 'InstagramOutAudioMessage':
    case 'InstagramOutPublicCommentReplyMessage':
      return INSTAGRAM_STATUS[node.instagramStatus];
    case 'FacebookOutTextMessage':
    case 'FacebookOutImageMessage':
    case 'FacebookOutVideoMessage':
    case 'FacebookOutAudioMessage':
    case 'FacebookOutPublicCommentReplyMessage':
      return FACEBOOK_STATUS[node.facebookStatus];
    case 'TikTokOutTextMessage':
    case 'TikTokOutImageMessage':
    case 'TikTokOutPublicCommentReplyMessage':
      return TIKTOK_STATUS[node.tiktokStatus];
    default:
      return undefined;
  }
}

/**
 * The delivery glyph for an outgoing message, or nothing.
 *
 * `errors[]` wins over any status. A platform that refused a message — the
 * 24-hour window, a rate limit, a paused template — reports it here through
 * `messageUpdated`, and several of them leave the status field sitting at
 * `Sent` while doing so. The bubble has to say failed, because the operator's
 * next move depends on it.
 *
 * `undefined` means "this build cannot know": the Placeholder and Unknown
 * outbound types have no status field in the schema. A missing glyph is a
 * gap; an invented one is a lie.
 */
export function deliveryStatus(node: MessageNode): MessageStatus | undefined {
  if (node.errors?.length) return 'failed';
  return platformStatus(node);
}

/** The red footnote under the bubble, or nothing. See `messageErrors.ts`. */
export function deliveryError(node: MessageNode): string | undefined {
  return messageErrorText(node.errors);
}
