import { describe, expect, it } from 'vitest';
import {
  AttrFilterDateOperator,
  AttrFilterDefaultOperator,
  AttributeDataType,
  AttributeType,
  FuelySettingSendEventsToMetaKeywordsRule,
  FuelySettingSendEventsToMetaSalesStage,
  FuelySettingSendEventsToMetaStandardEventName as Standard,
  FuelySettingSendEventsToMetaSwitchToHumanFrom,
} from '~api/generated/ads-optimization/graphql';
import type { ConversionEvent } from '../types';
import { reorder, toEventInput, toEventInputs } from './eventInput';

const standard = {
  __typename: 'FuelySettingSendEventsToMetaStandardName',
  standardName: Standard.LeadSubmitted,
} as const;

const attributeEvent = (
  defaultStrategy: { operator: AttrFilterDefaultOperator; comparableValues: string[] } | null,
  dateStrategy: { operator: AttrFilterDateOperator; comparableDate: string | null } | null,
): ConversionEvent => ({
  __typename: 'FuelySettingSendEventsToMetaOnContactAttributeEvent',
  id: 'ev-1',
  eventName: standard,
  attributeConditions: [
    {
      attributeCondition: {
        attribute: { name: 'plan', type: AttributeType.Custom, dataType: AttributeDataType.String },
        defaultStrategy,
        dateStrategy,
      },
      attributeConditionErrors: [],
    },
  ],
});

describe('toEventInput', () => {
  it('round-trips every kind the API has today', () => {
    const events: ConversionEvent[] = [
      { __typename: 'FuelySettingSendEventsToMetaOnContactFirstMessageEvent', id: 'a', eventName: standard },
      { __typename: 'FuelySettingSendEventsToMetaOnBookingEvent', id: 'b', eventName: standard },
      {
        __typename: 'FuelySettingSendEventsToMetaOnSwitchToHumanEvent',
        id: 'c',
        eventName: standard,
        switchToHumanFrom: [FuelySettingSendEventsToMetaSwitchToHumanFrom.FuelyAi],
      },
      {
        __typename: 'FuelySettingSendEventsToMetaOnSalesStageEvent',
        id: 'd',
        eventName: standard,
        salesStages: [FuelySettingSendEventsToMetaSalesStage.Won],
      },
      {
        __typename: 'FuelySettingSendEventsToMetaOnCustomPromptEvent',
        id: 'e',
        eventName: standard,
        conditionPrompt: 'done',
      },
      {
        __typename: 'FuelySettingSendEventsToMetaOnContactMessageKeywordEvent',
        id: 'f',
        eventName: standard,
        keywordsRule: FuelySettingSendEventsToMetaKeywordsRule.ExactMatch,
        keywords: ['sale'],
      },
      attributeEvent({ operator: AttrFilterDefaultOperator.Is, comparableValues: ['premium'] }, null),
    ];

    const { inputs, unsupported } = toEventInputs(events);
    expect(unsupported).toEqual([]);
    expect(inputs).toHaveLength(events.length);
    // Each input names exactly one kind: the API's input is one-of.
    for (const input of inputs) {
      expect(Object.values(input).filter(Boolean)).toHaveLength(1);
    }
  });

  it('keeps the id, so an edit updates rather than adding a second event', () => {
    const input = toEventInput({
      __typename: 'FuelySettingSendEventsToMetaOnBookingEvent',
      id: 'ev-42',
      eventName: standard,
    });
    expect(input?.onBooking?.id).toBe('ev-42');
  });

  it('rebuilds a dateless date condition on the default strategy', () => {
    // comparableDate is optional coming back and required going in, so an
    // emptiness test read from the API has no date to send. Both of its
    // operators exist on the default strategy, where no value is needed.
    const input = toEventInput(
      attributeEvent(null, { operator: AttrFilterDateOperator.IsEmpty, comparableDate: null }),
    );
    expect(input?.onContactAttribute?.attributeCondition).toEqual({
      name: 'plan',
      defaultStrategy: { operator: AttrFilterDefaultOperator.IsEmpty, comparableValues: [] },
    });
  });

  it('sends a date condition as a date condition when it has its date', () => {
    const input = toEventInput(
      attributeEvent(null, { operator: AttrFilterDateOperator.Gt, comparableDate: '2026-08-01T00:00:00Z' }),
    );
    expect(input?.onContactAttribute?.attributeCondition.dateStrategy?.comparableDate).toBe('2026-08-01T00:00:00Z');
  });

  it('sends the attribute name alone when neither strategy can be rebuilt', () => {
    // The server stores the condition with its own error rather than refusing
    // the save, which is recoverable; guessing at a strategy is not.
    const input = toEventInput(attributeEvent(null, null));
    expect(input?.onContactAttribute?.attributeCondition).toEqual({ name: 'plan' });
  });

  it('reports a kind it cannot rebuild instead of quietly dropping it', () => {
    // Every write sends the whole list, so leaving an event out DELETES it.
    const alien = {
      __typename: 'FuelySettingSendEventsToMetaOnSomethingNewEvent',
      id: 'x',
    } as unknown as ConversionEvent;
    const { inputs, unsupported } = toEventInputs([alien]);
    expect(inputs).toEqual([]);
    expect(unsupported).toEqual([alien]);
  });
});

describe('reorder', () => {
  it('moves one item and keeps the rest in order', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(reorder(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('ignores an index outside the list rather than clamping it', () => {
    // A clamp turns a stray drop into a real move nobody asked for.
    expect(reorder(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(reorder(['a', 'b'], -1, 1)).toEqual(['a', 'b']);
    expect(reorder(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});
