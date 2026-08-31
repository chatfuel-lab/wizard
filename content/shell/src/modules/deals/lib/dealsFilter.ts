/**
 * The one filter model every view reads, and the pure helpers over it.
 *
 * It is deliberately larger than any single view can honour. The board can
 * only express `assignee`; the table can express everything, but has to route
 * between two mutually exclusive engines to do it (see `lib/queryPlan.ts`).
 * Keeping one model means a filter set in one view is still meaningful in the
 * next, and it is what saved views serialize.
 *
 * Frozen shape: the SDL leaves nothing to discover here.
 * `AttrFilterDefaultOperator` has exactly eight members and
 * `ContactSearchOrderByInput` is `{ orderBy, direction }`.
 */
import {
  AttrFilterDefaultOperator,
  ContactAssigneeFilterType,
  Sort,
  type ContactAssigneeFilter,
  type SalesStageV2,
} from '~api/generated/deals/graphql';

/**
 * Assignee is the one filter every engine can express, so it is a key rather
 * than a free-form predicate. `u:<UserAccountID>` is a real person — the API
 * takes `ContactAssigneeFilterType.AssigneeId` with an `assigneeID`, and the
 * member list is already fetched for the owner picker.
 */
export type AssigneeFilterKey = 'Any' | 'Unassigned' | 'FuelyAI' | `u:${string}`;

/** The three that exist on every bot; real people are appended by the caller. */
export const ASSIGNEE_PRESETS = ['Any', 'Unassigned', 'FuelyAI'] as const;

export const ASSIGNEE_PRESET_LABELS: Record<(typeof ASSIGNEE_PRESETS)[number], string> = {
  Any: 'All deals',
  Unassigned: 'Unassigned',
  FuelyAI: 'Assigned to AI',
};

export const userAssigneeKey = (userAccountId: string): AssigneeFilterKey => `u:${userAccountId}`;

/** The UserAccountID a `u:` key carries, or null for the presets. */
export function assigneeUserId(key: AssigneeFilterKey): string | null {
  return key.startsWith('u:') ? key.slice(2) : null;
}

/** The key as the API's own filter input. */
export function toAssigneeFilter(key: AssigneeFilterKey): ContactAssigneeFilter {
  const userId = assigneeUserId(key);
  if (userId) return { type: ContactAssigneeFilterType.AssigneeId, assigneeID: userId };
  if (key === 'Unassigned') return { type: ContactAssigneeFilterType.Unassigned };
  if (key === 'FuelyAI') return { type: ContactAssigneeFilterType.FuelyAi };
  return { type: ContactAssigneeFilterType.Any };
}

/**
 * One attribute predicate. `values` is empty for IS_EMPTY / IS_NOT_EMPTY —
 * the SDL's comparableValues is a list, and those two operators ignore it.
 *
 * Range operators are approximate by design: the default strategy ORs the
 * string / int / float / date interpretations of a value and counts the
 * condition satisfied if ANY of them holds.
 */
export interface AttrPredicate {
  id: string;
  name: string;
  operator: AttrFilterDefaultOperator;
  values: string[];
}

export interface DealsSort {
  attribute: string;
  direction: Sort;
}

export interface DealsFilter {
  assignee: AssigneeFilterKey;
  /** Server-side over contact name + phone — engine B only. */
  q: string;
  /** Empty means all six. */
  stages: SalesStageV2[];
  unreadOnly: boolean;
  /** Non-empty forces engine C, which loses deal isolation and live updates. */
  predicates: AttrPredicate[];
  /** Non-null forces engine C; custom attributes sort as text. */
  sort: DealsSort | null;
}

export const EMPTY_FILTER: DealsFilter = {
  assignee: 'Any',
  q: '',
  stages: [],
  unreadOnly: false,
  predicates: [],
  sort: null,
};

/** Operators that take no operand — the editor hides the value input for these. */
export const NULLARY_OPERATORS: readonly AttrFilterDefaultOperator[] = [
  AttrFilterDefaultOperator.IsEmpty,
  AttrFilterDefaultOperator.IsNotEmpty,
];

export function isNullary(operator: AttrFilterDefaultOperator): boolean {
  return NULLARY_OPERATORS.includes(operator);
}

/** True when nothing narrows the set — used to decide whether to show a "clear" affordance. */
export function isFilterEmpty(filter: DealsFilter): boolean {
  return (
    filter.assignee === 'Any' &&
    filter.q.trim() === '' &&
    filter.stages.length === 0 &&
    !filter.unreadOnly &&
    filter.predicates.length === 0 &&
    filter.sort === null
  );
}

/** How many distinct things the user has narrowed by — the badge on the filter button. */
export function activeFilterCount(filter: DealsFilter): number {
  let count = 0;
  if (filter.assignee !== 'Any') count += 1;
  if (filter.q.trim() !== '') count += 1;
  if (filter.stages.length > 0) count += 1;
  if (filter.unreadOnly) count += 1;
  count += filter.predicates.length;
  return count;
}

/** A predicate with no name, or a nullary-less operator with no values, cannot be sent. */
export function isPredicateComplete(predicate: AttrPredicate): boolean {
  if (predicate.name.trim() === '') return false;
  if (isNullary(predicate.operator)) return true;
  return predicate.values.some((value) => value.trim() !== '');
}

/**
 * Only complete predicates reach a query. An in-progress row in the editor
 * must not silently narrow the result set the user is looking at.
 */
export function usablePredicates(filter: DealsFilter): AttrPredicate[] {
  return filter.predicates.filter(isPredicateComplete);
}

/** Engine C is required when the filter asks for something engine B cannot express. */
export function needsAttributeEngine(filter: DealsFilter): boolean {
  return usablePredicates(filter).length > 0 || filter.sort !== null;
}
