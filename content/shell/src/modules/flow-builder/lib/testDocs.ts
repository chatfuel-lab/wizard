/**
 * Which document a send goes through: five text mutations picked by the FLOW's
 * platform, six click mutations picked by the button's kind.
 *
 * A flow session carries no platform of its own — `PreviewResponsesFlowSession`
 * has none, unlike the bot and automation sessions — so the flow's own platform
 * is the only thing that can pick a send. The five inputs share one shape; the
 * result key differs, which is why each entry carries it.
 */
import type { TypedDoc } from '~api';
import {
  FlowTestFacebookTextSendDocument,
  FlowTestInstagramTextSendDocument,
  FlowTestTikTokTextSendDocument,
  FlowTestWhatsAppContinueFlowClickDocument,
  FlowTestWhatsAppListRowClickDocument,
  FlowTestWhatsAppTemplateQuickReplyClickDocument,
  FlowTestWhatsAppTextSendDocument,
  FlowTestWidgetCallPhoneClickDocument,
  FlowTestWidgetContinueFlowClickDocument,
  FlowTestWidgetOpenUrlClickDocument,
  FlowTestWidgetTextSendDocument,
  Platform,
} from '~api/generated/flow-builder/graphql';
import type { TestMessageNode } from '../types';
import type { ClickKind } from './testRows';

export interface SendTextVars {
  botID: string;
  conversationID: string;
  message: { text: string; clientId: string };
}

export interface ClickVars {
  botID: string;
  conversationID: string;
  click: { messageId: string; clientId: string; buttonTitle?: string; rowTitle?: string };
}

type AnyResult = Record<string, TestMessageNode | null | undefined>;
export type SendTextDocument = TypedDoc<AnyResult, SendTextVars>;
export type ClickDocument = TypedDoc<AnyResult, ClickVars>;

export interface WireDocument<V> {
  document: TypedDoc<AnyResult, V>;
  /** The field the echoed message comes back under. */
  resultKey: string;
}

const SEND: Record<Platform, WireDocument<SendTextVars>> = {
  [Platform.Whatsapp]: {
    document: FlowTestWhatsAppTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesWhatsappTextSend',
  },
  [Platform.Widget]: {
    document: FlowTestWidgetTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesWidgetTextSend',
  },
  [Platform.Instagram]: {
    document: FlowTestInstagramTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesInstagramTextSend',
  },
  [Platform.Tiktok]: {
    document: FlowTestTikTokTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesTikTokTextSend',
  },
  [Platform.Facebook]: {
    document: FlowTestFacebookTextSendDocument as unknown as SendTextDocument,
    resultKey: 'previewResponsesFacebookTextSend',
  },
};

/** Null for a platform the schema grew after this file — the composer then says so. */
export const sendDocumentFor = (platform: string): WireDocument<SendTextVars> | null =>
  SEND[platform as Platform] ?? null;

const CLICK: Record<ClickKind, WireDocument<ClickVars>> = {
  'widget-continue': {
    document: FlowTestWidgetContinueFlowClickDocument as unknown as ClickDocument,
    resultKey: 'previewResponsesWidgetContinueFlowBtnClickSend',
  },
  'widget-url': {
    document: FlowTestWidgetOpenUrlClickDocument as unknown as ClickDocument,
    resultKey: 'previewResponsesWidgetOpenURLBtnClickSend',
  },
  'widget-phone': {
    document: FlowTestWidgetCallPhoneClickDocument as unknown as ClickDocument,
    resultKey: 'previewResponsesWidgetCallPhoneBtnClickSend',
  },
  'wa-continue': {
    document: FlowTestWhatsAppContinueFlowClickDocument as unknown as ClickDocument,
    resultKey: 'previewResponsesWhatsappContinueFlowBtnClickSend',
  },
  'wa-quick-reply': {
    document: FlowTestWhatsAppTemplateQuickReplyClickDocument as unknown as ClickDocument,
    resultKey: 'previewResponsesWhatsappTemplateQuickReplyBtnClickSend',
  },
  'wa-list-row': {
    document: FlowTestWhatsAppListRowClickDocument as unknown as ClickDocument,
    resultKey: 'previewResponsesWhatsappListRowClickSend',
  },
};

export const clickDocumentFor = (kind: ClickKind): WireDocument<ClickVars> => CLICK[kind];

/**
 * The click payload. A list row is addressed by `rowTitle`, everything else by
 * `buttonTitle` — the server matches on the rendered STRING plus the message
 * id, never on a handle, so this is the title exactly as the reader pressed it.
 */
export function clickInput(kind: ClickKind, messageId: string, title: string, clientId: string): ClickVars['click'] {
  return kind === 'wa-list-row'
    ? { messageId, clientId, rowTitle: title }
    : { messageId, clientId, buttonTitle: title };
}
