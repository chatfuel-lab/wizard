/**
 * What is preview-specific to THIS module: which document sends on which
 * platform, which scope maps to which platform, and how one wire message
 * becomes a `TestChatRow`.
 *
 * Everything else — the row model, the merge, the restart watermark, the
 * session state machine — is `~ui`'s `lib/testChat`, shared with the flow
 * builder's Test dock. Only the two things a module cannot share live here: its
 * own generated documents, and the typename switch over its own fragment.
 *
 * A session pinned to an automation answers whether or not the automation is
 * enabled and whether or not its filters match — routing is not emulated; the
 * All base is not previewable; the subscription takes a moment to become
 * active; there is no teardown — a restart is a new start plus a client-side
 * watermark.
 */
import type { TypedDoc } from '~api';
import { anonymousKey, TESTER_LABEL, type TestChatRow } from '~ui';
import {
  AutomationsPreviewFacebookPostCommentSendDocument,
  AutomationsPreviewFacebookTextSendDocument,
  AutomationsPreviewInstagramPostCommentSendDocument,
  AutomationsPreviewInstagramTextSendDocument,
  AutomationsPreviewTikTokTextSendDocument,
  AutomationsPreviewWhatsAppTextSendDocument,
  AutomationsPreviewWidgetTextSendDocument,
  FuelyAutomationScope,
  FuelySettingPrivateReplyHowToReply,
} from '~api/generated/automations/graphql';
import type { PreviewMessageNode, SettingInfo } from '../types';
import { settingOf } from './settingValue';
import { PREVIEW_PLATFORMS, type PreviewPlatform } from './automationsParams';
import { PLATFORM_KEYS, platformOf } from './scopes';

// ---------------------------------------------------------------------------
// Platform → send document
// ---------------------------------------------------------------------------

export interface SendTextVars {
  botID: string;
  conversationID: string;
  message: { text: string; clientId: string };
}

/** The five text-send mutations share one variable shape; the result key differs. */
export type SendTextDocument = TypedDoc<Record<string, PreviewMessageNode | null | undefined>, SendTextVars>;

export interface SendDocument {
  document: SendTextDocument;
  /** The field the sent In message comes back under. */
  resultKey: string;
}

const SEND: Record<PreviewPlatform, SendDocument> = {
  whatsapp: {
    document: AutomationsPreviewWhatsAppTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesWhatsappTextSend',
  },
  widget: {
    document: AutomationsPreviewWidgetTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesWidgetTextSend',
  },
  instagram: {
    document: AutomationsPreviewInstagramTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesInstagramTextSend',
  },
  tiktok: {
    document: AutomationsPreviewTikTokTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesTikTokTextSend',
  },
  facebook: {
    document: AutomationsPreviewFacebookTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesFacebookTextSend',
  },
};

export const sendDocumentFor = (platform: PreviewPlatform): SendDocument => SEND[platform];

// ---------------------------------------------------------------------------
// Test comments
// ---------------------------------------------------------------------------

export interface SendCommentVars {
  botID: string;
  conversationID: string;
  comment: { text: string; clientId: string } & ({ postCaption: string } | { postMessage: string });
}

export type SendCommentDocument = TypedDoc<Record<string, PreviewMessageNode | null | undefined>, SendCommentVars>;

export interface CommentPreview {
  platform: 'instagram' | 'facebook';
  document: SendCommentDocument;
  /** The field the sent comment comes back under. */
  resultKey: string;
  /** What the post's text is called in the input. */
  postField: 'postCaption' | 'postMessage';
}

/**
 * The scopes whose test is a COMMENT on a post rather than a DM — the two the
 * dashboard offers it on, because they are the two the API can send one to.
 * The server makes a throwaway post carrying the text sent with the comment,
 * and the pinned automation answers the comment the way it answers a real
 * one: a public reply under it and/or a private reply in the DM. Instagram ad
 * comments, stories and TikTok have no such mutation.
 */
export const COMMENT_PREVIEWS: ReadonlyMap<FuelyAutomationScope, CommentPreview> = new Map([
  [
    FuelyAutomationScope.InstagramPostComments,
    {
      platform: 'instagram',
      document: AutomationsPreviewInstagramPostCommentSendDocument as unknown as SendCommentDocument,
      resultKey: 'previewResponsesInstagramPostCommentSend',
      postField: 'postCaption',
    },
  ],
  [
    FuelyAutomationScope.FacebookPostComments,
    {
      platform: 'facebook',
      document: AutomationsPreviewFacebookPostCommentSendDocument as unknown as SendCommentDocument,
      resultKey: 'previewResponsesFacebookPostCommentSend',
      postField: 'postMessage',
    },
  ],
]);

export const commentPreviewFor = (scope: FuelyAutomationScope | undefined): CommentPreview | null =>
  (scope && COMMENT_PREVIEWS.get(scope)) || null;

/** The post ids an automation watches — its posts, else (Instagram) its stories. Empty = every post. */
export function watchedPostIds(settings: readonly SettingInfo[], platform: CommentPreview['platform']): string[] {
  const posts = settingOf(settings, 'FuelySettingListOfPosts')?.posts.map((post) => post.postID) ?? [];
  if (posts.length > 0 || platform === 'facebook') return posts;
  return settingOf(settings, 'FuelySettingListOfStories')?.stories.map((story) => story.storyID) ?? [];
}

/** One of them at random, as the dashboard does — a fresh draw per attempt. Null when there is none. */
export const pickPost = (ids: readonly string[], rnd: () => number = Math.random): string | null =>
  ids.length === 0 ? null : (ids[Math.min(ids.length - 1, Math.floor(rnd() * ids.length))] ?? null);

/** Whether the automation answers a comment in the DM as well. */
export const sendsDirectMessage = (settings: readonly SettingInfo[]): boolean => {
  const reply = settingOf(settings, 'FuelySettingPrivateReply');
  return reply !== undefined && reply.privateReplyHowToReply !== FuelySettingPrivateReplyHowToReply.DontReply;
};

const COMMENT_TYPENAMES = new Set(['InstagramInFeedCommentMessage', 'FacebookInPostCommentMessage']);
const PUBLIC_REPLY_TYPENAMES = new Set([
  'InstagramOutPublicCommentReplyMessage',
  'FacebookOutPublicCommentReplyMessage',
]);

export interface CommentNodes {
  /** Row keys that belong on the post, not in the DM thread: comments and public replies. */
  keys: string[];
  /** The newest public reply's text, from its own message or from a comment's `publicReplyMessages`. */
  reply: string | null;
}

const rowKey = (node: { clientId?: string | null; id?: string | null; sentTime?: string }): string =>
  node.clientId || node.id || anonymousKey(node.sentTime ?? '');

/**
 * What a batch of wire messages says about the comment on the post. The
 * thread draws everything else as the DM conversation the private reply
 * opened; these rows move to the post, where the dashboard shows them.
 */
export function readCommentNodes(nodes: readonly PreviewMessageNode[]): CommentNodes {
  const keys: string[] = [];
  let reply: string | null = null;
  for (const node of nodes) {
    if (COMMENT_TYPENAMES.has(node.__typename)) {
      keys.push(rowKey(node));
      if ('publicReplyMessages' in node) {
        for (const answer of node.publicReplyMessages) {
          keys.push(rowKey(answer));
          if ('text' in answer && answer.text) reply = answer.text;
        }
      }
    } else if (PUBLIC_REPLY_TYPENAMES.has(node.__typename)) {
      keys.push(rowKey(node));
      if ('text' in node && node.text) reply = node.text;
    }
  }
  return { keys, reply };
}

/** The wire value of `session.platform` is the enum's string; anything else is unknown. */
export const parsePreviewPlatform = (raw: string | null | undefined): PreviewPlatform | null =>
  PREVIEW_PLATFORMS.find((platform) => platform === raw) ?? null;

/** The scope's platform as the preview key (`Instagram · Post comments` → `instagram`); null for All. */
export function platformOfScope(scope: FuelyAutomationScope): PreviewPlatform | null {
  const platform = platformOf(scope);
  return platform ? PLATFORM_KEYS[platform] : null;
}

export const PLATFORM_LABELS: Record<PreviewPlatform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  widget: 'Website widget',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

// ---------------------------------------------------------------------------
// Wire message → row
// ---------------------------------------------------------------------------

const parseTimeMs = (iso: string): number => {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const isFromAutomation = (sender: PreviewMessageNode['sender']): boolean =>
  sender.__typename !== 'ContactMessageSender';

const IN_TEXT = new Set([
  'WhatsAppInTextMessage',
  'InstagramInTextMessage',
  'TikTokInTextMessage',
  'FacebookInTextMessage',
  'FacebookInPostCommentMessage',
  'InstagramInFeedCommentMessage',
]);
const OUT_TEXT = new Set([
  'WhatsAppOutTextMessage',
  'InstagramOutTextMessage',
  'TikTokOutTextMessage',
  'FacebookOutTextMessage',
  'FacebookOutPublicCommentReplyMessage',
  'InstagramOutPublicCommentReplyMessage',
]);

/**
 * One wire message → one row. Every typename the fragment selects a field for
 * is mapped by that field; the widget's `WebWidgetTextMessage` is In or Out by
 * its sender (one typename both ways). Anything else — a comment, an image, a
 * booking marker, a typename the schema grew after this file — becomes an
 * "Unsupported message" row of the right direction, never a throw.
 *
 * This module's fragment selects TEXT and nothing else: a session pinned to an
 * automation is a conversation with a prompt, not a flow with buttons, so there
 * is nothing structured to render and nothing clickable to press.
 */
export function toRow(node: PreviewMessageNode): TestChatRow {
  const fromBot = isFromAutomation(node.sender);
  const key = node.clientId || node.id || anonymousKey(node.sentTime);
  const base = {
    id: node.id ?? null,
    key,
    sentTime: node.sentTime,
    at: parseTimeMs(node.sentTime),
    updatedAt: node.updatedAt,
    senderLabel: fromBot ? node.sender.name || 'AI' : TESTER_LABEL,
    fromBot,
    supported: true,
  };
  switch (node.__typename) {
    case 'SystemTypingMessage':
      return { ...base, kind: 'typing', text: '', until: node.until, fromBot: true };
    case 'SystemConversationSummaryMessage':
      return { ...base, kind: 'system', systemKind: 'summary', text: node.summary, fromBot: true };
    case 'SystemLivechatOpenedByComponentMessage':
      return {
        ...base,
        kind: 'system',
        systemKind: 'handoff',
        text: node.originallyDecidedByAI
          ? 'The AI handed this chat to an operator'
          : 'The chat was opened for an operator',
        fromBot: true,
      };
    case 'WebWidgetTextMessage':
      return { ...base, kind: fromBot ? 'out' : 'in', text: node.text };
    default: {
      if ('text' in node && typeof node.text === 'string') {
        if (IN_TEXT.has(node.__typename)) return { ...base, kind: 'in', text: node.text, fromBot: false };
        if (OUT_TEXT.has(node.__typename)) return { ...base, kind: 'out', text: node.text, fromBot: true };
      }
      if (node.__typename.startsWith('System')) {
        return { ...base, kind: 'system', systemKind: 'other', text: '', supported: false, fromBot: true };
      }
      return { ...base, kind: fromBot ? 'out' : 'in', text: '', supported: false };
    }
  }
}

// ---------------------------------------------------------------------------
// The target
// ---------------------------------------------------------------------------

/**
 * The session is pinned to one automation (`previewResponsesStartForFuelyAutomation`) or to nothing.
 * `scope` picks how a test message is sent — see `COMMENT_PREVIEW_SCOPES`.
 */
export type PreviewTarget = { kind: 'automation'; id: string; scope?: FuelyAutomationScope };

export const targetKey = (target: PreviewTarget | null): string => (target === null ? '' : `automation:${target.id}`);
