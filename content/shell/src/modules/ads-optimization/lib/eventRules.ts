import { FuelySettingSendEventsToMetaStandardEventName } from '~api/generated/ads-optimization/graphql';
import type { ConversionEvent } from '../types';
import { dedupe, isValueless, type EventDraft } from './eventDraft';
import { triggerById, triggerOf } from './eventKinds';

/**
 * The limits the API enforces, checked here first.
 *
 * Not to be clever: the server's answer arrives after the dialog has closed
 * over work somebody just typed, and "at most 20" is worth knowing at the
 * twentieth row rather than at the twenty-first save. Every code below is the
 * one the server would answer with, so one message table serves both paths;
 * the `Ads…` codes are the few the server has no opinion on because it never
 * sees an incomplete event.
 */

export const MAX_SETS = 30;
export const MAX_SET_NAME = 200;
export const MAX_EVENTS = 20;
export const MAX_ADS = 50;
export const MAX_AD_ID_LENGTH = 60;
export const MAX_CUSTOM_NAME = 50;
export const MAX_PROMPT = 512;
export const MAX_KEYWORDS = 50;
export const MAX_KEYWORD_LENGTH = 50;

export type DraftField = 'name' | 'trigger' | 'keywords' | 'stages' | 'sources' | 'prompt' | 'attribute';

export interface DraftIssue {
  field: DraftField;
  code: string;
  message: string;
}

const STANDARD_NAMES = new Set(
  Object.values(FuelySettingSendEventsToMetaStandardEventName).map((name) => name.toLowerCase()),
);

/** The conversion an event reports, as a string two events can be compared on. */
export function nameKey(event: ConversionEvent): string {
  return event.eventName.__typename === 'FuelySettingSendEventsToMetaStandardName'
    ? `standard:${event.eventName.standardName}`
    : `custom:${event.eventName.customName}`;
}

function draftNameKey(draft: EventDraft): string | null {
  if (!draft.name) return null;
  return draft.name.kind === 'standard' ? `standard:${draft.name.value}` : `custom:${draft.name.value.trim()}`;
}

export interface DraftContext {
  /** Every event already in the set, the one being edited included. */
  siblings: readonly ConversionEvent[];
}

export function validateDraft(draft: EventDraft, context: DraftContext): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const trigger = draft.trigger ? triggerById(draft.trigger) : null;

  if (!draft.name) {
    issues.push({ field: 'name', code: 'AdsConversionRequired', message: 'Pick the conversion this reports.' });
  } else if (draft.name.kind === 'custom') {
    const value = draft.name.value.trim();
    if (!value) {
      issues.push({ field: 'name', code: 'AdsConversionRequired', message: 'Pick the conversion this reports.' });
    } else if (value.length > MAX_CUSTOM_NAME) {
      issues.push({
        field: 'name',
        code: 'FuelySendEventsToMetaCustomEventNameTooLong',
        message: `A name of your own is at most ${MAX_CUSTOM_NAME} characters.`,
      });
    } else if (STANDARD_NAMES.has(value.toLowerCase())) {
      issues.push({
        field: 'name',
        code: 'FuelySendEventsToMetaCustomEventNameIsStandard',
        message: `${value} is one of Meta's own names — pick it from the list instead.`,
      });
    }
  }

  if (!trigger) {
    issues.push({ field: 'trigger', code: 'AdsTriggerRequired', message: 'Pick what fires it.' });
    return issues;
  }

  switch (trigger.id) {
    case 'keywords': {
      const keywords = dedupe(draft.keywords);
      if (keywords.length === 0) {
        issues.push({
          field: 'keywords',
          code: 'FuelySendEventsToMetaKeywordsEmpty',
          message: 'Add at least one keyword.',
        });
      } else if (keywords.length > MAX_KEYWORDS) {
        issues.push({ field: 'keywords', code: 'FuelyKeywordsTooMany', message: `At most ${MAX_KEYWORDS} keywords.` });
      } else if (keywords.some((word) => word.length > MAX_KEYWORD_LENGTH)) {
        issues.push({
          field: 'keywords',
          code: 'FuelyKeywordTooLong',
          message: `A keyword is at most ${MAX_KEYWORD_LENGTH} characters.`,
        });
      }
      break;
    }
    case 'status':
      if (draft.salesStages.length === 0) {
        issues.push({
          field: 'stages',
          code: 'FuelySendEventsToMetaSalesStagesEmpty',
          message: 'Pick at least one status.',
        });
      }
      break;
    case 'handoff':
      if (draft.switchToHumanFrom.length === 0) {
        issues.push({
          field: 'sources',
          code: 'FuelySendEventsToMetaSwitchToHumanFromEmpty',
          message: 'Pick at least one hand-off.',
        });
      }
      break;
    case 'prompt': {
      const prompt = draft.conditionPrompt.trim();
      if (!prompt) {
        issues.push({
          field: 'prompt',
          code: 'FuelySendEventsToMetaConditionPromptEmpty',
          message: 'Describe the condition.',
        });
      } else if (prompt.length > MAX_PROMPT) {
        issues.push({
          field: 'prompt',
          code: 'FuelySendEventsToMetaConditionPromptTooLong',
          message: `A condition is at most ${MAX_PROMPT} characters.`,
        });
      }
      break;
    }
    case 'property': {
      const { name, operator, value } = draft.attribute;
      if (!name.trim()) {
        issues.push({
          field: 'attribute',
          code: 'attr_filter_attr_name_required',
          message: 'Pick a contact property.',
        });
      } else if (!isValueless(operator) && !value.trim()) {
        issues.push({
          field: 'attribute',
          code: 'attr_filter_comparable_values_required',
          message: 'Fill in the value to compare against.',
        });
      }
      break;
    }
    default:
      break;
  }

  /* The server refuses two events that report the same conversion on the same
     trigger, and it refuses the whole list — so the twentieth event can undo
     nineteen good ones. Caught here instead. */
  const key = draftNameKey(draft);
  if (key) {
    const clash = context.siblings.some(
      (event) => event.id !== draft.id && triggerOf(event)?.id === trigger.id && nameKey(event) === key,
    );
    if (clash) {
      issues.push({
        field: 'name',
        code: 'FuelySendEventsToMetaDuplicateEvent',
        message: 'This set already reports that conversion on that trigger.',
      });
    }
  }

  return issues;
}

export const issueOf = (issues: readonly DraftIssue[], field: DraftField): DraftIssue | null =>
  issues.find((issue) => issue.field === field) ?? null;
