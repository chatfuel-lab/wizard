import { describe, expect, it } from 'vitest';
import {
  blockErrorCount,
  blockTypeLabel,
  describeElement,
  elementErrorCount,
  elementRows,
  elementTypeLabel,
  truncate,
} from './elementSummary';
import { templateStrFromString } from './templateStr';
import type { BlockT, ElementT } from '../types';

const el = (value: Record<string, unknown>): ElementT => value as unknown as ElementT;

/** Every element __typename in the generated union — the fallback must never be hit for these. */
const ALL_ELEMENT_TYPENAMES = [
  'WhatsAppTextBlockElement',
  'WhatsAppImageBlockElement',
  'WhatsAppVideoBlockElement',
  'WhatsAppAudioBlockElement',
  'WhatsAppDocumentBlockElement',
  'WhatsAppTextAndButtonsBlockElement',
  'WhatsAppTextAndURLBlockElement',
  'WhatsAppListBlockElement',
  'WhatsAppTemplateBlockElement',
  'WidgetTextAndButtonBlockElement',
  'WidgetImageBlockElement',
  'SetConditionBlockElement',
  'SetContactPropertyBlockElement',
  'ClearContactPropertyBlockElement',
  'SendJsonBlockElement',
  'SummarizeChatBlockElement',
  'RedirectToFlowBlockElement',
  'WidgetEntryPointBlockElement',
  'DefaultReplyBlockElement',
  'TriggeredMessageBlockElement',
  'WhatsAppOneTimeNotificationBlockElement',
  'WhatsAppScheduledMessageBlockElement',
  'WidgetSwitchToChatWithHumanAgentBlockElement',
  'WhatsAppSwitchToChatWithHumanAgentBlockElement',
  'InstagramSwitchToChatWithHumanAgentBlockElement',
  'TikTokSwitchToChatWithHumanAgentBlockElement',
  'FuelyAIAgentBlockElement',
  'AiAgentBlockElement',
  'AiAgentCustomBlockElement',
] as const;

describe('elementTypeLabel', () => {
  it('has a dedicated label for every typename in the generated union', () => {
    for (const typename of ALL_ELEMENT_TYPENAMES) {
      const label = elementTypeLabel(typename);
      expect(label).toBeTruthy();
      expect(label).not.toContain('BlockElement'); // never leaks the raw typename
    }
  });

  it('prettifies unknown typenames instead of crashing', () => {
    expect(elementTypeLabel('BrandNewShinyBlockElement')).toBe('Brand New Shiny');
  });
});

describe('blockTypeLabel', () => {
  it('labels the 16 concrete block types and prettifies unknowns', () => {
    expect(blockTypeLabel('RegularContentBlock')).toBe('Content');
    expect(blockTypeLabel('WhatsAppTextAndURLBlock')).toBe('WhatsApp text + URL');
    expect(blockTypeLabel('FancyFutureBlock')).toBe('Fancy Future');
  });
});

describe('describeElement', () => {
  it('summarizes a WhatsApp text element from its TemplateStr', () => {
    const summary = describeElement(
      el({ __typename: 'WhatsAppTextBlockElement', id: 'e', text: templateStrFromString('Hi {{first name}}!') }),
    );
    expect(summary.label).toBe('WhatsApp text');
    expect(summary.summary).toBe('Hi {{first name}}!');
  });

  it('summarizes widget text+buttons with a button count', () => {
    const summary = describeElement(
      el({
        __typename: 'WidgetTextAndButtonBlockElement',
        id: 'e',
        text: templateStrFromString('Pick one'),
        buttons: [{ id: 'b1' }, { id: 'b2' }],
      }),
    );
    expect(summary.summary).toBe('Pick one · 2 buttons');
  });

  it('summarizes a redirect by target flow name', () => {
    expect(
      describeElement(el({ __typename: 'RedirectToFlowBlockElement', id: 'e', flow: { id: 'f', name: 'Welcome' } }))
        .summary,
    ).toBe('→ Welcome');
    expect(describeElement(el({ __typename: 'RedirectToFlowBlockElement', id: 'e', flow: null })).summary).toBe(
      'No target flow',
    );
  });

  it('NEVER crashes on an unknown typename — returns a generic fallback', () => {
    const summary = describeElement(el({ __typename: 'BrandNewShinyBlockElement', id: 'e' }));
    expect(summary.label).toBe('Brand New Shiny');
    expect(summary.summary).toBe('');
  });
});

describe('elementRows', () => {
  it('dumps fields for a send-json element', () => {
    const rows = elementRows(
      el({
        __typename: 'SendJsonBlockElement',
        id: 'e',
        httpMethod: 'POST',
        url: templateStrFromString('https://api.test/hook'),
        payloadType: 'ALL_PROPERTIES',
        headers: [{ id: 'h1', title: templateStrFromString('X-Token'), value: templateStrFromString('abc') }],
      }),
    );
    expect(rows).toEqual([
      { label: 'Method', value: 'POST' },
      { label: 'URL', value: 'https://api.test/hook' },
      { label: 'Payload', value: 'ALL_PROPERTIES' },
      { label: 'Header: X-Token', value: 'abc' },
    ]);
  });

  it('appends the shared content-element surface (waitForReplies / save reply)', () => {
    const rows = elementRows(
      el({
        __typename: 'WhatsAppTextBlockElement',
        id: 'e',
        text: templateStrFromString('Hello'),
        waitForReplies: true,
        saveContactReply: true,
        savingToAttribute: { name: 'last reply' },
      }),
    );
    expect(rows).toContainEqual({ label: 'Wait for replies', value: 'Yes' });
    expect(rows).toContainEqual({ label: 'Saves reply to', value: 'last reply' });
  });

  it('returns empty rows (not a crash) for unknown typenames', () => {
    expect(elementRows(el({ __typename: 'BrandNewShinyBlockElement', id: 'e' }))).toEqual([]);
  });
});

describe('error counting', () => {
  it('counts element errors and tolerates missing errors on unknown shapes', () => {
    expect(elementErrorCount(el({ __typename: 'X', id: 'e', errors: [{ code: 'a' }, { code: 'b' }] }))).toBe(2);
    expect(elementErrorCount(el({ __typename: 'X', id: 'e' }))).toBe(0);
  });

  it('rolls segmentErrors into the count on segment-bearing types', () => {
    const withSegment = el({
      __typename: 'SetConditionBlockElement',
      id: 'e',
      errors: [{ code: 'a' }],
      segmentErrors: [
        { filterID: 'f-1', code: 'bad_filter' },
        { filterID: '', code: 'empty' },
      ],
    });
    expect(elementErrorCount(withSegment)).toBe(3);
  });

  it('sums element errors per block', () => {
    const block = {
      __typename: 'RegularContentBlock',
      id: 'b',
      blockElements: [
        { __typename: 'X', id: 'e1', errors: [{ code: 'a' }] },
        { __typename: 'Y', id: 'e2', errors: [] },
        { __typename: 'Z', id: 'e3', errors: [{ code: 'b' }, { code: 'c' }] },
      ],
    } as unknown as BlockT;
    expect(blockErrorCount(block)).toBe(3);
  });
});

describe('truncate', () => {
  it('caps long values with an ellipsis', () => {
    expect(truncate('x'.repeat(80))).toHaveLength(60);
    expect(truncate('short')).toBe('short');
  });
});
