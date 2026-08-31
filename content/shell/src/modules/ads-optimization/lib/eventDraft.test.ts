import { describe, expect, it } from 'vitest';
import {
  AttrFilterDefaultOperator,
  AttributeDataType,
  AttributeType,
  FuelySettingSendEventsToMetaKeywordsRule,
  FuelySettingSendEventsToMetaStandardEventName as Standard,
} from '~api/generated/ads-optimization/graphql';
import type { ConversionEvent } from '../types';
import { dedupe, draftFromEvent, draftToInput, emptyDraft, isValueless } from './eventDraft';

describe('draftFromEvent', () => {
  it('reads a keywords event back into the fields that edit it', () => {
    const event: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnContactMessageKeywordEvent',
      id: 'ev-1',
      eventName: { __typename: 'FuelySettingSendEventsToMetaCustomName', customName: 'Promo used' },
      keywordsRule: FuelySettingSendEventsToMetaKeywordsRule.ExactMatch,
      keywords: ['SALE26'],
    };
    const draft = draftFromEvent(event);
    expect(draft).toMatchObject({
      id: 'ev-1',
      trigger: 'keywords',
      name: { kind: 'custom', value: 'Promo used' },
      keywordsRule: FuelySettingSendEventsToMetaKeywordsRule.ExactMatch,
      keywords: ['SALE26'],
    });
  });

  it('reads a property condition back, operator and value', () => {
    const event: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnContactAttributeEvent',
      id: 'ev-2',
      eventName: { __typename: 'FuelySettingSendEventsToMetaStandardName', standardName: Standard.ViewContent },
      attributeConditions: [
        {
          attributeCondition: {
            attribute: { name: 'plan', type: AttributeType.Custom, dataType: AttributeDataType.String },
            defaultStrategy: { operator: AttrFilterDefaultOperator.Contains, comparableValues: ['pro'] },
            dateStrategy: null,
          },
          attributeConditionErrors: [],
        },
      ],
    };
    expect(draftFromEvent(event).attribute).toEqual({
      name: 'plan',
      operator: AttrFilterDefaultOperator.Contains,
      value: 'pro',
    });
  });

  it('leaves an unknown kind without a trigger rather than guessing one', () => {
    const alien = {
      __typename: 'FuelySettingSendEventsToMetaOnSomethingNewEvent',
      id: 'x',
      eventName: { __typename: 'FuelySettingSendEventsToMetaCustomName', customName: 'n' },
    } as unknown as ConversionEvent;
    expect(draftFromEvent(alien).trigger).toBeNull();
  });
});

describe('draftToInput', () => {
  it('leaves the id out for a new event, so the server names it', () => {
    const input = draftToInput({
      ...emptyDraft(),
      trigger: 'booking',
      name: { kind: 'standard', value: Standard.Purchase },
    });
    expect(input?.onBooking?.id).toBeUndefined();
  });

  it('trims a name of your own and the condition it carries', () => {
    const input = draftToInput({
      ...emptyDraft(),
      trigger: 'prompt',
      name: { kind: 'custom', value: '  Ready to buy  ' },
      conditionPrompt: '  they said yes  ',
    });
    expect(input?.onCustomPrompt?.eventName.customName).toBe('Ready to buy');
    expect(input?.onCustomPrompt?.conditionPrompt).toBe('they said yes');
  });

  it('sends no value for an operator that compares against nothing', () => {
    const input = draftToInput({
      ...emptyDraft(),
      trigger: 'property',
      name: { kind: 'standard', value: Standard.Purchase },
      attribute: { name: 'plan', operator: AttrFilterDefaultOperator.IsEmpty, value: 'ignored' },
    });
    expect(input?.onContactAttribute?.attributeCondition.defaultStrategy?.comparableValues).toEqual([]);
  });

  it('is null while the draft is not yet an event', () => {
    expect(draftToInput(emptyDraft())).toBeNull();
    expect(draftToInput({ ...emptyDraft(), trigger: 'booking' })).toBeNull();
  });
});

describe('dedupe', () => {
  it('trims, drops blanks and keeps the first spelling of a repeat', () => {
    expect(dedupe([' sale ', 'sale', '', '  ', 'SALE'])).toEqual(['sale', 'SALE']);
  });
});

describe('isValueless', () => {
  it('is true for exactly the two emptiness tests', () => {
    expect(isValueless(AttrFilterDefaultOperator.IsEmpty)).toBe(true);
    expect(isValueless(AttrFilterDefaultOperator.IsNotEmpty)).toBe(true);
    expect(isValueless(AttrFilterDefaultOperator.Is)).toBe(false);
  });
});
