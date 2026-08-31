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
  AutomationsPreviewFacebookTextSendDocument,
  AutomationsPreviewInstagramTextSendDocument,
  AutomationsPreviewTikTokTextSendDocument,
  AutomationsPreviewWhatsAppTextSendDocument,
  AutomationsPreviewWidgetTextSendDocument,
  FuelyAutomationScope,
} from '~api/generated/automations/graphql';
import type { PreviewMessageNode } from '../types';
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
]);
const OUT_TEXT = new Set([
  'WhatsAppOutTextMessage',
  'InstagramOutTextMessage',
  'TikTokOutTextMessage',
  'FacebookOutTextMessage',
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

/** The session is pinned to one automation (`previewResponsesStartForFuelyAutomation`) or to nothing. */
export type PreviewTarget = { kind: 'automation'; id: string };

export const targetKey = (target: PreviewTarget | null): string => (target === null ? '' : `automation:${target.id}`);
