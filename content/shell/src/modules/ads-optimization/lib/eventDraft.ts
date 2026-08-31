import {
  AttrFilterDefaultOperator,
  FuelySettingSendEventsToMetaKeywordsRule,
  type FuelySettingSendEventsToMetaEventInput,
  type FuelySettingSendEventsToMetaSalesStage,
  type FuelySettingSendEventsToMetaStandardEventName,
  type FuelySettingSendEventsToMetaSwitchToHumanFrom,
} from '~api/generated/ads-optimization/graphql';
import type { ConversionEvent } from '../types';
import { nameInput } from './eventInput';
import { triggerById, triggerOf, type TriggerId } from './eventKinds';

/**
 * What the event editor holds while it is open.
 *
 * One flat draft rather than a shape per trigger: a person who picks the wrong
 * trigger and changes their mind keeps what they typed, and the fields the
 * chosen trigger does not use are simply not sent. The conversion to a write
 * happens once, at save.
 */

export type NameDraft =
  { kind: 'standard'; value: FuelySettingSendEventsToMetaStandardEventName } | { kind: 'custom'; value: string };

/** The operators that compare against nothing — the value field disappears. */
export const VALUELESS_OPERATORS: readonly AttrFilterDefaultOperator[] = [
  AttrFilterDefaultOperator.IsEmpty,
  AttrFilterDefaultOperator.IsNotEmpty,
];

export const isValueless = (operator: AttrFilterDefaultOperator): boolean => VALUELESS_OPERATORS.includes(operator);

export interface AttributeDraft {
  name: string;
  operator: AttrFilterDefaultOperator;
  value: string;
}

export interface EventDraft {
  /** Null while the event is new — the server generates the id. */
  id: string | null;
  trigger: TriggerId | null;
  name: NameDraft | null;
  keywordsRule: FuelySettingSendEventsToMetaKeywordsRule;
  keywords: string[];
  salesStages: FuelySettingSendEventsToMetaSalesStage[];
  switchToHumanFrom: FuelySettingSendEventsToMetaSwitchToHumanFrom[];
  conditionPrompt: string;
  attribute: AttributeDraft;
}

export const emptyDraft = (): EventDraft => ({
  id: null,
  trigger: null,
  name: null,
  keywordsRule: FuelySettingSendEventsToMetaKeywordsRule.Contains,
  keywords: [],
  salesStages: [],
  switchToHumanFrom: [],
  conditionPrompt: '',
  attribute: { name: '', operator: AttrFilterDefaultOperator.Is, value: '' },
});

export function draftFromEvent(event: ConversionEvent): EventDraft {
  const draft = emptyDraft();
  draft.id = event.id;
  draft.trigger = triggerOf(event)?.id ?? null;
  draft.name =
    event.eventName.__typename === 'FuelySettingSendEventsToMetaStandardName'
      ? { kind: 'standard', value: event.eventName.standardName }
      : { kind: 'custom', value: event.eventName.customName };

  switch (event.__typename) {
    case 'FuelySettingSendEventsToMetaOnContactMessageKeywordEvent':
      draft.keywordsRule = event.keywordsRule;
      draft.keywords = [...event.keywords];
      break;
    case 'FuelySettingSendEventsToMetaOnSalesStageEvent':
      draft.salesStages = [...event.salesStages];
      break;
    case 'FuelySettingSendEventsToMetaOnSwitchToHumanEvent':
      draft.switchToHumanFrom = [...event.switchToHumanFrom];
      break;
    case 'FuelySettingSendEventsToMetaOnCustomPromptEvent':
      draft.conditionPrompt = event.conditionPrompt;
      break;
    case 'FuelySettingSendEventsToMetaOnContactAttributeEvent': {
      const filter = event.attributeConditions[0]?.attributeCondition;
      if (filter) {
        draft.attribute = {
          name: filter.attribute.name,
          operator: filter.defaultStrategy?.operator ?? AttrFilterDefaultOperator.Is,
          value: filter.defaultStrategy?.comparableValues[0] ?? '',
        };
      }
      break;
    }
    default:
      break;
  }
  return draft;
}

/**
 * The draft as a write takes it. Null when the draft is not complete enough to
 * be one — `validateDraft` says which part is missing, so this only has to be
 * safe, not talkative.
 */
export function draftToInput(draft: EventDraft): FuelySettingSendEventsToMetaEventInput | null {
  const trigger = draft.trigger ? triggerById(draft.trigger) : null;
  if (!trigger || !draft.name) return null;

  const eventName = nameInput(
    draft.name.kind === 'standard'
      ? { __typename: 'FuelySettingSendEventsToMetaStandardName', standardName: draft.name.value }
      : { __typename: 'FuelySettingSendEventsToMetaCustomName', customName: draft.name.value.trim() },
  );
  /* An id is sent only for an event the set already owns; a new one is left out
     and the server names it. */
  const id = draft.id ?? undefined;

  switch (trigger.id) {
    case 'keywords':
      return {
        onContactMessageKeyword: {
          id,
          eventName,
          keywordsRule: draft.keywordsRule,
          keywords: dedupe(draft.keywords),
        },
      };
    case 'firstMessage':
      return { onContactFirstMessage: { id, eventName } };
    case 'booking':
      return { onBooking: { id, eventName } };
    case 'status':
      return { onSalesStage: { id, eventName, salesStages: [...draft.salesStages] } };
    case 'handoff':
      return { onSwitchToHuman: { id, eventName, switchToHumanFrom: [...draft.switchToHumanFrom] } };
    case 'prompt':
      return { onCustomPrompt: { id, eventName, conditionPrompt: draft.conditionPrompt.trim() } };
    case 'property':
      return {
        onContactAttribute: {
          id,
          eventName,
          attributeCondition: {
            name: draft.attribute.name.trim(),
            defaultStrategy: {
              operator: draft.attribute.operator,
              comparableValues: isValueless(draft.attribute.operator) ? [] : [draft.attribute.value.trim()],
            },
          },
        },
      };
    default:
      return null;
  }
}

/** Trimmed, blanks dropped, first spelling of a repeat kept. */
export function dedupe(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}
