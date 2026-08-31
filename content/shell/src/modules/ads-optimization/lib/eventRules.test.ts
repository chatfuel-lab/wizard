import { describe, expect, it } from 'vitest';
import {
  FuelySettingSendEventsToMetaKeywordsRule,
  FuelySettingSendEventsToMetaSalesStage,
  FuelySettingSendEventsToMetaStandardEventName as Standard,
} from '~api/generated/ads-optimization/graphql';
import type { ConversionEvent } from '../types';
import { emptyDraft, type EventDraft } from './eventDraft';
import { MAX_CUSTOM_NAME, MAX_PROMPT, issueOf, nameKey, validateDraft } from './eventRules';

const draftOf = (patch: Partial<EventDraft>): EventDraft => ({ ...emptyDraft(), ...patch });
const noSiblings = { siblings: [] as ConversionEvent[] };

const codes = (draft: EventDraft, siblings: ConversionEvent[] = []) =>
  validateDraft(draft, { siblings }).map((issue) => issue.code);

describe('validateDraft', () => {
  it('asks for the conversion and the trigger before anything else', () => {
    expect(codes(emptyDraft())).toEqual(['AdsConversionRequired', 'AdsTriggerRequired']);
  });

  it('accepts a complete keywords event', () => {
    expect(
      codes(
        draftOf({
          name: { kind: 'standard', value: Standard.LeadSubmitted },
          trigger: 'keywords',
          keywords: ['sale'],
          keywordsRule: FuelySettingSendEventsToMetaKeywordsRule.Contains,
        }),
      ),
    ).toEqual([]);
  });

  it('refuses a name of your own that is one of Meta’s spelled differently', () => {
    const issues = validateDraft(
      draftOf({ name: { kind: 'custom', value: 'purchase' }, trigger: 'booking' }),
      noSiblings,
    );
    expect(issueOf(issues, 'name')?.code).toBe('FuelySendEventsToMetaCustomEventNameIsStandard');
  });

  it('refuses a name of your own that is too long', () => {
    expect(
      codes(draftOf({ name: { kind: 'custom', value: 'x'.repeat(MAX_CUSTOM_NAME + 1) }, trigger: 'booking' })),
    ).toContain('FuelySendEventsToMetaCustomEventNameTooLong');
  });

  it('holds each trigger to the field it cannot do without', () => {
    const name = { kind: 'standard', value: Standard.Purchase } as const;
    expect(codes(draftOf({ name, trigger: 'keywords' }))).toContain('FuelySendEventsToMetaKeywordsEmpty');
    expect(codes(draftOf({ name, trigger: 'status' }))).toContain('FuelySendEventsToMetaSalesStagesEmpty');
    expect(codes(draftOf({ name, trigger: 'handoff' }))).toContain('FuelySendEventsToMetaSwitchToHumanFromEmpty');
    expect(codes(draftOf({ name, trigger: 'prompt' }))).toContain('FuelySendEventsToMetaConditionPromptEmpty');
    expect(codes(draftOf({ name, trigger: 'property' }))).toContain('attr_filter_attr_name_required');
  });

  it('needs no value for the two operators that compare against nothing', () => {
    const name = { kind: 'standard', value: Standard.Purchase } as const;
    const empty = draftOf({
      name,
      trigger: 'property',
      attribute: { name: 'plan', operator: 'IS_EMPTY' as never, value: '' },
    });
    expect(codes(empty)).toEqual([]);
  });

  it('refuses a prompt over the ceiling', () => {
    expect(
      codes(
        draftOf({
          name: { kind: 'standard', value: Standard.Purchase },
          trigger: 'prompt',
          conditionPrompt: 'x'.repeat(MAX_PROMPT + 1),
        }),
      ),
    ).toContain('FuelySendEventsToMetaConditionPromptTooLong');
  });

  it('catches the duplicate the server would refuse the whole list over', () => {
    // The server rejects two events reporting one conversion on one trigger,
    // and it rejects the WHOLE list - so the twentieth event would undo
    // nineteen good ones typed in the same session.
    const sibling: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnBookingEvent',
      id: 'ev-1',
      eventName: { __typename: 'FuelySettingSendEventsToMetaStandardName', standardName: Standard.Purchase },
    };
    const clash = draftOf({ name: { kind: 'standard', value: Standard.Purchase }, trigger: 'booking' });
    expect(codes(clash, [sibling])).toContain('FuelySendEventsToMetaDuplicateEvent');
  });

  it('does not call an event a duplicate of itself', () => {
    const sibling: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnBookingEvent',
      id: 'ev-1',
      eventName: { __typename: 'FuelySettingSendEventsToMetaStandardName', standardName: Standard.Purchase },
    };
    const editing = draftOf({ id: 'ev-1', name: { kind: 'standard', value: Standard.Purchase }, trigger: 'booking' });
    expect(codes(editing, [sibling])).toEqual([]);
  });

  it('lets one conversion be reported on two different triggers', () => {
    const sibling: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnBookingEvent',
      id: 'ev-1',
      eventName: { __typename: 'FuelySettingSendEventsToMetaStandardName', standardName: Standard.Purchase },
    };
    const other = draftOf({
      name: { kind: 'standard', value: Standard.Purchase },
      trigger: 'status',
      salesStages: [FuelySettingSendEventsToMetaSalesStage.Won],
    });
    expect(codes(other, [sibling])).toEqual([]);
  });
});

describe('nameKey', () => {
  it('tells a standard name from a name of your own that reads the same', () => {
    const asStandard: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnBookingEvent',
      id: 'a',
      eventName: { __typename: 'FuelySettingSendEventsToMetaStandardName', standardName: Standard.Purchase },
    };
    const asCustom: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnBookingEvent',
      id: 'b',
      eventName: { __typename: 'FuelySettingSendEventsToMetaCustomName', customName: 'Purchase' },
    };
    expect(nameKey(asStandard)).not.toBe(nameKey(asCustom));
  });
});
