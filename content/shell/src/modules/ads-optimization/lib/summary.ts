import {
  FuelySettingSendEventsToMetaKeywordsRule,
  FuelySettingSendEventsToMetaSalesStage,
  FuelySettingSendEventsToMetaStandardEventName as Standard,
  FuelySettingSendEventsToMetaSwitchToHumanFrom,
} from '~api/generated/ads-optimization/graphql';
import type { ConversionEvent, ConversionName, EventSetView } from '../types';
import { triggerOf } from './eventKinds';

/** The name shown for the base set, which the API leaves unnamed. */
export const BASE_SET_NAME = 'Default events for all ads';

export const setName = (set: EventSetView): string => (set.isBase ? BASE_SET_NAME : set.name?.trim() || 'Untitled set');

/* Meta's own names, spelled the way a person writes them. Unknown values read
   as themselves rather than crashing — the list grows on Meta's schedule. */
const STANDARD_LABELS: Record<Standard, string> = {
  [Standard.Purchase]: 'Purchase',
  [Standard.LeadSubmitted]: 'Lead submitted',
  [Standard.InitiateCheckout]: 'Checkout started',
  [Standard.AddToCart]: 'Added to cart',
  [Standard.ViewContent]: 'Content viewed',
  [Standard.OrderCreated]: 'Order created',
  [Standard.OrderShipped]: 'Order shipped',
  [Standard.OrderDelivered]: 'Order delivered',
  [Standard.OrderCanceled]: 'Order canceled',
  [Standard.OrderReturned]: 'Order returned',
  [Standard.CartAbandoned]: 'Cart abandoned',
  [Standard.QualifiedLead]: 'Qualified lead',
  [Standard.RatingProvided]: 'Rating given',
  [Standard.ReviewProvided]: 'Review given',
};

export const standardLabel = (name: Standard | string): string => STANDARD_LABELS[name as Standard] ?? String(name);

export const conversionLabel = (name: ConversionName): string =>
  name.__typename === 'FuelySettingSendEventsToMetaStandardName' ? standardLabel(name.standardName) : name.customName;

/** True when Meta itself knows the name — the row says so beside it. */
export const isStandard = (name: ConversionName): boolean =>
  name.__typename === 'FuelySettingSendEventsToMetaStandardName';

/* The same words the rest of the app uses for a contact's sales stage. */
const STAGE_LABELS: Record<FuelySettingSendEventsToMetaSalesStage, string> = {
  [FuelySettingSendEventsToMetaSalesStage.Sorting]: 'Sorting',
  [FuelySettingSendEventsToMetaSalesStage.Ready]: 'Ready',
  [FuelySettingSendEventsToMetaSalesStage.WorkingOn]: 'Working on',
  [FuelySettingSendEventsToMetaSalesStage.Won]: 'Won',
  [FuelySettingSendEventsToMetaSalesStage.Lost]: 'Lost',
};

export const stageLabel = (stage: FuelySettingSendEventsToMetaSalesStage | string): string =>
  STAGE_LABELS[stage as FuelySettingSendEventsToMetaSalesStage] ?? String(stage);

const HANDOFF_LABELS: Record<FuelySettingSendEventsToMetaSwitchToHumanFrom, string> = {
  [FuelySettingSendEventsToMetaSwitchToHumanFrom.FuelyAi]: 'The AI hands it over',
  [FuelySettingSendEventsToMetaSwitchToHumanFrom.UserAccount]: 'A teammate takes it',
};

export const handoffLabel = (source: FuelySettingSendEventsToMetaSwitchToHumanFrom | string): string =>
  HANDOFF_LABELS[source as FuelySettingSendEventsToMetaSwitchToHumanFrom] ?? String(source);

/**
 * The Details cell: the part of the event the trigger alone does not say.
 * Empty for the two kinds that carry nothing — the cell stays blank rather
 * than repeating the trigger.
 */
export function describeEvent(event: ConversionEvent): string {
  switch (event.__typename) {
    case 'FuelySettingSendEventsToMetaOnContactMessageKeywordEvent': {
      const rule = event.keywordsRule === FuelySettingSendEventsToMetaKeywordsRule.ExactMatch ? 'Exactly' : 'Contains';
      return `${rule}: ${event.keywords.join(', ')}`;
    }
    case 'FuelySettingSendEventsToMetaOnSalesStageEvent':
      return event.salesStages.map(stageLabel).join(', ');
    case 'FuelySettingSendEventsToMetaOnSwitchToHumanEvent':
      return event.switchToHumanFrom.map(handoffLabel).join(', ');
    case 'FuelySettingSendEventsToMetaOnCustomPromptEvent':
      return event.conditionPrompt;
    case 'FuelySettingSendEventsToMetaOnContactAttributeEvent': {
      const condition = event.attributeConditions[0]?.attributeCondition;
      if (!condition) return '';
      const operator = condition.defaultStrategy?.operator ?? condition.dateStrategy?.operator ?? '';
      const value =
        condition.defaultStrategy?.comparableValues.join(', ') ?? condition.dateStrategy?.comparableDate ?? '';
      return [condition.attribute.name, operatorLabel(String(operator)), value].filter(Boolean).join(' ');
    }
    default:
      return '';
  }
}

/* Operators read as words in a sentence, not as the enum. */
const OPERATOR_LABELS: Record<string, string> = {
  IS: 'is',
  IS_NOT: 'is not',
  STARTS_WITH: 'starts with',
  CONTAINS: 'contains',
  LT: 'is less than',
  GT: 'is greater than',
  IS_EMPTY: 'is empty',
  IS_NOT_EMPTY: 'is not empty',
};

export const operatorLabel = (operator: string): string => OPERATOR_LABELS[operator] ?? operator;

/** Errors the server stored on an attribute condition rather than refusing it. */
export function conditionErrors(event: ConversionEvent): string[] {
  if (event.__typename !== 'FuelySettingSendEventsToMetaOnContactAttributeEvent') return [];
  return event.attributeConditions.flatMap((condition) => condition.attributeConditionErrors.map(String));
}

export interface SetSummary {
  events: number;
  ads: number | null;
  /** Where the events come from, when they are not the set's own. */
  inheritsEventsFrom: string | null;
  /** The conversions this set reports, deduplicated, in order. */
  conversions: string[];
  /** Ads are claimed but nothing is reported for them. */
  silent: boolean;
}

export function summarize(set: EventSetView): SetSummary {
  const events = set.events?.value ?? [];
  const ads = set.ads ? set.ads.value.length : null;
  const conversions: string[] = [];
  for (const event of events) {
    const label = conversionLabel(event.eventName);
    if (!conversions.includes(label)) conversions.push(label);
  }
  return {
    events: events.length,
    ads,
    inheritsEventsFrom: set.events?.inheritsFrom?.id ?? null,
    conversions,
    silent: events.length === 0 && (ads ?? 0) > 0,
  };
}

/** The one line under a set's name in the rail. */
export function railLine(set: EventSetView): string {
  const summary = summarize(set);
  const parts: string[] = [];
  if (summary.ads !== null) parts.push(`${summary.ads} ${summary.ads === 1 ? 'ad' : 'ads'}`);
  parts.push(`${summary.events} ${summary.events === 1 ? 'event' : 'events'}`);
  return parts.join(' · ');
}

/** The trigger's own name, for a row that has to say it in one cell. */
export const triggerLabel = (event: ConversionEvent): string => triggerOf(event)?.label ?? 'Unknown trigger';
