import { describe, expect, it } from 'vitest';
import { EDITORS } from '../components/ElementInspector';
import { ELEMENT_LABELS } from './elementSummary';

/**
 * The full-coverage checklist: every known element typename is either
 * dispatched to a dedicated editor in ElementInspector or documented as
 * read-only-because-the-schema-has-no-setters. A new typename landing in
 * ELEMENT_LABELS without a decision here fails the suite on purpose.
 *
 * The dedicated list is checked against the inspector's actual dispatch table
 * and not only against itself. Before the editors were lazy the dispatch was
 * a `switch` no test could read, so this list was a promise about the switch;
 * now it is a claim about `EDITORS`, and an editor dropped from the table
 * fails here rather than in the panel.
 */
const DEDICATED_EDITORS = [
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
  'DefaultReplyBlockElement',
  'TriggeredMessageBlockElement',
  'WhatsAppOneTimeNotificationBlockElement',
  'WhatsAppScheduledMessageBlockElement',
  'FuelyAIAgentBlockElement',
  'AiAgentBlockElement',
  'AiAgentCustomBlockElement',
];

/** No setters exist in the schema for these — GenericElementView on purpose. */
const READ_ONLY_BY_SCHEMA = [
  'WidgetEntryPointBlockElement',
  'WidgetSwitchToChatWithHumanAgentBlockElement',
  'WhatsAppSwitchToChatWithHumanAgentBlockElement',
  'InstagramSwitchToChatWithHumanAgentBlockElement',
  'TikTokSwitchToChatWithHumanAgentBlockElement',
];

describe('editor coverage', () => {
  it('partitions every known element typename into dedicated or documented-read-only', () => {
    const decided = [...DEDICATED_EDITORS, ...READ_ONLY_BY_SCHEMA];
    expect(new Set(decided).size).toBe(decided.length); // no double-listing
    expect(Object.keys(ELEMENT_LABELS).sort()).toEqual(decided.sort());
  });

  it('covers all 29 concrete BlockElement typenames', () => {
    expect(Object.keys(ELEMENT_LABELS)).toHaveLength(29);
  });

  it('registers exactly the dedicated typenames in the inspector table, each with a lazy editor', () => {
    expect(Object.keys(EDITORS).sort()).toEqual([...DEDICATED_EDITORS].sort());
    /* Every entry is a `lazy()` component and not, say, an accidental static
       import that would drag its chunk back into the panel's bundle. */
    for (const editor of Object.values(EDITORS)) {
      expect(editor).toHaveProperty('$$typeof', Symbol.for('react.lazy'));
    }
  });

  it('never routes a read-only typename to an editor', () => {
    for (const typename of READ_ONLY_BY_SCHEMA) {
      expect(EDITORS).not.toHaveProperty(typename);
    }
  });
});
