import {
  AttrFilterDateOperator,
  AttrFilterDefaultOperator,
  type AdsAttributeConditionFragment,
  type AttrFilterInput,
  type FuelySettingSendEventsToMetaEventInput,
  type FuelySettingSendEventsToMetaEventNameInput,
} from '~api/generated/ads-optimization/graphql';
import type { ConversionEvent, ConversionName } from '../types';

/**
 * Turning what the API returned back into what a write takes.
 *
 * Every write sends the WHOLE ordered list — reorder, edit one, delete one, add
 * one all go through the same mutation — so an event that cannot be rebuilt
 * cannot simply be left out: leaving it out deletes it. `toEventInputs` reports
 * those separately and the caller refuses the write instead.
 */

export function nameInput(name: ConversionName): FuelySettingSendEventsToMetaEventNameInput {
  return name.__typename === 'FuelySettingSendEventsToMetaStandardName'
    ? { standardName: name.standardName }
    : { customName: name.customName };
}

/** The two operators a date condition can carry with no date of its own. */
const DATE_TO_DEFAULT: Partial<Record<AttrFilterDateOperator, AttrFilterDefaultOperator>> = {
  [AttrFilterDateOperator.IsEmpty]: AttrFilterDefaultOperator.IsEmpty,
  [AttrFilterDateOperator.IsNotEmpty]: AttrFilterDefaultOperator.IsNotEmpty,
};

export function filterInput(condition: AdsAttributeConditionFragment): AttrFilterInput {
  const filter = condition.attributeCondition;
  const name = filter.attribute.name;

  if (filter.defaultStrategy) {
    return {
      name,
      defaultStrategy: {
        operator: filter.defaultStrategy.operator,
        comparableValues: [...filter.defaultStrategy.comparableValues],
      },
    };
  }

  if (filter.dateStrategy) {
    const { operator, comparableDate } = filter.dateStrategy;
    if (comparableDate) return { name, dateStrategy: { operator, comparableDate } };
    /* The date is optional coming back and required going in, so an emptiness
       test is the only date condition that can arrive without one. Both of its
       operators exist on the default strategy too, where no value is needed. */
    const fallback = DATE_TO_DEFAULT[operator];
    if (fallback) return { name, defaultStrategy: { operator: fallback, comparableValues: [] } };
  }

  /* Neither strategy can be rebuilt. The attribute name goes back on its own:
     the server stores the condition with the error it finds rather than
     refusing the save, and the editor shows that error on the event. */
  return { name };
}

/**
 * One event as a write takes it. Null for a kind this build does not know —
 * the API may grow an eighth.
 */
export function toEventInput(event: ConversionEvent): FuelySettingSendEventsToMetaEventInput | null {
  /* Read before the switch, and guarded: an event of a kind this build does not
     know may not carry the fields every known kind shares, and crashing here
     would take the whole list down with it. */
  const name = event?.eventName;
  if (!name) return null;
  const eventName = nameInput(name);
  const id = event.id;

  switch (event.__typename) {
    case 'FuelySettingSendEventsToMetaOnSwitchToHumanEvent':
      return { onSwitchToHuman: { id, eventName, switchToHumanFrom: [...event.switchToHumanFrom] } };
    case 'FuelySettingSendEventsToMetaOnSalesStageEvent':
      return { onSalesStage: { id, eventName, salesStages: [...event.salesStages] } };
    case 'FuelySettingSendEventsToMetaOnContactFirstMessageEvent':
      return { onContactFirstMessage: { id, eventName } };
    case 'FuelySettingSendEventsToMetaOnBookingEvent':
      return { onBooking: { id, eventName } };
    case 'FuelySettingSendEventsToMetaOnCustomPromptEvent':
      return { onCustomPrompt: { id, eventName, conditionPrompt: event.conditionPrompt } };
    case 'FuelySettingSendEventsToMetaOnContactMessageKeywordEvent':
      return {
        onContactMessageKeyword: {
          id,
          eventName,
          keywordsRule: event.keywordsRule,
          keywords: [...event.keywords],
        },
      };
    case 'FuelySettingSendEventsToMetaOnContactAttributeEvent': {
      /* The API holds exactly one condition; an event that somehow carries none
         would rebuild as an empty filter, which the server refuses outright. */
      const condition = event.attributeConditions[0];
      if (!condition) return null;
      return { onContactAttribute: { id, eventName, attributeCondition: filterInput(condition) } };
    }
    default:
      return null;
  }
}

export interface EventInputs {
  inputs: FuelySettingSendEventsToMetaEventInput[];
  /** Events this build cannot rebuild. A write carrying any of these is refused. */
  unsupported: ConversionEvent[];
}

export function toEventInputs(events: readonly ConversionEvent[]): EventInputs {
  const inputs: FuelySettingSendEventsToMetaEventInput[] = [];
  const unsupported: ConversionEvent[] = [];
  for (const event of events) {
    const input = toEventInput(event);
    if (input) inputs.push(input);
    else unsupported.push(event);
  }
  return { inputs, unsupported };
}

/**
 * The list with one event moved, as a drag or a keyboard reorder leaves it.
 * Out-of-range indexes are ignored rather than clamped: a clamp turns a stray
 * drop into a real move nobody asked for.
 */
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to) return [...items];
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}
