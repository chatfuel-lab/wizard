/**
 * One wire message of a test session → one `TestChatRow`.
 *
 * The typename switch is module-local because the fragment is: `~ui` owns the
 * row MODEL, the merge, the watermark and the state machine, and every host
 * maps its own selection into that model. This one is the wide version — a
 * flow's output is buttons, lists, templates and media, and a test that
 * rendered "Unsupported message" for a buttons message would be untestable.
 *
 * The never-crash rule from the canvas holds here too: a typename this file has
 * not heard of becomes a muted row of the right direction, never a throw.
 */
import { anonymousKey, TESTER_LABEL, type TestChatAction, type TestChatMedia, type TestChatRow } from '~ui';
import { FileStatus } from '~api/generated/flow-builder/graphql';
import type { TestMessageNode } from '../types';

/**
 * Which click mutation a press maps to. Opaque to `~ui`, read back in
 * `useFlowTest`. URL and call-phone buttons carry `href`/`phone` instead and
 * are acted on by the browser; WhatsApp URL buttons have no click mutation at
 * all, so they carry neither and are simply links.
 */
export type ClickKind =
  'widget-continue' | 'widget-url' | 'widget-phone' | 'wa-continue' | 'wa-quick-reply' | 'wa-list-row';

const parseTimeMs = (iso: string): number => {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/** A file that expired still answers with a well-formed URL — do not believe it. */
type FileLike = { url: string; status: FileStatus } | null | undefined;
const mediaOf = (kind: TestChatMedia['kind'], file: FileLike, name?: string | null): TestChatMedia | undefined =>
  file && file.status !== FileStatus.Expired
    ? { kind, url: file.url, name: name ?? undefined }
    : { kind, url: '', name: name ?? undefined };

const TEXT_IN = new Set([
  'WhatsAppInTextMessage',
  'InstagramInTextMessage',
  'TikTokInTextMessage',
  'FacebookInTextMessage',
]);
const TEXT_OUT = new Set([
  'WhatsAppOutTextMessage',
  'InstagramOutTextMessage',
  'TikTokOutTextMessage',
  'FacebookOutTextMessage',
]);

export function toRow(node: TestMessageNode): TestChatRow {
  const fromBot = node.sender.__typename !== 'ContactMessageSender';
  const base = {
    id: node.id ?? null,
    key: node.clientId || node.id || anonymousKey(node.sentTime),
    sentTime: node.sentTime,
    at: parseTimeMs(node.sentTime),
    updatedAt: node.updatedAt,
    senderLabel: fromBot ? node.sender.name || 'Bot' : TESTER_LABEL,
    fromBot,
    supported: true,
  };
  const out = { ...base, kind: 'out' as const, fromBot: true };
  const mine = { ...base, kind: 'in' as const, fromBot: false };

  switch (node.__typename) {
    // ── system ──────────────────────────────────────────────────────────
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
          ? 'The flow handed this chat to an operator'
          : 'The chat was opened for an operator',
        fromBot: true,
      };

    // ── the widget: one text typename both ways ─────────────────────────
    case 'WebWidgetTextMessage':
      return { ...base, kind: fromBot ? 'out' : 'in', text: node.text };
    case 'WebWidgetTextAndButtonsMessage':
      return {
        ...out,
        text: node.text,
        actions: (node.buttons ?? []).map((button): TestChatAction => {
          if (button.__typename === 'WebWidgetOpenURLButton') {
            return { kind: 'button', title: button.title, href: button.url, click: 'widget-url' };
          }
          if (button.__typename === 'WebWidgetCallPhoneButton') {
            return { kind: 'button', title: button.title, phone: button.phone, click: 'widget-phone' };
          }
          return { kind: 'button', title: button.title, click: 'widget-continue' };
        }),
      };
    case 'WebWidgetContinueFlowButtonClickMessage':
      return { ...mine, text: node.button.title };
    case 'WebWidgetOpenURLButtonClickMessage':
    case 'WebWidgetCallPhoneButtonClickMessage':
      return { ...mine, text: node.button.title };

    // ── WhatsApp, the tester's side ─────────────────────────────────────
    case 'WhatsAppInContinueFlowButtonClickMessage':
    case 'WhatsAppInTemplateQuickReplyButtonClickMessage':
      return { ...mine, text: node.buttonTitle };
    case 'WhatsAppInListRowClickMessage':
      return { ...mine, text: node.rowTitle };

    // ── WhatsApp, the flow's side ───────────────────────────────────────
    case 'WhatsAppOutTextAndButtonsMessage':
    case 'WhatsAppOutTextAndURLMessage':
      return {
        ...out,
        header: node.headerText ?? undefined,
        text: node.bodyText,
        footer: node.footerText ?? undefined,
        actions: (node.whatsappButtons ?? []).map((button): TestChatAction =>
          button.__typename === 'WhatsAppOpenURLMessageButton'
            ? // No click mutation exists for a WhatsApp URL button — it is a link.
              { kind: 'button', title: button.title, href: button.url }
            : { kind: 'button', title: button.title, click: 'wa-continue' },
        ),
      };
    case 'WhatsAppOutListMessage':
      return {
        ...out,
        text: node.bodyText,
        actions: (node.listRows ?? []).map((row): TestChatAction => ({
          kind: 'row',
          title: row.title,
          description: row.description ?? undefined,
          click: 'wa-list-row',
        })),
      };
    case 'WhatsAppOutTemplateMessage': {
      const header = node.header;
      const headerText = header?.__typename === 'WhatsAppOutTemplateMessageComponentText' ? header.text : undefined;
      const headerFile =
        header && 'file' in header ? (header.file as { url: string; status: FileStatus } | null) : null;
      const headerKind: TestChatMedia['kind'] | null =
        header?.__typename === 'WhatsAppOutTemplateMessageComponentImage'
          ? 'image'
          : header?.__typename === 'WhatsAppOutTemplateMessageComponentVideo'
            ? 'video'
            : header?.__typename === 'WhatsAppOutTemplateMessageComponentDocument'
              ? 'document'
              : null;
      return {
        ...out,
        header: headerText,
        media: headerKind ? mediaOf(headerKind, headerFile) : undefined,
        text: node.body?.text ?? '',
        footer: node.footer?.text ?? undefined,
        actions: (node.waTemplateButtons ?? []).flatMap((button): TestChatAction[] => {
          if (button.__typename === 'WhatsAppOutTemplateMessageQuickReplyButton') {
            return [{ kind: 'button', title: button.text, click: 'wa-quick-reply' }];
          }
          if (button.__typename === 'WhatsAppOutTemplateMessageURLButton') {
            return [{ kind: 'button', title: button.text, href: button.url }];
          }
          // call-phone / copy-code variants select no fields — nothing to render
          return [];
        }),
      };
    }
    case 'WhatsAppOutImageMessage':
      return { ...out, text: node.caption ?? '', media: mediaOf('image', node.file, node.caption) };
    case 'WhatsAppOutVideoMessage':
      return { ...out, text: node.caption ?? '', media: mediaOf('video', node.file, node.caption) };
    case 'WhatsAppOutAudioMessage':
      return { ...out, text: '', media: mediaOf('audio', node.file) };
    case 'WhatsAppOutDocumentMessage':
      return { ...out, text: node.caption ?? '', media: mediaOf('document', node.file, node.fileName) };

    // ── plain text everywhere else, then the honest fallback ────────────
    default: {
      if ('text' in node && typeof node.text === 'string') {
        if (TEXT_IN.has(node.__typename)) return { ...mine, text: node.text };
        if (TEXT_OUT.has(node.__typename)) return { ...out, text: node.text };
      }
      if (node.__typename.startsWith('System')) {
        return { ...base, kind: 'system', systemKind: 'other', text: '', supported: false, fromBot: true };
      }
      return { ...base, kind: fromBot ? 'out' : 'in', text: '', supported: false };
    }
  }
}
