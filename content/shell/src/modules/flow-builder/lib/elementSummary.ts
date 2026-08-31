/**
 * Human labels + one-line summaries + inspector rows for EVERY element and
 * block typename in the generated union. Hard invariant (guide.md "Reading"):
 * an UNKNOWN __typename must never crash the renderer — real flows can carry
 * block/element types outside this schema subset, so every entry point here
 * falls back to a prettified typename and generic rows.
 */
import { DefaultReplyFrequency } from '~api/generated/flow-builder/graphql';
import type { BlockT, ElementT } from '../types';
import { templateStrToString } from './templateStr';

export interface SummaryRow {
  label: string;
  value: string;
}

export interface ElementSummary {
  label: string;
  summary: string;
}

export const ELEMENT_LABELS: Record<string, string> = {
  WhatsAppTextBlockElement: 'WhatsApp text',
  WhatsAppImageBlockElement: 'WhatsApp image',
  WhatsAppVideoBlockElement: 'WhatsApp video',
  WhatsAppAudioBlockElement: 'WhatsApp audio',
  WhatsAppDocumentBlockElement: 'WhatsApp document',
  WhatsAppTextAndButtonsBlockElement: 'WhatsApp text + buttons',
  WhatsAppTextAndURLBlockElement: 'WhatsApp text + URL',
  WhatsAppListBlockElement: 'WhatsApp list',
  WhatsAppTemplateBlockElement: 'WhatsApp template',
  WidgetTextAndButtonBlockElement: 'Widget text + buttons',
  WidgetImageBlockElement: 'Widget image',
  SetConditionBlockElement: 'Condition',
  SetContactPropertyBlockElement: 'Set contact property',
  ClearContactPropertyBlockElement: 'Clear contact property',
  SendJsonBlockElement: 'Send JSON',
  SummarizeChatBlockElement: 'Summarize chat',
  RedirectToFlowBlockElement: 'Redirect to flow',
  WidgetEntryPointBlockElement: 'Widget entry point',
  DefaultReplyBlockElement: 'Default reply',
  TriggeredMessageBlockElement: 'Triggered message',
  WhatsAppOneTimeNotificationBlockElement: 'One-time broadcast',
  WhatsAppScheduledMessageBlockElement: 'Scheduled message',
  WidgetSwitchToChatWithHumanAgentBlockElement: 'Human agent (widget)',
  WhatsAppSwitchToChatWithHumanAgentBlockElement: 'Human agent (WhatsApp)',
  InstagramSwitchToChatWithHumanAgentBlockElement: 'Human agent (Instagram)',
  TikTokSwitchToChatWithHumanAgentBlockElement: 'Human agent (TikTok)',
  FuelyAIAgentBlockElement: 'Fuely AI agent',
  AiAgentBlockElement: 'AI agent (legacy)',
  AiAgentCustomBlockElement: 'AI agent (custom prompt)',
};

/* Exported for the same reason `ELEMENT_LABELS` is: it is the list of typenames
   this build claims to know about, and the coverage tests are written against
   it rather than against a second copy that could disagree. */
export const BLOCK_LABELS: Record<string, string> = {
  RegularContentBlock: 'Content',
  RegularActionBlock: 'Actions',
  AiAgentBlock: 'AI agent',
  WhatsAppListBlock: 'WhatsApp list',
  WhatsAppTemplateBlock: 'WhatsApp template',
  WhatsAppTextAndButtonsBlock: 'WhatsApp text + buttons',
  WhatsAppTextAndURLBlock: 'WhatsApp text + URL',
  SetConditionBlock: 'Condition',
  SetContactPropertyBlock: 'Set property',
  ClearContactPropertyBlock: 'Clear property',
  RedirectToFlowBlock: 'Redirect',
  DefaultReplyBlock: 'Default reply',
  TriggeredMessageBlock: 'Triggered message',
  WhatsAppOneTimeNotificationBlock: 'One-time broadcast',
  WhatsAppScheduledMessageBlock: 'Scheduled message',
  WidgetEntryPointBlock: 'Widget entry point',
};

/** "SomeNewFangedBlockElement" → "Some New Fanged" — last-resort label. */
function prettifyTypename(typename: string): string {
  const stripped = typename.replace(/BlockElement$/, '').replace(/Block$/, '');
  const spaced = stripped.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return spaced || typename;
}

export function elementTypeLabel(typename: string): string {
  return ELEMENT_LABELS[typename] ?? prettifyTypename(typename);
}

export function blockTypeLabel(typename: string): string {
  return BLOCK_LABELS[typename] ?? prettifyTypename(typename);
}

export function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/**
 * Runtime-safe error count: unknown typenames still carry interface-level
 * errors; the four segment-bearing types additionally roll their
 * segmentErrors into every badge.
 */
export function elementErrorCount(element: ElementT): number {
  const errors = (element as { errors?: unknown[] }).errors;
  const segmentErrors = (element as { segmentErrors?: unknown[] }).segmentErrors;
  return (Array.isArray(errors) ? errors.length : 0) + (Array.isArray(segmentErrors) ? segmentErrors.length : 0);
}

export function blockErrorCount(block: BlockT): number {
  const elements = (block as { blockElements?: ElementT[] }).blockElements;
  if (!Array.isArray(elements)) return 0;
  return elements.reduce((sum, el) => sum + elementErrorCount(el), 0);
}

/** Label + one-line summary for an element card on the canvas. */
export function describeElement(element: ElementT): ElementSummary {
  const label = elementTypeLabel(element.__typename);
  const done = (summary: string): ElementSummary => ({ label, summary: truncate(summary) });
  switch (element.__typename) {
    case 'WhatsAppTextBlockElement':
      return done(templateStrToString(element.text) || 'Empty message');
    case 'WhatsAppImageBlockElement':
      return done(element.image ? 'Image attached' : 'No image yet');
    case 'WhatsAppVideoBlockElement':
      return done(element.video ? element.fileName || 'Video attached' : 'No video yet');
    case 'WhatsAppAudioBlockElement':
      return done(element.audio ? element.fileName || 'Audio attached' : 'No audio yet');
    case 'WhatsAppDocumentBlockElement':
      return done(element.document ? element.fileName || 'Document attached' : 'No document yet');
    case 'WhatsAppTextAndButtonsBlockElement':
      return done(
        `${templateStrToString(element.bodyText) || 'Empty body'} · ${plural(element.buttons.length, 'button')}`,
      );
    case 'WhatsAppTextAndURLBlockElement':
      return done(
        `${templateStrToString(element.bodyText) || 'Empty body'} · ${plural(element.buttons.length, 'button')}`,
      );
    case 'WhatsAppListBlockElement':
      return done(`${templateStrToString(element.bodyText) || 'Empty body'} · ${plural(element.rows.length, 'row')}`);
    case 'WhatsAppTemplateBlockElement':
      return done(
        element.whatsAppTemplate
          ? `${element.whatsAppTemplate.name} (${element.whatsAppTemplate.status})`
          : 'No template',
      );
    case 'WidgetTextAndButtonBlockElement':
      return done(
        element.buttons.length > 0
          ? `${templateStrToString(element.text) || 'Empty message'} · ${plural(element.buttons.length, 'button')}`
          : templateStrToString(element.text) || 'Empty message',
      );
    case 'WidgetImageBlockElement':
      return done(element.image ? 'Image attached' : 'No image yet');
    case 'SetConditionBlockElement':
      return done(plural(element.segment.filters.length, 'filter'));
    case 'SetContactPropertyBlockElement':
      return done(
        element.attribute ? `${element.attribute.name} = ${element.value || '(empty)'}` : 'No attribute chosen',
      );
    case 'ClearContactPropertyBlockElement':
      return done(element.attribute ? `Clears ${element.attribute.name}` : 'No attribute chosen');
    case 'SendJsonBlockElement':
      return done(`${element.httpMethod} ${templateStrToString(element.url) || '(no URL)'}`);
    case 'SummarizeChatBlockElement':
      return done(plural(element.entries.length, 'entry').replace('entrys', 'entries'));
    case 'RedirectToFlowBlockElement':
      return done(element.flow ? `→ ${element.flow.name}` : 'No target flow');
    case 'WidgetEntryPointBlockElement':
      return done('Site chat entry');
    case 'DefaultReplyBlockElement':
      return done(
        element.replyFrequency === DefaultReplyFrequency.Always ? 'Replies every time' : 'Replies once in 24h',
      );
    case 'TriggeredMessageBlockElement':
      return done(element.trigger?.enabled ? 'Trigger enabled' : 'Trigger disabled');
    case 'WhatsAppOneTimeNotificationBlockElement':
      return done(`${element.status} · sent to ${element.sentToContactsCount}`);
    case 'WhatsAppScheduledMessageBlockElement':
      return done(`${element.status} · ${element.repeatType}`);
    case 'WidgetSwitchToChatWithHumanAgentBlockElement':
    case 'WhatsAppSwitchToChatWithHumanAgentBlockElement':
    case 'InstagramSwitchToChatWithHumanAgentBlockElement':
    case 'TikTokSwitchToChatWithHumanAgentBlockElement':
      return done('Hands the chat to a human agent');
    case 'FuelyAIAgentBlockElement':
      return done(`${element.templateID} · ${plural(element.rules.length, 'rule')}`);
    case 'AiAgentBlockElement':
      return done(`${element.templateID} · ${plural(element.rules.length, 'rule')}`);
    case 'AiAgentCustomBlockElement':
      return done(element.prompt || 'Empty prompt');
    default:
      // Unknown typename (schema grew) — interface-level fields only.
      return { label, summary: '' };
  }
}

/** Read-only field dump for the generic inspector view. */
export function elementRows(element: ElementT): SummaryRow[] {
  const rows: SummaryRow[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value !== null && value !== undefined && value !== '') rows.push({ label, value });
  };
  switch (element.__typename) {
    case 'WhatsAppTextBlockElement':
      push('Text', templateStrToString(element.text));
      break;
    case 'WhatsAppImageBlockElement':
      push('Image', element.image?.url);
      push('Caption', templateStrToString(element.caption));
      break;
    case 'WhatsAppVideoBlockElement':
      push('Video', element.video?.url);
      push('File name', element.fileName);
      push('Caption', templateStrToString(element.caption));
      break;
    case 'WhatsAppAudioBlockElement':
      push('Audio', element.audio?.url);
      push('File name', element.fileName);
      break;
    case 'WhatsAppDocumentBlockElement':
      push('Document', element.document?.url);
      push('File name', element.fileName);
      push('Caption', templateStrToString(element.caption));
      break;
    case 'WhatsAppTextAndButtonsBlockElement':
    case 'WhatsAppTextAndURLBlockElement':
      push('Header', templateStrToString(element.headerText));
      push('Body', templateStrToString(element.bodyText));
      push('Footer', templateStrToString(element.footerText));
      element.buttons.forEach((button, i) => push(`Button ${i + 1}`, templateStrToString(button.title)));
      break;
    case 'WhatsAppListBlockElement':
      push('Body', templateStrToString(element.bodyText));
      push('Button title', templateStrToString(element.buttonTitle));
      element.rows.forEach((row, i) => push(`Row ${i + 1}`, templateStrToString(row.title)));
      break;
    case 'WhatsAppTemplateBlockElement':
      push('Template', element.whatsAppTemplate?.name);
      push('Status', element.whatsAppTemplate?.status);
      break;
    case 'WidgetTextAndButtonBlockElement':
      push('Text', templateStrToString(element.text));
      element.buttons.forEach((button, i) => push(`Button ${i + 1}`, templateStrToString(button.title)));
      break;
    case 'WidgetImageBlockElement':
      push('Image', element.image?.url);
      break;
    case 'SetConditionBlockElement':
      push('Segment', element.segment.name ?? undefined);
      push('Operator', element.segment.resultOperator);
      push('Filters', String(element.segment.filters.length));
      break;
    case 'SetContactPropertyBlockElement':
      push('Attribute', element.attribute?.name ?? '(not set)');
      push('Value', element.value || '(empty)');
      break;
    case 'ClearContactPropertyBlockElement':
      push('Attribute', element.attribute?.name ?? '(not set)');
      break;
    case 'SendJsonBlockElement':
      push('Method', element.httpMethod);
      push('URL', templateStrToString(element.url));
      push('Payload', element.payloadType);
      element.headers.forEach((header) =>
        push(`Header: ${templateStrToString(header.title)}`, templateStrToString(header.value)),
      );
      break;
    case 'SummarizeChatBlockElement':
      element.entries.forEach((entry, i) =>
        push(`Entry ${i + 1}`, `${entry.description}${entry.attribute ? ` → ${entry.attribute.name}` : ''}`),
      );
      break;
    case 'RedirectToFlowBlockElement':
      push('Target flow', element.flow?.name ?? '(not set)');
      break;
    case 'WidgetEntryPointBlockElement':
      break;
    case 'DefaultReplyBlockElement':
      push('Frequency', element.replyFrequency);
      break;
    case 'TriggeredMessageBlockElement':
      push('Trigger', element.trigger ? (element.trigger.enabled ? 'Enabled' : 'Disabled') : '(none)');
      push('Filters', String(element.segment.filters.length));
      break;
    case 'WhatsAppOneTimeNotificationBlockElement':
      push('Status', element.status);
      push('Sent to', String(element.sentToContactsCount));
      break;
    case 'WhatsAppScheduledMessageBlockElement':
      push('Status', element.status);
      push('Repeat', element.repeatType);
      push('First send', element.firstSendTime ?? undefined);
      break;
    case 'WidgetSwitchToChatWithHumanAgentBlockElement':
    case 'WhatsAppSwitchToChatWithHumanAgentBlockElement':
    case 'InstagramSwitchToChatWithHumanAgentBlockElement':
    case 'TikTokSwitchToChatWithHumanAgentBlockElement':
      break;
    case 'FuelyAIAgentBlockElement':
      push('Template', element.templateID);
      push('Instructions', element.additionalInstructions);
      element.rules.forEach((rule, i) => push(`Rule ${i + 1}`, rule.title));
      break;
    case 'AiAgentBlockElement':
      push('Template', element.templateID);
      element.rules.forEach((rule, i) => push(`Rule ${i + 1}`, rule.title));
      break;
    case 'AiAgentCustomBlockElement':
      push('Prompt', element.prompt);
      element.rules.forEach((rule, i) => push(`Rule ${i + 1}`, rule.title));
      break;
    default:
      break;
  }
  // Shared ContentBlockElement surface (present on content elements only).
  if ('waitForReplies' in element && typeof element.waitForReplies === 'boolean') {
    rows.push({ label: 'Wait for replies', value: element.waitForReplies ? 'Yes' : 'No' });
    if (element.saveContactReply) {
      rows.push({ label: 'Saves reply to', value: element.savingToAttribute?.name ?? '(no attribute)' });
    }
  }
  return rows;
}
