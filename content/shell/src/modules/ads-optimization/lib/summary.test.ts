import { describe, expect, it } from 'vitest';
import {
  AttrFilterDefaultOperator,
  AttributeDataType,
  AttributeType,
  FuelySettingSendEventsToMetaKeywordsRule,
  FuelySettingSendEventsToMetaSalesStage,
  FuelySettingSendEventsToMetaStandardEventName as Standard,
  FuelySettingSendEventsToMetaSwitchToHumanFrom,
} from '~api/generated/ads-optimization/graphql';
import type { ConversionEvent, EventSetView } from '../types';
import {
  conditionErrors,
  conversionLabel,
  describeEvent,
  railLine,
  setName,
  standardLabel,
  stageLabel,
  summarize,
} from './summary';

const standard = {
  __typename: 'FuelySettingSendEventsToMetaStandardName',
  standardName: Standard.LeadSubmitted,
} as const;

const view = (patch: Partial<EventSetView>): EventSetView => ({
  id: 'set',
  isBase: false,
  name: 'Spring campaign',
  enabled: true,
  updatedAt: '2026-08-21T00:00:00.000Z',
  ads: { value: [], inheritsFrom: null, canInheritFrom: [] },
  events: { value: [], inheritsFrom: null, canInheritFrom: [] },
  ...patch,
});

describe('labels', () => {
  it('spells Meta’s names the way a person writes them', () => {
    expect(standardLabel(Standard.InitiateCheckout)).toBe('Checkout started');
    expect(stageLabel(FuelySettingSendEventsToMetaSalesStage.WorkingOn)).toBe('Working on');
  });

  it('reads an unknown value as itself instead of crashing', () => {
    // The list grows on Meta's schedule, not on ours.
    expect(standardLabel('SomethingNew')).toBe('SomethingNew');
    expect(stageLabel('Archived')).toBe('Archived');
  });

  it('shows a name of your own exactly as written', () => {
    expect(conversionLabel({ __typename: 'FuelySettingSendEventsToMetaCustomName', customName: 'Deal closed' })).toBe(
      'Deal closed',
    );
  });

  it('names the set the API leaves unnamed', () => {
    expect(setName(view({ isBase: true, name: null }))).toBe('Default events for all ads');
    expect(setName(view({ name: '   ' }))).toBe('Untitled set');
  });
});

describe('describeEvent', () => {
  it('says the part the trigger alone does not', () => {
    const keywords: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnContactMessageKeywordEvent',
      id: 'a',
      eventName: standard,
      keywordsRule: FuelySettingSendEventsToMetaKeywordsRule.ExactMatch,
      keywords: ['SALE26', 'PROMO'],
    };
    expect(describeEvent(keywords)).toBe('Exactly: SALE26, PROMO');

    const handoff: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnSwitchToHumanEvent',
      id: 'b',
      eventName: standard,
      switchToHumanFrom: [FuelySettingSendEventsToMetaSwitchToHumanFrom.UserAccount],
    };
    expect(describeEvent(handoff)).toBe('A teammate takes it');
  });

  it('reads a property condition as a sentence', () => {
    const property: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnContactAttributeEvent',
      id: 'c',
      eventName: standard,
      attributeConditions: [
        {
          attributeCondition: {
            attribute: { name: 'plan', type: AttributeType.Custom, dataType: AttributeDataType.String },
            defaultStrategy: { operator: AttrFilterDefaultOperator.Is, comparableValues: ['premium'] },
            dateStrategy: null,
          },
          attributeConditionErrors: [],
        },
      ],
    };
    expect(describeEvent(property)).toBe('plan is premium');
  });

  it('is empty for the two kinds that carry nothing', () => {
    // The cell stays blank rather than repeating the trigger next to itself.
    expect(
      describeEvent({ __typename: 'FuelySettingSendEventsToMetaOnBookingEvent', id: 'd', eventName: standard }),
    ).toBe('');
  });
});

describe('conditionErrors', () => {
  it('surfaces what the server stored rather than refused', () => {
    const broken: ConversionEvent = {
      __typename: 'FuelySettingSendEventsToMetaOnContactAttributeEvent',
      id: 'e',
      eventName: standard,
      attributeConditions: [
        {
          attributeCondition: {
            attribute: { name: 'plan', type: AttributeType.Custom, dataType: AttributeDataType.String },
            defaultStrategy: null,
            dateStrategy: null,
          },
          attributeConditionErrors: ['filter_body_required' as never],
        },
      ],
    };
    expect(conditionErrors(broken)).toEqual(['filter_body_required']);
  });
});

describe('summarize', () => {
  it('flags a set that claims ads and reports nothing', () => {
    const silent = view({ ads: { value: ['120210000000000010'], inheritsFrom: null, canInheritFrom: [] } });
    expect(summarize(silent).silent).toBe(true);
  });

  it('does not flag a set with no ads of its own', () => {
    expect(summarize(view({})).silent).toBe(false);
  });

  it('lists each conversion once, in order', () => {
    const events: ConversionEvent[] = [
      { __typename: 'FuelySettingSendEventsToMetaOnBookingEvent', id: 'a', eventName: standard },
      { __typename: 'FuelySettingSendEventsToMetaOnContactFirstMessageEvent', id: 'b', eventName: standard },
    ];
    expect(summarize(view({ events: { value: events, inheritsFrom: null, canInheritFrom: [] } })).conversions).toEqual([
      'Lead submitted',
    ]);
  });
});

describe('railLine', () => {
  it('counts what the set holds, singular where it should be', () => {
    const one = view({
      ads: { value: ['1'], inheritsFrom: null, canInheritFrom: [] },
      events: {
        value: [{ __typename: 'FuelySettingSendEventsToMetaOnBookingEvent', id: 'a', eventName: standard }],
        inheritsFrom: null,
        canInheritFrom: [],
      },
    });
    expect(railLine(one)).toBe('1 ad · 1 event');
  });

  it('says nothing about ads on the set that has no list', () => {
    expect(railLine(view({ isBase: true, name: null, ads: null }))).toBe('0 events');
  });
});
